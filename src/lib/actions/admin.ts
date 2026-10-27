'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import type { Platform, PlatformActionOption } from '@/lib/action-catalog'
import { isActionIcon } from '@/lib/action-icons'
import { writeAudit } from '@/lib/admin-utils'
import { deleteStoredFile } from '@/lib/file-storage'
import { deleteMedia } from '@/lib/media'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export type AdminActionResult = { ok: true } | { ok: false; error: string }

export type CreatePlatformResult =
  | { ok: true; platform: Platform }
  | { ok: false; error: string }

export type CreateActionOptionResult =
  | { ok: true; option: PlatformActionOption }
  | { ok: false; error: string }

export async function setUserBanned(userId: string, banned: boolean): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (session.user.id === userId) {
    return { ok: false, error: t('cannotBanSelf') }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return { ok: false, error: t('userNotFound') }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        banned,
        banReason: banned ? t('bannedByAdmin') : null,
        banExpires: null,
      },
    }),
    // Invalidate active sessions immediately.
    prisma.session.deleteMany({ where: { userId } }),
  ])

  await writeAudit({
    action: banned ? 'user.ban' : 'user.unban',
    targetType: 'user',
    targetId: userId,
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return { ok: true }
}

export async function adminSetUserRole(
  userId: string,
  role: 'USER' | 'ADMIN',
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  if (session.user.id === userId) {
    return { ok: false, error: t('cannotChangeOwnRole') }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return { ok: false, error: t('userNotFound') }

  await prisma.user.update({ where: { id: userId }, data: { role } })
  await writeAudit({
    action: role === 'ADMIN' ? 'user.promote' : 'user.demote',
    targetType: 'user',
    targetId: userId,
    details: role,
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return { ok: true }
}

export async function bulkSetUserBanned(
  userIds: string[],
  banned: boolean,
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')
  const ids = [...new Set(userIds)].filter((id) => id && id !== session.user.id)

  if (ids.length === 0) {
    return { ok: false, error: t('selectAtLeastOneUser') }
  }

  const existing = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })
  const validIds = existing.map((user) => user.id)

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: validIds } },
      data: {
        banned,
        banReason: banned ? t('bannedByAdmin') : null,
        banExpires: null,
      },
    }),
    prisma.session.deleteMany({ where: { userId: { in: validIds } } }),
  ])

  await writeAudit({
    action: banned ? 'user.bulk_ban' : 'user.bulk_unban',
    targetType: 'user',
    targetId: null,
    details: JSON.stringify({ count: validIds.length }),
  })

  revalidatePath('/admin/users')
  return { ok: true }
}

export async function adminSetLinkStatus(
  linkId: string,
  status: 'ACTIVE' | 'DISABLED' | 'DRAFT',
): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const link = await prisma.link.findUnique({ where: { id: linkId }, select: { id: true } })
  if (!link) return { ok: false, error: t('linkNotFound') }

  await prisma.link.update({ where: { id: linkId }, data: { status } })
  await writeAudit({
    action: 'link.status',
    targetType: 'link',
    targetId: linkId,
    details: status,
  })
  revalidatePath('/admin/links')
  revalidatePath(`/admin/links/${linkId}`)
  return { ok: true }
}

export async function bulkSetLinkStatus(
  linkIds: string[],
  status: 'ACTIVE' | 'DISABLED',
): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const ids = [...new Set(linkIds)].filter(Boolean)

  if (ids.length === 0) {
    return { ok: false, error: t('selectAtLeastOneLink') }
  }

  const result = await prisma.link.updateMany({ where: { id: { in: ids } }, data: { status } })
  await writeAudit({
    action: 'link.bulk_status',
    targetType: 'link',
    targetId: null,
    details: JSON.stringify({ status, count: result.count }),
  })

  revalidatePath('/admin/links')
  return { ok: true }
}

