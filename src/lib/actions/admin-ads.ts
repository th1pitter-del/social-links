'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { Prisma } from '@/generated/prisma/client'
import { getHeaderMenuTranslations } from '@/lib/ads-data'
import { writeAudit } from '@/lib/admin-utils'
import { locales } from '@/i18n/config'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import {
  AD_LABEL_MAX_LENGTH,
  AD_NAME_MAX_LENGTH,
  AD_PLACEMENTS,
  AD_TYPES,
  AD_URL_MAX_LENGTH,
  AD_HTML_MAX_LENGTH,
  HEADER_ICONS,
  HEADER_LINK_LABEL_MAX_LENGTH,
  isHeaderMenuColor,
  isHeaderMenuKey,
  isUsableAdImageUrl,
  isUsableTargetUrl,
  type AdUnitData,
  type AdType,
  type AdUnitInput,
  type HeaderLinkData,
  type HeaderLinkInput,
  type HeaderLinkLabels,
} from '@/lib/ads'

export type AdminAdResult = { ok: true; ad: AdUnitData } | { ok: false; error: string }
export type AdminHeaderLinkResult =
  | { ok: true; link: HeaderLinkData }
  | { ok: false; error: string }
export type AdminAdsActionResult = { ok: true } | { ok: false; error: string }

function revalidateAdSurfaces() {
  revalidatePath('/admin/ads')
  revalidatePath('/admin/header-links')
  // Broad revalidation so every public surface (home, /link/*, /bio/*, dashboard)
  // picks up new ads and header links immediately.
  revalidatePath('/', 'layout')
}

type AdRecord = {
  id: string
  name: string
  placement: string
  type: string
  label: string | null
  url: string | null
  imageUrl: string | null
  html: string | null
  newTab: boolean
  enabled: boolean
  position: number
}

async function nextAdPosition(placement: string): Promise<number> {
  const last = await prisma.adUnit.findFirst({
    where: { placement },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  return (last?.position ?? -1) + 1
}

async function validateAdInput(
  input: AdUnitInput,
): Promise<
  | {
      ok: true
      data: {
        name: string
        placement: string
        type: AdType
        label: string | null
        url: string | null
        imageUrl: string | null
        html: string | null
        newTab: boolean
      }
    }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  const name = input.name.trim()
  if (!name || name.length > AD_NAME_MAX_LENGTH) {
    return { ok: false, error: t('nameRequired') }
  }

  if (!AD_PLACEMENTS.includes(input.placement as (typeof AD_PLACEMENTS)[number])) {
    return { ok: false, error: t('invalidAdPlacement') }
  }
  if (!AD_TYPES.includes(input.type as AdType)) {
    return { ok: false, error: t('invalidAdType') }
  }
  const type = input.type as AdType

  const label = input.label?.trim() ?? ''
  if (label.length > AD_LABEL_MAX_LENGTH) {
    return { ok: false, error: t('labelTooLong') }
  }

  const url = input.url?.trim() ?? ''
  const imageUrl = input.imageUrl?.trim() ?? ''
  const html = input.html?.trim() ?? ''

  if (type === 'banner') {
    if (!isUsableTargetUrl(url) || url.length > AD_URL_MAX_LENGTH) {
      return { ok: false, error: t('invalidUrl') }
    }
    if (!isUsableAdImageUrl(imageUrl)) {
      return { ok: false, error: t('invalidCoverImage') }
    }
  }

  if (type === 'link') {
    if (!label) {
      return { ok: false, error: t('labelRequired') }
    }
    if (!isUsableTargetUrl(url) || url.length > AD_URL_MAX_LENGTH) {
      return { ok: false, error: t('invalidUrl') }
    }
  }

  if (type === 'html' && (!html || html.length > AD_HTML_MAX_LENGTH)) {
    return { ok: false, error: t('htmlRequired') }
  }

  return {
    ok: true,
    data: {
      name,
      placement: input.placement,
      type,
      label: label || null,
      url: url || null,
      imageUrl: imageUrl || null,
      html: html || null,
      newTab: input.newTab,
    },
  }
}

function serializeAd(row: AdRecord): AdUnitData {
  return {
    id: row.id,
    name: row.name,
    placement: row.placement as AdUnitData['placement'],
    type: row.type as AdType,
    label: row.label,
    url: row.url,
    imageUrl: row.imageUrl,
    html: row.html,
    newTab: row.newTab,
    enabled: row.enabled,
    position: row.position,
  }
}

export async function createAdUnit(input: AdUnitInput): Promise<AdminAdResult> {
  await requireAdmin()
  const validated = await validateAdInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.adUnit.create({
    data: { ...validated.data, position: await nextAdPosition(validated.data.placement) },
  })
  await writeAudit({
    action: 'ad.create',
    targetType: 'adUnit',
    targetId: row.id,
    details: JSON.stringify({ name: row.name, placement: row.placement, type: row.type }),
  })
  revalidateAdSurfaces()
  return { ok: true, ad: serializeAd(row) }
}

export async function updateAdUnit(id: string, input: AdUnitInput): Promise<AdminAdResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.adUnit.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('adNotFound') }

  const validated = await validateAdInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.adUnit.update({ where: { id }, data: validated.data })
  await writeAudit({
    action: 'ad.update',
    targetType: 'adUnit',
    targetId: id,
    details: JSON.stringify({ name: row.name, placement: row.placement, type: row.type }),
  })
  revalidateAdSurfaces()
  return { ok: true, ad: serializeAd(row) }
}

