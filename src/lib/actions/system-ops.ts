'use server'

import { access, unlink } from 'node:fs/promises'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { writeAudit } from '@/lib/admin-utils'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import {
  backupFilePath,
  checkForUpdates,
  getLocalGitInfo,
  getOpsCapabilities,
  getOpsSettings,
  isSafeBranch,
  opsHealthUrl,
  pruneBackups,
  startOpsJob,
  syncOperation,
  type BackupKindName,
  type OperationView,
} from '@/lib/system/ops'

export type OpsActionResult =
  | { ok: true; operationId: string }
  | { ok: false; error: string }

export type SyncResult = { ok: true; operation: OperationView } | { ok: false; error: string }

async function openOperations() {
  return prisma.systemOperation.count({
    where: { status: { in: ['PENDING', 'RUNNING'] } },
  })
}

async function beginOperation(input: {
  type: 'BACKUP' | 'RESTORE' | 'UPDATE' | 'ROLLBACK'
  backupId?: string
  safetyBackupId?: string
  updateId?: string
  actorEmail: string
}) {
  return prisma.systemOperation.create({
    data: {
      type: input.type,
      status: 'PENDING',
      backupId: input.backupId ?? null,
      safetyBackupId: input.safetyBackupId ?? null,
      updateId: input.updateId ?? null,
      actorEmail: input.actorEmail,
    },
    select: { id: true },
  })
}

async function startJobOrFail(operationId: string, job: Parameters<typeof startOpsJob>[0]) {
  try {
    await startOpsJob(job)
  } catch (error) {
    await prisma.systemOperation.update({
      where: { id: operationId },
      data: {
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Could not start the operations runner.',
        finishedAt: new Date(),
      },
    })
    return false
  }
  return true
}

export async function createSystemBackup(kind: BackupKindName): Promise<OpsActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (kind !== 'DATABASE' && kind !== 'FILES' && kind !== 'FULL') {
    return { ok: false, error: t('invalidRequest') }
  }
  const capabilities = await getOpsCapabilities()
  if (!capabilities.backupsAvailable) {
    return { ok: false, error: t('opsUnavailable') }
  }
  if ((await openOperations()) > 0) {
    return { ok: false, error: t('operationRunning') }
  }

  const backup = await prisma.systemBackup.create({
    data: {
      kind,
      status: 'PENDING',
      createdById: session.user.id,
      createdByName: session.user.name,
      createdByEmail: session.user.email,
      appCommit: capabilities.commit,
    },
    select: { id: true },
  })
  const operation = await beginOperation({
    type: 'BACKUP',
    backupId: backup.id,
    actorEmail: session.user.email,
  })

  const started = await startJobOrFail(operation.id, {
    id: operation.id,
    type: 'BACKUP',
    appDir: capabilities.appDir,
    backupId: backup.id,
    kind,
  })
  if (!started) return { ok: false, error: t('operationFailedToStart') }

  await writeAudit({
    action: 'backup.create',
    targetType: 'backup',
    targetId: backup.id,
    details: JSON.stringify({ kind }),
  })
  revalidatePath('/admin/backups')
  return { ok: true, operationId: operation.id }
}