export async function setPlatformEnabled(
  key: string,
  enabled: boolean,
): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const platform = await prisma.platform.findUnique({ where: { key } })
  if (!platform) return { ok: false, error: t('platformNotFound') }

  await prisma.platform.update({ where: { key }, data: { enabled } })

  await writeAudit({
    action: enabled ? 'platform.enable' : 'platform.disable',
    targetType: 'platform',
    targetId: key,
    details: JSON.stringify({ enabled }),
  })

  revalidatePath('/admin/platforms')
  return { ok: true }
}

export async function setActionOptionEnabled(
  key: string,
  enabled: boolean,
): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const option = await prisma.actionOption.findUnique({ where: { key } })
  if (!option) return { ok: false, error: t('actionNotFound') }

  await prisma.actionOption.update({ where: { key }, data: { enabled } })

  await writeAudit({
    action: enabled ? 'actionOption.enable' : 'actionOption.disable',
    targetType: 'actionOption',
    targetId: key,
    details: JSON.stringify({ enabled }),
  })

  revalidatePath('/admin/platforms')
  return { ok: true }
}

export async function updateActionOptionLabel(
  key: string,
  label: string,
): Promise<AdminActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')

  const trimmed = label.trim().replace(/\s+/g, ' ')
  if (!trimmed) return { ok: false, error: t('labelEmpty') }
  if (trimmed.length > 60) {
    return { ok: false, error: t('labelTooLong') }
  }

  const option = await prisma.actionOption.findUnique({ where: { key } })
  if (!option) return { ok: false, error: t('actionNotFound') }
  if (option.label === trimmed) return { ok: true }

  await prisma.actionOption.update({
    where: { key },
    data: { label: trimmed, updatedBy: session.user.id },
  })

  await writeAudit({
    action: 'actionOption.rename',
    targetType: 'actionOption',
    targetId: key,
    details: JSON.stringify({ from: option.label, to: trimmed }),
  })

  revalidatePath('/admin/platforms')
  revalidatePath('/dashboard/links/new')
  return { ok: true }
}

export async function deleteMediaAsset(mediaId: string): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const deleted = await deleteMedia(mediaId)
  if (!deleted) return { ok: false, error: t('fileNotFound') }

  await writeAudit({
    action: 'media.delete',
    targetType: 'media',
    targetId: mediaId,
  })

  revalidatePath('/admin/media')
  return { ok: true }
}

export async function adminDeleteStoredFile(fileId: string): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const removed = await deleteStoredFile(fileId)
  if (!removed) return { ok: false, error: t('fileNotFound') }

  await writeAudit({
    action: 'storedFile.delete',
    targetType: 'storedFile',
    targetId: fileId,
  })

  revalidatePath('/admin/files')
  revalidatePath('/admin/links')
  revalidatePath('/dashboard/files')
  return { ok: true }
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function validateLabel(
  raw: string,
  t: (key: string) => string,
): { ok: true; label: string } | { ok: false; error: string } {
  const label = raw.trim().replace(/\s+/g, ' ')
  if (!label) return { ok: false, error: t('labelEmpty') }
  if (label.length > 60) return { ok: false, error: t('labelTooLong') }
  return { ok: true, label }
}

export async function createPlatform(input: {
  key: string
  label: string
  icon: string
}): Promise<CreatePlatformResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const key = normalizeKey(input.key)
  if (!/^[a-z][a-z0-9_]{1,49}$/.test(key)) {
    return { ok: false, error: t('platformKeyPattern') }
  }

  const labelResult = validateLabel(input.label, t)
  if (!labelResult.ok) return labelResult

  const existing = await prisma.platform.findUnique({ where: { key }, select: { id: true } })
  if (existing) return { ok: false, error: t('platformKeyExists') }

  const icon = isActionIcon(input.icon) ? input.icon : 'globe'
  const max = await prisma.platform.aggregate({ _max: { position: true } })
  const position = (max._max.position ?? -1) + 1

  const platform = await prisma.platform.create({
    data: { key, label: labelResult.label, icon, position, system: false },
    select: { id: true, key: true, label: true, icon: true, position: true },
  })

  await writeAudit({
    action: 'platform.create',
    targetType: 'platform',
    targetId: key,
    details: JSON.stringify({ label: labelResult.label }),
  })

  revalidatePath('/admin/platforms')
  revalidatePath('/dashboard/links/new')

  return {
    ok: true,
    platform: {
      id: platform.id,
      key: platform.key,
      label: platform.label,
      icon: platform.icon,
      enabled: true,
      position: platform.position,
      system: false,
      actionOptions: [],
    },
  }
}

