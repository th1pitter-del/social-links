'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { writeAudit } from '@/lib/admin-utils'
import { prisma } from '@/lib/prisma'
import { isMediaOrHttpUrl } from '@/lib/settings'
import { requireAdmin } from '@/lib/session'
import {
  AD_LABEL_MAX_LENGTH,
  AD_NAME_MAX_LENGTH,
  AD_PLACEMENTS,
  AD_TYPES,
  AD_URL_MAX_LENGTH,
  AD_HTML_MAX_LENGTH,
  HEADER_LINK_LABEL_MAX_LENGTH,
  isUsableTargetUrl,
  type AdUnitData,
  type AdType,
  type AdUnitInput,
  type HeaderLinkData,
  type HeaderLinkInput,
} from '@/lib/ads'

export type AdminAdResult = { ok: true; ad: AdUnitData } | { ok: false; error: string }
export type AdminHeaderLinkResult =
  | { ok: true; link: HeaderLinkData }
  | { ok: false; error: string }
export type AdminAdsActionResult = { ok: true } | { ok: false; error: string }

function revalidateAdSurfaces() {
  revalidatePath('/admin/ads')
  revalidatePath('/admin/header-links')
  // Broad revalidation so every public surface (home, /u/*, /bio/*, dashboard)
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
    if (!isMediaOrHttpUrl(imageUrl)) {
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
  url: string
  newTab: boolean
  enabled: boolean
  position: number
}

function serializeHeaderLink(row: HeaderLinkRecord): HeaderLinkData {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    newTab: row.newTab,
    enabled: row.enabled,
    position: row.position,
  }
}

async function validateHeaderLinkInput(
  input: HeaderLinkInput,
): Promise<
  | { ok: true; data: { label: string; url: string; newTab: boolean } }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  const label = input.label.trim().replace(/\s+/g, ' ')
  if (!label || label.length > HEADER_LINK_LABEL_MAX_LENGTH) {
    return { ok: false, error: t('labelRequired') }
  }

  const url = input.url.trim()
  if (!isUsableTargetUrl(url) || url.length > AD_URL_MAX_LENGTH) {
    return { ok: false, error: t('invalidUrl') }
  }

  return { ok: true, data: { label, url, newTab: input.newTab } }
}

export async function createHeaderLink(input: HeaderLinkInput): Promise<AdminHeaderLinkResult> {
  await requireAdmin()
  const validated = await validateHeaderLinkInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const last = await prisma.headerLink.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const row = await prisma.headerLink.create({
    data: { ...validated.data, position: (last?.position ?? -1) + 1 },
  })
  await writeAudit({
    action: 'headerLink.create',
    targetType: 'headerLink',
    targetId: row.id,
    details: JSON.stringify({ label: row.label }),
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

  const existing = await prisma.headerLink.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('headerLinkNotFound') }

  const validated = await validateHeaderLinkInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.headerLink.update({ where: { id }, data: validated.data })
  await writeAudit({
    action: 'headerLink.update',
    targetType: 'headerLink',
    targetId: id,
    details: JSON.stringify({ label: row.label }),
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
    select: { id: true, position: true },
  })
  if (!current) return { ok: false, error: t('headerLinkNotFound') }

  const siblings = await prisma.headerLink.findMany({
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
