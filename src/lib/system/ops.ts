import 'server-only'

import { spawn } from 'node:child_process'
import { access, mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '@/lib/prisma'

const ID_RE = /^[a-z0-9]{20,40}$/i
const BRANCH_RE = /^[A-Za-z0-9._/-]{1,100}$/
const PROCESS_NAME_RE = /^[A-Za-z0-9._@-]{1,100}$/

// A detached runner writes its status file around every step, so a file that
// has not moved for this long means the runner is gone, not busy.
export const STALE_RUNNER_MS = 10 * 60 * 1000
const RUNNER_STOPPED = 'The operations runner stopped without reporting a result.'

export const APP_DIR = process.cwd()
export const BACKUP_DIR = path.resolve(APP_DIR, process.env.BACKUP_DIR ?? '.backups')

export type OpsUnavailableReason =
  | 'managed-host'
  | 'disabled'
  | 'not-a-checkout'
  | 'missing-tools'
  | 'invalid-backup-dir'

export type OpsCapabilities = {
  available: boolean
  reason: OpsUnavailableReason | null
  appDir: string
  backupDir: string
  isGitRepo: boolean
  commit: string | null
  branch: string | null
  backupsAvailable: boolean
  updatesAvailable: boolean
  tools: { git: boolean; mysqldump: boolean; mysql: boolean; tar: boolean; npm: boolean }
}

type RunOptions = { timeout?: number; maxBuffer?: number }

function command(cmd: string, args: string[], options: RunOptions = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: APP_DIR, windowsHide: true })
    const max = options.maxBuffer ?? 2_000_000
    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = options.timeout
      ? setTimeout(() => {
          child.kill()
          finish(new Error(`${cmd} timed out`))
        }, options.timeout)
      : null

    function finish(error?: Error) {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      if (error) reject(error)
      else resolve({ stdout, stderr })
    }

    child.stdout?.on('data', (chunk) => {
      if (stdout.length < max) stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < max) stderr += chunk
    })
    child.on('error', finish)
    child.on('close', (code) => {
      if (code === 0) return finish()
      finish(new Error(`${cmd} exited ${code}${stderr ? `: ${stderr.trim().slice(-600)}` : ''}`))
    })
  })
}

async function toolExists(cmd: string) {
  // Node refuses to spawn .cmd files without a shell on Windows, so the npm
  // shim is probed through cmd.exe instead.
  const [file, args] =
    process.platform === 'win32' && cmd.endsWith('.cmd')
      ? [process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `${cmd} --version`]]
      : [cmd, ['--version']]
  return command(file, args, { timeout: 5000 })
    .then(() => true)
    .catch(() => false)
}

let capabilitiesPromise: Promise<OpsCapabilities> | null = null