export async function deletePlatform(key: string): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const platform = await prisma.platform.findUnique({
    where: { key },
    select: { id: true, label: true, system: true },
  })
  if (!platform) return { ok: false, error: t('platformNotFound') }
  if (platform.system) {
    return { ok: false, error: t('platformBuiltIn') }
  }

  const inUse = await prisma.linkAction.count({ where: { option: { platformId: platform.id } } })
  if (inUse > 0) {
    return {
      ok: false,
      error: t('platformInUse', { count: inUse }),
    }
  }

  await prisma.$transaction([
    prisma.actionOption.deleteMany({ where: { platformId: platform.id } }),
    prisma.platform.delete({ where: { id: platform.id } }),
  ])

  await writeAudit({
    action: 'platform.delete',
    targetType: 'platform',
    targetId: key,
    details: JSON.stringify({ label: platform.label }),
  })

  revalidatePath('/admin/platforms')
  revalidatePath('/dashboard/links/new')
  return { ok: true }
}

export async function createActionOption(input: {
  key: string
  label: string
  icon: string
  behavior: 'URL' | 'EMAIL'
  platformKey: string
}): Promise<CreateActionOptionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')

  const key = normalizeKey(input.key)
  if (!/^[a-z][a-z0-9_]{1,49}$/.test(key)) {
    return { ok: false, error: t('platformKeyPattern') }
  }

  const labelResult = validateLabel(input.label, t)
  if (!labelResult.ok) return labelResult

  const existing = await prisma.actionOption.findUnique({ where: { key }, select: { key: true } })
  if (existing) return { ok: false, error: t('actionKeyExists') }

  const platform = await prisma.platform.findUnique({
    where: { key: input.platformKey },
    select: { id: true, key: true },
  })
  if (!platform) return { ok: false, error: t('targetPlatformNotFound') }

  const icon = isActionIcon(input.icon) ? input.icon : 'link'
  const behavior = input.behavior === 'EMAIL' ? 'EMAIL' : 'URL'
  const max = await prisma.actionOption.aggregate({ _max: { position: true } })
  const position = (max._max.position ?? -1) + 1

  await prisma.actionOption.create({
    data: {
      key,
      label: labelResult.label,
      platformId: platform.id,
      icon,
      behavior,
      position,
      system: false,
      updatedBy: session.user.id,
    },
  })

  await writeAudit({
    action: 'actionOption.create',
    targetType: 'actionOption',
    targetId: key,
    details: JSON.stringify({ label: labelResult.label, platform: platform.key }),
  })

  revalidatePath('/admin/platforms')
  revalidatePath('/dashboard/links/new')

  return {
    ok: true,
    option: {
      key,
      label: labelResult.label,
      icon,
      behavior,
      enabled: true,
      position,
      system: false,
    },
  }
}

export async function deleteActionOption(key: string): Promise<AdminActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const option = await prisma.actionOption.findUnique({
    where: { key },
    select: { key: true, label: true, system: true },
  })
  if (!option) return { ok: false, error: t('actionNotFound') }
  if (option.system) {
    return { ok: false, error: t('actionBuiltIn') }
  }

  const inUse = await prisma.linkAction.count({ where: { type: key } })
  if (inUse > 0) {
    return {
      ok: false,
      error: t('actionInUse', { count: inUse }),
    }
  }

  await prisma.actionOption.delete({ where: { key } })

  await writeAudit({
    action: 'actionOption.delete',
    targetType: 'actionOption',
    targetId: key,
    details: JSON.stringify({ label: option.label }),
  })

  revalidatePath('/admin/platforms')
  revalidatePath('/dashboard/links/new')
  return { ok: true }
}