export async function setAdUnitEnabled(
  id: string,
  enabled: boolean,
): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.adUnit.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('adNotFound') }

  await prisma.adUnit.update({ where: { id }, data: { enabled } })
  await writeAudit({
    action: enabled ? 'ad.enable' : 'ad.disable',
    targetType: 'adUnit',
    targetId: id,
  })
  revalidateAdSurfaces()
  return { ok: true }
}

export async function moveAdUnit(
  id: string,
  direction: 'up' | 'down',
): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const current = await prisma.adUnit.findUnique({
    where: { id },
    select: { id: true, placement: true, position: true },
  })
  if (!current) return { ok: false, error: t('adNotFound') }

  const siblings = await prisma.adUnit.findMany({
    where: { placement: current.placement },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, position: true },
  })
  const index = siblings.findIndex((row) => row.id === id)
  const neighbor =
    direction === 'up' ? siblings[index - 1] : siblings[index + 1]
  if (!neighbor) return { ok: true }

  await prisma.$transaction([
    prisma.adUnit.update({ where: { id }, data: { position: neighbor.position } }),
    prisma.adUnit.update({ where: { id: neighbor.id }, data: { position: current.position } }),
  ])
  revalidateAdSurfaces()
  return { ok: true }
}

export async function deleteAdUnit(id: string): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.adUnit.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!existing) return { ok: false, error: t('adNotFound') }

  await prisma.adUnit.delete({ where: { id } })
  await writeAudit({
    action: 'ad.delete',
    targetType: 'adUnit',
    targetId: id,
    details: JSON.stringify({ name: existing.name }),
  })
  revalidateAdSurfaces()
  return { ok: true }
}

type HeaderLinkRecord = {
  id: string
  label: string
  labelKey: string | null
  labels: unknown
  url: string
  icon: string
  color: string | null
  newTab: boolean
  enabled: boolean
  position: number
  parentId: string | null
  builtIn: boolean
}

function serializeHeaderLink(row: HeaderLinkRecord): HeaderLinkData {
  const labels: HeaderLinkLabels = {}
  if (row.labels && typeof row.labels === 'object' && !Array.isArray(row.labels)) {
    for (const locale of locales) {
      const text = (row.labels as Record<string, unknown>)[locale]
      if (typeof text === 'string' && text.trim()) labels[locale] = text.trim()
    }
  }
  return {
    id: row.id,
    label: row.label,
    labelKey: row.labelKey,
    labels: Object.keys(labels).length ? labels : null,
    url: row.url,
    icon: row.icon,
    color: row.color,
    newTab: row.newTab,
    enabled: row.enabled,
    position: row.position,
    parentId: row.parentId,
    builtIn: row.builtIn,
  }
}