async function detectCapabilities(): Promise<OpsCapabilities> {
  const emptyTools = { git: false, mysqldump: false, mysql: false, tar: false, npm: false }
  const base = {
    appDir: APP_DIR,
    backupDir: BACKUP_DIR,
    isGitRepo: false,
    commit: null,
    branch: null,
    tools: emptyTools,
  }

  if (process.env.VERCEL) {
    return {
      ...base,
      available: false,
      reason: 'managed-host',
      backupsAvailable: false,
      updatesAvailable: false,
    }
  }
  if (process.env.SYSTEM_OPS_DISABLED === 'true') {
    return {
      ...base,
      available: false,
      reason: 'disabled',
      backupsAvailable: false,
      updatesAvailable: false,
    }
  }

  const publicDir = path.join(APP_DIR, 'public')
  const relative = path.relative(publicDir, BACKUP_DIR)
  const insidePublic = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  const insideBuild = BACKUP_DIR.startsWith(path.join(APP_DIR, '.next'))
  if (insidePublic || insideBuild || BACKUP_DIR === APP_DIR) {
    return {
      ...base,
      available: false,
      reason: 'invalid-backup-dir',
      backupsAvailable: false,
      updatesAvailable: false,
    }
  }

  const writable = await mkdir(BACKUP_DIR, { recursive: true })
    .then(async () => {
      const probe = path.join(BACKUP_DIR, '.write-test')
      await writeFile(probe, 'ok')
      await rm(probe, { force: true })
      return true
    })
    .catch(() => false)

  const [git, mysqldump, mysql, tar, npm, gitRepo] = await Promise.all([
    toolExists('git'),
    toolExists('mysqldump'),
    toolExists('mysql'),
    toolExists('tar'),
    toolExists(process.platform === 'win32' ? 'npm.cmd' : 'npm'),
    access(path.join(APP_DIR, '.git'))
      .then(() => true)
      .catch(() => false),
  ])

  const tools = { git, mysqldump, mysql, tar, npm }
  let commit: string | null = null
  let branch: string | null = null
  if (git && gitRepo) {
    commit = await command('git', ['rev-parse', 'HEAD'], { timeout: 5000 })
      .then((result) => result.stdout.trim() || null)
      .catch(() => null)
    branch = await command('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000 })
      .then((result) => result.stdout.trim() || null)
      .catch(() => null)
  }

  const available = writable
  return {
    ...base,
    isGitRepo: gitRepo,
    commit,
    branch,
    tools,
    available,
    reason: available ? null : 'invalid-backup-dir',
    backupsAvailable: available && tar && mysqldump && mysql,
    updatesAvailable: available && gitRepo && git && npm,
  }
}

/** Cached for the life of the process; infrastructure does not change per request. */
export function getOpsCapabilities() {
  capabilitiesPromise ??= detectCapabilities()
  return capabilitiesPromise
}

export type OpsSettings = {
  branch: string
  retention: number
  processManager: 'pm2' | 'systemctl' | 'none'
  processName: string
}

export async function getOpsSettings(): Promise<OpsSettings> {
  const keys = ['ops.gitBranch', 'ops.backupRetention', 'ops.processManager', 'ops.processName']
  const rows = await prisma.setting
    .findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
    .catch(() => [])
  const values = new Map(rows.map((row) => [row.key, row.value]))

  const branchValue = (values.get('ops.gitBranch') ?? '').trim()
  const branch =
    BRANCH_RE.test(branchValue) && !branchValue.includes('..') && !branchValue.startsWith('-')
      ? branchValue
      : 'master'

  const retentionValue = Number.parseInt(values.get('ops.backupRetention') ?? '', 10)
  const retention =
    Number.isInteger(retentionValue) && retentionValue >= 1 && retentionValue <= 100
      ? retentionValue
      : 10

  const manager = values.get('ops.processManager') ?? 'none'
  const processManager =
    manager === 'pm2' || manager === 'systemctl' ? manager : ('none' as const)

  const name = (values.get('ops.processName') ?? '').trim()
  const processName = PROCESS_NAME_RE.test(name) ? name : 'social-links'

  return { branch, retention, processManager, processName }
}

export function isSafeBranch(value: string) {
  return BRANCH_RE.test(value) && !value.includes('..') && !value.startsWith('-')
}

export type LocalGitInfo = {
  commit: string
  shortCommit: string
  branch: string
  remoteUrl: string | null
  dirty: boolean
}

function redactRemote(url: string) {
  return url.replace(/\/\/[^/@]+@/, '//***@')
}

export async function getLocalGitInfo(): Promise<LocalGitInfo | null> {
  const capabilities = await getOpsCapabilities()
  if (!capabilities.isGitRepo || !capabilities.tools.git) return null
  try {
    const [head, branch, remote, status] = await Promise.all([
      command('git', ['rev-parse', 'HEAD'], { timeout: 5000 }),
      command('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 5000 }),
      command('git', ['config', '--get', 'remote.origin.url'], { timeout: 5000 }).catch(
        () => ({ stdout: '', stderr: '' }),
      ),
      command('git', ['status', '--porcelain'], { timeout: 10_000 }),
    ])
    const commit = head.stdout.trim()
    if (!commit) return null
    return {
      commit,
      shortCommit: commit.slice(0, 7),
      branch: branch.stdout.trim(),
      remoteUrl: remote.stdout.trim() ? redactRemote(remote.stdout.trim()) : null,
      dirty: status.stdout.trim().length > 0,
    }
  } catch {
    return null
  }
}

export type UpdateCommit = {
  sha: string
  short: string
  subject: string
  author: string
  date: string
}

export type UpdateCheckResult =
  | {
      ok: true
      branch: string
      current: string
      shortCurrent: string
      remote: string
      shortRemote: string
      behind: number
      ahead: number
      dirty: boolean
      commits: UpdateCommit[]
      remoteUrl: string | null
      checkedAt: string
    }
  | { ok: false; code: 'unavailable' | 'fetch-failed' | 'no-remote'; detail: string }

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const capabilities = await getOpsCapabilities()
  if (!capabilities.updatesAvailable) {
    return { ok: false, code: 'unavailable', detail: 'System operations are not available on this host.' }
  }
  const settings = await getOpsSettings()
  if (!isSafeBranch(settings.branch)) {
    return { ok: false, code: 'fetch-failed', detail: 'The configured branch name is not valid.' }
  }

  const remoteUrl = await command('git', ['config', '--get', 'remote.origin.url'], { timeout: 5000 })
    .then((result) => redactRemote(result.stdout.trim()))
    .catch(() => '')

  try {
    await command('git', ['fetch', '--prune', 'origin', settings.branch], { timeout: 90_000 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'git fetch failed'
    return { ok: false, code: remoteUrl ? 'fetch-failed' : 'no-remote', detail }
  }

  try {
    const head = (await command('git', ['rev-parse', 'HEAD'], { timeout: 5000 })).stdout.trim()
    const remote = (
      await command('git', ['rev-parse', `origin/${settings.branch}`], { timeout: 5000 })
    ).stdout.trim()
    const [behindRaw, aheadRaw, logRaw, status] = await Promise.all([
      command('git', ['rev-list', '--count', `HEAD..origin/${settings.branch}`], { timeout: 10_000 }),
      command('git', ['rev-list', '--count', `origin/${settings.branch}..HEAD`], { timeout: 10_000 }),
      command(
        'git',
        ['log', '-n', '20', '--format=%H%x1f%s%x1f%an%x1f%aI%x1e', `HEAD..origin/${settings.branch}`],
        { timeout: 10_000 },
      ).catch(() => ({ stdout: '', stderr: '' })),
      command('git', ['status', '--porcelain'], { timeout: 10_000 }),
    ])

    const commits: UpdateCommit[] = logRaw.stdout
      .split('\x1e')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((record) => {
        const [sha, subject, author, date] = record.split('\x1f')
        return {
          sha: sha ?? '',
          short: (sha ?? '').slice(0, 7),
          subject: subject ?? '',
          author: author ?? '',
          date: date ?? '',
        }
      })

    return {
      ok: true,
      branch: settings.branch,
      current: head,
      shortCurrent: head.slice(0, 7),
      remote,
      shortRemote: remote.slice(0, 7),
      behind: Number.parseInt(behindRaw.stdout.trim(), 10) || 0,
      ahead: Number.parseInt(aheadRaw.stdout.trim(), 10) || 0,
      dirty: status.stdout.trim().length > 0,
      commits,
      remoteUrl: remoteUrl || null,
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ok: false,
      code: 'fetch-failed',
      detail: error instanceof Error ? error.message : 'Could not read the remote branch.',
    }
  }
}

export function opsHealthUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    `http://127.0.0.1:${process.env.PORT ?? 3000}`
  return `${base.replace(/\/+$/, '')}/api/health`
}

export type OpsJobType = 'BACKUP' | 'RESTORE' | 'UPDATE' | 'ROLLBACK'
export type BackupKindName = 'DATABASE' | 'FILES' | 'FULL'

export type OpsJob = {
  id: string
  type: OpsJobType
  appDir: string
  backupId?: string
  safetyBackupId?: string
  kind?: BackupKindName
  backup?: { filename: string; kind: BackupKindName }
  toCommit?: string
  branch?: string
  processManager?: string
  processName?: string
  healthUrl?: string
}

function jobFilePath(id: string) {
  if (!ID_RE.test(id)) throw new Error('Invalid operation id.')
  return path.join(BACKUP_DIR, 'jobs', `${id}.json`)
}

export function jobStatusFilePath(id: string) {
  if (!ID_RE.test(id)) throw new Error('Invalid operation id.')
  return path.join(BACKUP_DIR, 'jobs', `${id}.status.json`)
}

export async function startOpsJob(job: OpsJob) {
  const script = path.join(APP_DIR, 'scripts', 'system-ops.mjs')
  await access(script)
  await mkdir(path.join(BACKUP_DIR, 'jobs'), { recursive: true })
  const file = jobFilePath(job.id)
  await writeFile(file, JSON.stringify(job))

  const child = spawn(process.execPath, [script, file], {
    cwd: APP_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  })
  child.unref()
}

type JobStatusFile = {
  id: string
  type: string
  status: 'running' | 'succeeded' | 'failed' | 'rolled-back'
  phase: string
  message: string
  steps: { at: string; phase: string; message: string }[]
  result: {
    filename?: string
    sizeBytes?: number
    checksum?: string
    appCommit?: string | null
    fromCommit?: string
    toCommit?: string
    restarted?: boolean
  } | null
  safety: { filename?: string; sizeBytes?: number; checksum?: string; appCommit?: string | null } | null
  error: string | null
  startedAt: string
  finishedAt: string | null
}

async function readJobStatus(id: string): Promise<JobStatusFile | null> {
  if (!ID_RE.test(id)) return null
  try {
    const raw = await readFile(jobStatusFilePath(id), 'utf8')
    const parsed = JSON.parse(raw) as JobStatusFile
    if (!parsed || parsed.id !== id) return null
    return parsed
  } catch {
    return null
  }
}

/** Milliseconds since the runner last wrote its status file. */
async function jobSilenceMs(id: string) {
  if (!ID_RE.test(id)) return 0
  const info = await stat(jobStatusFilePath(id)).catch(() => null)
  return info ? Date.now() - info.mtimeMs : 0
}

/**
 * A status file frozen at "running" outlives a runner that was killed together
 * with the service while restarting it; nothing else would ever close the
 * operation. Once the file has gone quiet, verify the outcome against the
 * checkout instead: past the activate phase a matching HEAD means the new code
 * is already live.
 */
async function reconcileSilentRunner(
  operation: { updateId: string | null },
  statusFile: JobStatusFile,
): Promise<JobStatusFile> {
  const failed: JobStatusFile = {
    ...statusFile,
    status: 'failed',
    phase: 'failed',
    message: RUNNER_STOPPED,
    error: RUNNER_STOPPED,
    finishedAt: new Date().toISOString(),
  }
  if (!operation.updateId) return failed
  const restarted = statusFile.phase === 'activate' || statusFile.phase === 'health'
  if (!restarted) return failed

  const update = await prisma.systemUpdate.findUnique({
    where: { id: operation.updateId },
    select: { toCommit: true },
  })
  const git = await getLocalGitInfo()
  if (!update || !git || git.commit !== update.toCommit) return failed
  return {
    ...statusFile,
    status: 'succeeded',
    phase: 'done',
    message: 'The runner stopped reporting after the restart; the checkout matches the target commit.',
    error: null,
    finishedAt: new Date().toISOString(),
  }
}

export type OperationView = {
  id: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  phase: string | null
  message: string | null
  steps: { at: string; phase: string; message: string }[]
  finishedAt: string | null
}

function toView(operation: {
  id: string
  type: string
  status: string
  phase: string | null
  message: string | null
  finishedAt: Date | null
}): OperationView {
  return {
    id: operation.id,
    type: operation.type,
    status: operation.status as OperationView['status'],
    phase: operation.phase,
    message: operation.message,
    steps: [],
    finishedAt: operation.finishedAt ? operation.finishedAt.toISOString() : null,
  }
}

async function applySafetyResult(safetyBackupId: string | null, safety: JobStatusFile['safety']) {
  if (!safetyBackupId || !safety?.filename) return
  await prisma.systemBackup
    .update({
      where: { id: safetyBackupId },
      data: {
        status: 'READY',
        filename: safety.filename,
        sizeBytes: BigInt(safety.sizeBytes ?? 0),
        checksum: safety.checksum ?? null,
        appCommit: safety.appCommit ?? null,
        finishedAt: new Date(),
        error: null,
      },
    })
    .catch(() => undefined)
}

/**
 * Reads the runner's status file and folds it into the database. Safe to call
 * repeatedly; only the first terminal read performs the writes.
 */
export async function syncOperation(id: string): Promise<OperationView | null> {
  if (!ID_RE.test(id)) return null
  let statusFile = await readJobStatus(id)
  const operation = await prisma.systemOperation.findUnique({ where: { id } })

  if (!operation) {
    // Restoring a database snapshot that predates the operation deletes the
    // bookkeeping rows along with it; the runner's status file is then the
    // only evidence that survives, so report the outcome from it.
    if (!statusFile || statusFile.status === 'running') return null
    return {
      id,
      type: statusFile.type,
      status: statusFile.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
      phase: statusFile.phase,
      message: statusFile.error ?? statusFile.message ?? null,
      steps: statusFile.steps,
      finishedAt: statusFile.finishedAt,
    }
  }

  const terminal = operation.status === 'SUCCEEDED' || operation.status === 'FAILED'

  if (terminal && !statusFile) return toView(operation)
  if (!statusFile) {
    // The runner never reported. Only declare failure once it is clearly stale.
    if (Date.now() - operation.startedAt.getTime() > STALE_RUNNER_MS) {
      const updated = await prisma.systemOperation.update({
        where: { id },
        data: {
          status: 'FAILED',
          phase: 'failed',
          message: RUNNER_STOPPED,
          finishedAt: new Date(),
        },
      })
      return toView(updated)
    }
    return toView(operation)
  }

  if (statusFile.status === 'running' && (await jobSilenceMs(id)) > STALE_RUNNER_MS) {
    statusFile = await reconcileSilentRunner(operation, statusFile)
  }

  if (statusFile.status === 'running') {
    if (operation.status !== 'RUNNING') {
      const updated = await prisma.systemOperation.update({
        where: { id },
        data: {
          status: 'RUNNING',
          phase: statusFile.phase,
          message: statusFile.message,
        },
      })
      return { ...toView(updated), steps: statusFile.steps }
    }
    return { ...toView(operation), steps: statusFile.steps }
  }

  const succeeded = statusFile.status === 'succeeded'
  const rolledBack = statusFile.status === 'rolled-back'
  const finishedAt = statusFile.finishedAt ? new Date(statusFile.finishedAt) : new Date()

  await applySafetyResult(operation.safetyBackupId, statusFile.safety)

  if (operation.type === 'BACKUP' && operation.backupId) {
    if (succeeded && statusFile.result?.filename) {
      await prisma.systemBackup
        .update({
          where: { id: operation.backupId },
          data: {
            status: 'READY',
            filename: statusFile.result.filename,
            sizeBytes: BigInt(statusFile.result.sizeBytes ?? 0),
            checksum: statusFile.result.checksum ?? null,
            appCommit: statusFile.result.appCommit ?? null,
            finishedAt,
            error: null,
          },
        })
        .catch(() => undefined)
    } else {
      await prisma.systemBackup
        .update({
          where: { id: operation.backupId },
          data: {
            status: 'FAILED',
            error: statusFile.error ?? statusFile.message ?? 'Backup failed.',
            finishedAt,
          },
        })
        .catch(() => undefined)
    }
  }

  if (operation.type === 'RESTORE' && operation.backupId && succeeded) {
    await prisma.systemBackup
      .update({ where: { id: operation.backupId }, data: { restoredAt: finishedAt } })
      .catch(() => undefined)
  }

  if ((operation.type === 'UPDATE' || operation.type === 'ROLLBACK') && operation.updateId) {
    await prisma.systemUpdate
      .update({
        where: { id: operation.updateId },
        data: {
          status: succeeded ? 'INSTALLED' : rolledBack ? 'ROLLED_BACK' : 'FAILED',
          error: succeeded ? null : (statusFile.error ?? 'The update did not complete.'),
          finishedAt,
        },
      })
      .catch(() => undefined)
  }

  const updated = await prisma.systemOperation.update({
    where: { id },
    data: {
      status: succeeded ? 'SUCCEEDED' : 'FAILED',
      phase: statusFile.phase,
      message: statusFile.error ?? statusFile.message ?? null,
      finishedAt,
    },
  })

  if (succeeded && operation.type === 'BACKUP') {
    const settings = await getOpsSettings()
    await pruneBackups(settings.retention)
  }

  return { ...toView(updated), steps: statusFile.steps }
}

/** Keeps the newest READY backups and removes the archive of everything older. */
export async function pruneBackups(retention: number) {
  const stale = await prisma.systemBackup.findMany({
    where: { status: 'READY' },
    orderBy: { startedAt: 'desc' },
    skip: Math.max(1, retention),
    select: { id: true, filename: true },
  })
  for (const backup of stale) {
    if (backup.filename && path.basename(backup.filename) === backup.filename) {
      await unlink(path.join(BACKUP_DIR, backup.filename)).catch(() => undefined)
    }
    await prisma.systemBackup.delete({ where: { id: backup.id } }).catch(() => undefined)
  }
}

/** Reconciles every operation left open, e.g. after a page reload. */
export async function syncOpenOperations() {
  const open = await prisma.systemOperation.findMany({
    where: { status: { in: ['PENDING', 'RUNNING'] } },
    select: { id: true },
    take: 20,
  })
  await Promise.all(open.map((operation) => syncOperation(operation.id).catch(() => null)))
  await closeFinishedUpdates()
}

/**
 * Repairs history rows still marked INSTALLING after their operation already
 * finished — the bookkeeping write can be lost with the process being replaced.
 */
async function closeFinishedUpdates() {
  const open = await prisma.systemUpdate.findMany({
    where: { status: 'INSTALLING' },
    select: { id: true, startedAt: true },
  })
  for (const update of open) {
    const operation = await prisma.systemOperation.findFirst({
      where: { updateId: update.id },
      orderBy: { startedAt: 'desc' },
      select: { status: true, message: true, finishedAt: true },
    })
    if (!operation) {
      if (Date.now() - update.startedAt.getTime() <= STALE_RUNNER_MS) continue
      await prisma.systemUpdate
        .update({
          where: { id: update.id },
          data: { status: 'FAILED', error: RUNNER_STOPPED, finishedAt: new Date() },
        })
        .catch(() => undefined)
      continue
    }
    if (operation.status === 'SUCCEEDED') {
      await prisma.systemUpdate
        .update({
          where: { id: update.id },
          data: { status: 'INSTALLED', error: null, finishedAt: operation.finishedAt ?? new Date() },
        })
        .catch(() => undefined)
    } else if (operation.status === 'FAILED') {
      await prisma.systemUpdate
        .update({
          where: { id: update.id },
          data: {
            status: 'FAILED',
            error: operation.message ?? 'The update did not complete.',
            finishedAt: operation.finishedAt ?? new Date(),
          },
        })
        .catch(() => undefined)
    }
  }

  // Safety backups are reserved before their runner starts, so a job that
  // never ran leaves the row queued forever once its operation is closed.
  const busy = await prisma.systemOperation.findMany({
    where: { status: { in: ['PENDING', 'RUNNING'] } },
    select: { backupId: true, safetyBackupId: true },
  })
  const claimed = new Set<string>()
  for (const operation of busy) {
    if (operation.backupId) claimed.add(operation.backupId)
    if (operation.safetyBackupId) claimed.add(operation.safetyBackupId)
  }
  const stuck = await prisma.systemBackup.findMany({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      startedAt: { lt: new Date(Date.now() - STALE_RUNNER_MS) },
    },
    select: { id: true },
  })
  for (const backup of stuck) {
    if (claimed.has(backup.id)) continue
    await prisma.systemBackup
      .update({
        where: { id: backup.id },
        data: { status: 'FAILED', error: RUNNER_STOPPED, finishedAt: new Date() },
      })
      .catch(() => undefined)
  }
}

export function backupFilePath(filename: string | null) {
  if (!filename || path.basename(filename) !== filename) return null
  return path.join(BACKUP_DIR, filename)
}