export async function restoreSystemBackup(
  backupId: string,
  confirmation: string,
): Promise<OpsActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (confirmation !== 'RESTORE') return { ok: false, error: t('confirmationMismatch') }

  const capabilities = await getOpsCapabilities()
  if (!capabilities.backupsAvailable) {
    return { ok: false, error: t('opsUnavailable') }
  }
  if ((await openOperations()) > 0) {
    return { ok: false, error: t('operationRunning') }
  }

  const backup = await prisma.systemBackup.findUnique({
    where: { id: backupId },
    select: { id: true, kind: true, status: true, filename: true },
  })
  if (!backup) return { ok: false, error: t('backupNotFound') }
  if (backup.status !== 'READY' || !backup.filename) {
    return { ok: false, error: t('backupNotReady') }
  }

  const file = backupFilePath(backup.filename)
  if (!file) return { ok: false, error: t('backupNotFound') }
  const exists = await access(file)
    .then(() => true)
    .catch(() => false)
  if (!exists) return { ok: false, error: t('backupFileMissing') }

  const safety = await prisma.systemBackup.create({
    data: {
      kind: 'FULL',
      status: 'PENDING',
      createdById: session.user.id,
      createdByName: session.user.name,
      createdByEmail: session.user.email,
      appCommit: capabilities.commit,
    },
    select: { id: true },
  })
  const operation = await beginOperation({
    type: 'RESTORE',
    backupId: backup.id,
    safetyBackupId: safety.id,
    actorEmail: session.user.email,
  })

  const started = await startJobOrFail(operation.id, {
    id: operation.id,
    type: 'RESTORE',
    appDir: capabilities.appDir,
    backupId: backup.id,
    safetyBackupId: safety.id,
    backup: { filename: backup.filename, kind: backup.kind },
  })
  if (!started) return { ok: false, error: t('operationFailedToStart') }

  await writeAudit({
    action: 'backup.restore',
    targetType: 'backup',
    targetId: backup.id,
    details: JSON.stringify({ kind: backup.kind }),
  })
  revalidatePath('/admin/backups')
  return { ok: true, operationId: operation.id }
}

export async function deleteSystemBackup(backupId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const reference = await prisma.systemOperation.count({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      OR: [{ backupId }, { safetyBackupId: backupId }],
    },
  })
  if (reference > 0) return { ok: false, error: t('operationRunning') }

  const backup = await prisma.systemBackup.findUnique({
    where: { id: backupId },
    select: { id: true, filename: true, status: true },
  })
  if (!backup) return { ok: false, error: t('backupNotFound') }
  if (backup.status === 'RUNNING' || backup.status === 'PENDING') {
    return { ok: false, error: t('operationRunning') }
  }

  if (backup.filename) {
    const file = backupFilePath(backup.filename)
    if (file) await unlink(file).catch(() => undefined)
  }
  await prisma.systemBackup.delete({ where: { id: backup.id } })
  await writeAudit({
    action: 'backup.delete',
    targetType: 'backup',
    targetId: backup.id,
  })
  revalidatePath('/admin/backups')
  return { ok: true }
}

export async function installSystemUpdate(
  toCommit: string,
  confirmation: string,
): Promise<OpsActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (confirmation !== 'UPDATE') return { ok: false, error: t('confirmationMismatch') }
  if (!/^[0-9a-f]{40}$/.test(toCommit)) return { ok: false, error: t('invalidRequest') }

  const capabilities = await getOpsCapabilities()
  if (!capabilities.updatesAvailable) {
    return { ok: false, error: t('opsUnavailable') }
  }
  if ((await openOperations()) > 0) {
    return { ok: false, error: t('operationRunning') }
  }

  const git = await getLocalGitInfo()
  if (!git) return { ok: false, error: t('opsUnavailable') }
  if (git.dirty) return { ok: false, error: t('updateDirty') }

  const check = await checkForUpdates()
  if (!check.ok) return { ok: false, error: t('updateCheckFailed') }
  if (check.remote !== toCommit) return { ok: false, error: t('updateTargetChanged') }
  if (check.behind === 0) return { ok: false, error: t('updateNotAvailable') }

  const settings = await getOpsSettings()
  if (!isSafeBranch(settings.branch)) return { ok: false, error: t('updateCheckFailed') }

  const changelog = check.commits
    .map((commit) => `${commit.short} ${commit.subject}`)
    .join('\n')
    .slice(0, 8000)

  const safety = await prisma.systemBackup.create({
    data: {
      kind: 'FULL',
      status: 'PENDING',
      createdById: session.user.id,
      createdByName: session.user.name,
      createdByEmail: session.user.email,
      appCommit: git.commit,
    },
    select: { id: true },
  })
  const update = await prisma.systemUpdate.create({
    data: {
      fromCommit: git.commit,
      toCommit,
      status: 'INSTALLING',
      changelog,
      backupId: safety.id,
      actorEmail: session.user.email,
    },
    select: { id: true },
  })
  const operation = await beginOperation({
    type: 'UPDATE',
    updateId: update.id,
    safetyBackupId: safety.id,
    actorEmail: session.user.email,
  })

  const started = await startJobOrFail(operation.id, {
    id: operation.id,
    type: 'UPDATE',
    appDir: capabilities.appDir,
    safetyBackupId: safety.id,
    toCommit,
    branch: settings.branch,
    processManager: settings.processManager,
    processName: settings.processName,
    healthUrl: opsHealthUrl(),
  })
  if (!started) return { ok: false, error: t('operationFailedToStart') }

  await writeAudit({
    action: 'system.update',
    targetType: 'update',
    targetId: update.id,
    details: JSON.stringify({ from: git.shortCommit, to: toCommit.slice(0, 7) }),
  })
  revalidatePath('/admin/updates')
  revalidatePath('/admin/backups')
  return { ok: true, operationId: operation.id }
}