async function nextHeaderPosition(parentId: string | null): Promise<number> {
  const last = await prisma.headerLink.findFirst({
    where: { parentId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  return (last?.position ?? -1) + 1
}

async function validateHeaderLinkInput(
  input: HeaderLinkInput,
  existing: { id: string; labelKey: string | null; builtIn: boolean } | null,
): Promise<
  | {
      ok: true
      data: {
        label: string
        labelKey: string | null
        labels: HeaderLinkLabels | null
        url: string
        icon: string
        color: string | null
        newTab: boolean
        parentId: string | null
      }
    }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  // A chosen menu key wins over typed text so the stored label always matches
  // the catalog the public header resolves. Seeded menus keep their own key.
  const requestedKey = input.labelKey?.trim() ?? ''
  const labelKey = existing?.builtIn ? existing.labelKey : requestedKey || null

  const typed: HeaderLinkLabels = {}
  for (const locale of locales) {
    const raw = input.labels?.[locale]
    if (typeof raw !== 'string') continue
    const text = raw.trim().replace(/\s+/g, ' ')
    if (!text) continue
    if (text.length > HEADER_LINK_LABEL_MAX_LENGTH) {
      return { ok: false, error: t('labelTooLong') }
    }
    typed[locale] = text
  }

  let label = ''
  let labels: HeaderLinkLabels | null = null
  if (labelKey) {
    if (!isHeaderMenuKey(labelKey)) {
      return { ok: false, error: t('invalidHeaderLabel') }
    }
    const catalog = (await getHeaderMenuTranslations())[labelKey]
    if (!catalog.en) return { ok: false, error: t('invalidHeaderLabel') }
    // Keep only the languages the admin changed, so untouched rows keep
    // following the site catalogs when those translations are updated.
    const overrides: HeaderLinkLabels = {}
    for (const locale of locales) {
      const text = typed[locale]
      if (text && text !== catalog[locale]) overrides[locale] = text
    }
    labels = Object.keys(overrides).length ? overrides : null
    label = labels?.en ?? catalog.en
  } else {
    // English is the canonical label; the other languages fall back to it.
    if (!typed.en) return { ok: false, error: t('labelRequired') }
    labels = typed
    label = typed.en
  }

  const url = input.url.trim()
  if (!isUsableTargetUrl(url) || url.length > AD_URL_MAX_LENGTH) {
    return { ok: false, error: t('invalidUrl') }
  }

  if (!HEADER_ICONS.includes(input.icon as (typeof HEADER_ICONS)[number])) {
    return { ok: false, error: t('invalidHeaderIcon') }
  }

  const color = input.color?.trim() ?? ''
  if (color && !isHeaderMenuColor(color)) {
    return { ok: false, error: t('invalidHeaderColor') }
  }

  const parentIdInput = input.parentId?.trim() ?? ''
  let parentId: string | null = null
  if (parentIdInput) {
    if (existing && parentIdInput === existing.id) {
      return { ok: false, error: t('invalidParentMenu') }
    }
    const parent = await prisma.headerLink.findUnique({
      where: { id: parentIdInput },
      select: { id: true, parentId: true },
    })
    // One level of nesting: the parent must itself be a top-level menu.
    if (!parent || parent.parentId) {
      return { ok: false, error: t('invalidParentMenu') }
    }
    if (existing) {
      const children = await prisma.headerLink.count({ where: { parentId: existing.id } })
      if (children > 0) {
        return { ok: false, error: t('parentHasSubLinks') }
      }
    }
    parentId = parent.id
  }

  return {
    ok: true,
    data: {
      label,
      labelKey,
      labels,
      url,
      icon: input.icon,
      color: color || null,
      newTab: input.newTab,
      parentId,
    },
  }
}

export async function createHeaderLink(input: HeaderLinkInput): Promise<AdminHeaderLinkResult> {
  await requireAdmin()
  const validated = await validateHeaderLinkInput(input, null)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.headerLink.create({
    data: {
      ...validated.data,
      labels: validated.data.labels ?? Prisma.DbNull,
      position: await nextHeaderPosition(validated.data.parentId),
    },
  })
  await writeAudit({
    action: 'headerLink.create',
    targetType: 'headerLink',
    targetId: row.id,
    details: JSON.stringify({ label: row.label, parentId: row.parentId }),
  })
  revalidateAdSurfaces()
  return { ok: true, link: serializeHeaderLink(row) }
}

export async function updateHeaderLink(
  id: string,
  input: HeaderLinkInput,
): Promise<AdminHeaderLinkResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.headerLink.findUnique({
    where: { id },
    select: { id: true, labelKey: true, builtIn: true, parentId: true },
  })
  if (!existing) return { ok: false, error: t('headerLinkNotFound') }

  const validated = await validateHeaderLinkInput(input, existing)
  if (!validated.ok) return { ok: false, error: validated.error }

  // Moving between menus re-queues the row at the end of its new siblings.
  const moved = validated.data.parentId !== existing.parentId
  const data = moved
    ? {
        ...validated.data,
        labels: validated.data.labels ?? Prisma.DbNull,
        position: await nextHeaderPosition(validated.data.parentId),
      }
    : { ...validated.data, labels: validated.data.labels ?? Prisma.DbNull }

  const row = await prisma.headerLink.update({ where: { id }, data })
  await writeAudit({
    action: 'headerLink.update',
    targetType: 'headerLink',
    targetId: id,
    details: JSON.stringify({ label: row.label, parentId: row.parentId }),
  })
  revalidateAdSurfaces()
  return { ok: true, link: serializeHeaderLink(row) }
}

export async function setHeaderLinkEnabled(
  id: string,
  enabled: boolean,
): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.headerLink.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('headerLinkNotFound') }

  await prisma.headerLink.update({ where: { id }, data: { enabled } })
  await writeAudit({
    action: enabled ? 'headerLink.enable' : 'headerLink.disable',
    targetType: 'headerLink',
    targetId: id,
  })
  revalidateAdSurfaces()
  return { ok: true }
}

