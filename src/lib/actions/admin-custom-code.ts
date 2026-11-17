'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { writeAudit } from '@/lib/admin-utils'
import {
  CUSTOM_CODE_MAX_LENGTH,
  CUSTOM_CODE_NAME_MAX_LENGTH,
  isCustomCodeSlot,
  type CustomCodeData,
  type CustomCodeInput,
  type CustomCodeSlot,
} from '@/lib/custom-code'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export type AdminCustomCodeResult =
  | { ok: true; code: CustomCodeData }
  | { ok: false; error: string }
export type AdminCustomCodeActionResult = { ok: true } | { ok: false; error: string }
export type AdminCustomCodeImportResult =
  | { ok: true; code: CustomCodeData | null }
  | { ok: false; error: string }

const LEGACY_KEYS: Record<CustomCodeSlot, string> = {
  header: 'ads.headScripts',
  footer: 'ads.footerScripts',
}
const LEGACY_NAMES: Record<CustomCodeSlot, string> = {
  header: 'Imported header code',
  footer: 'Imported footer code',
}

function revalidateCodeSurfaces() {
  revalidatePath('/admin/settings/custom-code')
  // Broad revalidation so every public surface loads the new snippets.
  revalidatePath('/', 'layout')
}

function serialize(row: {
  id: string
  name: string
  slot: string
  code: string
  enabled: boolean
  position: number
}): CustomCodeData {
  return {
    id: row.id,
    name: row.name,
    slot: isCustomCodeSlot(row.slot) ? row.slot : 'header',
    code: row.code,
    enabled: row.enabled,
    position: row.position,
  }
}

async function nextPosition(slot: CustomCodeSlot): Promise<number> {
  const last = await prisma.customCode.findFirst({
    where: { slot },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  return (last?.position ?? -1) + 1
}

async function validateInput(input: CustomCodeInput): Promise<
  | { ok: true; data: { name: string; slot: CustomCodeSlot; code: string; enabled: boolean } }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name || name.length > CUSTOM_CODE_NAME_MAX_LENGTH) {
    return { ok: false, error: t('nameRequired') }
  }

  if (!isCustomCodeSlot(input.slot)) {
    return { ok: false, error: t('invalidCodeSlot') }
  }

  // Snippets are pasted verbatim; only surrounding whitespace is dropped.
  const code = input.code.trim()
  if (!code) {
    return { ok: false, error: t('codeRequired') }
  }
  if (code.length > CUSTOM_CODE_MAX_LENGTH) {
    return { ok: false, error: t('contentTooLong', { max: CUSTOM_CODE_MAX_LENGTH }) }
  }

  return { ok: true, data: { name, slot: input.slot, code, enabled: input.enabled } }
}

export async function createCustomCode(input: CustomCodeInput): Promise<AdminCustomCodeResult> {
  await requireAdmin()
  const validated = await validateInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.customCode.create({
    data: { ...validated.data, position: await nextPosition(validated.data.slot) },
  })
  await writeAudit({
    action: 'customCode.create',
    targetType: 'customCode',
    targetId: row.id,
    details: JSON.stringify({ name: row.name, slot: row.slot }),
  })
  revalidateCodeSurfaces()
  return { ok: true, code: serialize(row) }
}

export async function updateCustomCode(
  id: string,
  input: CustomCodeInput,
): Promise<AdminCustomCodeResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customCode.findUnique({
    where: { id },
    select: { id: true, slot: true },
  })
  if (!existing) return { ok: false, error: t('customCodeNotFound') }

  const validated = await validateInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  // Moving a snippet to the other slot re-queues it at the end of its new list.
  const moved = validated.data.slot !== existing.slot
  const row = await prisma.customCode.update({
    where: { id },
    data: moved
      ? { ...validated.data, position: await nextPosition(validated.data.slot) }
      : validated.data,
  })
  await writeAudit({
    action: 'customCode.update',
    targetType: 'customCode',
    targetId: id,
    details: JSON.stringify({ name: row.name, slot: row.slot }),
  })
  revalidateCodeSurfaces()
  return { ok: true, code: serialize(row) }
}

export async function setCustomCodeEnabled(
  id: string,
  enabled: boolean,
): Promise<AdminCustomCodeActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customCode.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('customCodeNotFound') }

  await prisma.customCode.update({ where: { id }, data: { enabled } })
  await writeAudit({
    action: enabled ? 'customCode.enable' : 'customCode.disable',
    targetType: 'customCode',
    targetId: id,
  })
  revalidateCodeSurfaces()
  return { ok: true }
}

export async function moveCustomCode(
  id: string,
  direction: 'up' | 'down',
): Promise<AdminCustomCodeActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const current = await prisma.customCode.findUnique({
    where: { id },
    select: { id: true, slot: true, position: true },
  })
  if (!current) return { ok: false, error: t('customCodeNotFound') }

  const siblings = await prisma.customCode.findMany({
    where: { slot: current.slot },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, position: true },
  })
  const index = siblings.findIndex((row) => row.id === id)
  const neighbor = direction === 'up' ? siblings[index - 1] : siblings[index + 1]
  if (!neighbor) return { ok: true }

  await prisma.$transaction([
    prisma.customCode.update({ where: { id }, data: { position: neighbor.position } }),
    prisma.customCode.update({
      where: { id: neighbor.id },
      data: { position: current.position },
    }),
  ])
  revalidateCodeSurfaces()
  return { ok: true }
}

export async function deleteCustomCode(id: string): Promise<AdminCustomCodeActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customCode.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!existing) return { ok: false, error: t('customCodeNotFound') }

  await prisma.customCode.delete({ where: { id } })
  await writeAudit({
    action: 'customCode.delete',
    targetType: 'customCode',
    targetId: id,
    details: JSON.stringify({ name: existing.name }),
  })
  revalidateCodeSurfaces()
  return { ok: true }
}

/**
 * Copies a value from the retired custom-code settings form into a snippet row
 * so it can be edited or deleted. The setting is kept: the public site only
 * falls back to it while the slot has no snippet rows. Only imports when the
 * slot list is still empty, so a double click cannot duplicate the code.
 */
export async function importLegacyCustomCodes(
  slot: CustomCodeSlot,
): Promise<AdminCustomCodeImportResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  if (!isCustomCodeSlot(slot)) return { ok: false, error: t('invalidCodeSlot') }

  const rows = await prisma.customCode.count({ where: { slot } })
  if (rows > 0) return { ok: true, code: null }

  const setting = await prisma.setting.findUnique({ where: { key: LEGACY_KEYS[slot] } })
  const code = setting?.value.trim() ?? ''
  if (!code) return { ok: true, code: null }

  const row = await prisma.customCode.create({
    data: {
      name: LEGACY_NAMES[slot],
      slot,
      code,
      enabled: true,
      position: await nextPosition(slot),
    },
  })
  await writeAudit({
    action: 'customCode.import',
    targetType: 'customCode',
    targetId: row.id,
    details: JSON.stringify({ slot, from: LEGACY_KEYS[slot] }),
  })
  revalidateCodeSurfaces()
  return { ok: true, code: serialize(row) }
}