export async function rollbackSystemUpdate(
  updateId: string,
  confirmation: string,
): Promise<OpsActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (confirmation !== 'ROLLBACK') return { ok: false, error: t('confirmationMismatch') }

  const capabilities = await getOpsCapabilities()
  if (!capabilities.updatesAvailable) {
    return { ok: false, error: t('opsUnavailable') }
  }
  if ((await openOperations()) > 0) {
    return { ok: false, error: t('operationRunning') }
  }

  const update = await prisma.systemUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, status: true, fromCommit: true },
  })
  if (!update) return { ok: false, error: t('updateNotFound') }
  if (update.status !== 'INSTALLED') return { ok: false, error: t('rollbackUnavailable') }
  if (!/^[0-9a-f]{40}$/.test(update.fromCommit)) {
    return { ok: false, error: t('rollbackUnavailable') }
  }

  const git = await getLocalGitInfo()
  if (!git) return { ok: false, error: t('opsUnavailable') }
  if (git.dirty) return { ok: false, error: t('updateDirty') }

  const settings = await getOpsSettings()
  const safety = await prisma.systemBackup.create({
    data: {
      kind: 'FULL',
      status: 'PENDING',
      createdById: session.user.id,
      createdByName: session.user.name,
      createdByEmail: session.user.email,
      appCommit: git.commit,
    },
    select: { id: true },
  })
  const rollback = await prisma.systemUpdate.create({
    data: {
      isRollback: true,
      fromCommit: git.commit,
      toCommit: update.fromCommit,
      status: 'INSTALLING',
      backupId: safety.id,
      actorEmail: session.user.email,
    },
    select: { id: true },
  })
  const operation = await beginOperation({
    type: 'ROLLBACK',
    updateId: rollback.id,
    safetyBackupId: safety.id,
    actorEmail: session.user.email,
  })

  const started = await startJobOrFail(operation.id, {
    id: operation.id,
    type: 'ROLLBACK',
    appDir: capabilities.appDir,
    safetyBackupId: safety.id,
    toCommit: update.fromCommit,
    processManager: settings.processManager,
    processName: settings.processName,
    healthUrl: opsHealthUrl(),
  })
  if (!started) return { ok: false, error: t('operationFailedToStart') }

  await writeAudit({
    action: 'system.rollback',
    targetType: 'update',
    targetId: rollback.id,
    details: JSON.stringify({ to: update.fromCommit.slice(0, 7) }),
  })
  revalidatePath('/admin/updates')
  return { ok: true, operationId: operation.id }
}

export async function syncSystemOperation(id: string): Promise<SyncResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const operation = await syncOperation(id)
  if (!operation) return { ok: false, error: t('operationNotFound') }

  if (operation.status !== 'PENDING' && operation.status !== 'RUNNING') {
    const settings = await getOpsSettings()
    await pruneBackups(settings.retention)
    revalidatePath('/admin/backups')
    revalidatePath('/admin/updates')
  }
  return { ok: true, operation }
}

export async function checkSystemUpdates() {
  await requireAdmin()
  return checkForUpdates()
}