export async function moveHeaderLink(
  id: string,
  direction: 'up' | 'down',
): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const current = await prisma.headerLink.findUnique({
    where: { id },
    select: { id: true, position: true, parentId: true },
  })
  if (!current) return { ok: false, error: t('headerLinkNotFound') }

  // Reordering only swaps siblings, so children never jump between menus.
  const siblings = await prisma.headerLink.findMany({
    where: { parentId: current.parentId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, position: true },
  })
  const index = siblings.findIndex((row) => row.id === id)
  const neighbor = direction === 'up' ? siblings[index - 1] : siblings[index + 1]
  if (!neighbor) return { ok: true }

  await prisma.$transaction([
    prisma.headerLink.update({ where: { id }, data: { position: neighbor.position } }),
    prisma.headerLink.update({
      where: { id: neighbor.id },
      data: { position: current.position },
    }),
  ])
  revalidateAdSurfaces()
  return { ok: true }
}

export async function deleteHeaderLink(id: string): Promise<AdminAdsActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.headerLink.findUnique({
    where: { id },
    select: { id: true, label: true },
  })
  if (!existing) return { ok: false, error: t('headerLinkNotFound') }

  await prisma.headerLink.delete({ where: { id } })
  await writeAudit({
    action: 'headerLink.delete',
    targetType: 'headerLink',
    targetId: id,
    details: JSON.stringify({ label: existing.label }),
  })
  revalidateAdSurfaces()
  return { ok: true }
}
