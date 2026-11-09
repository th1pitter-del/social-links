import 'server-only'

import { cache } from 'react'
import { getTranslations } from 'next-intl/server'

import { locales, type Locale } from '@/i18n/config'
import { prisma } from '@/lib/prisma'
import {
  HEADER_MENU_KEYS,
  type AdPlacement,
  type AdType,
  type AdUnitData,
  type HeaderLinkData,
  type HeaderLinkLabels,
  type HeaderMenuKey,
} from '@/lib/ads'

function toAdUnitData(row: {
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
}): AdUnitData {
  return {
    id: row.id,
    name: row.name,
    placement: row.placement as AdPlacement,
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

/**
 * Enabled ad units for one placement, ordered. Cached per request and
 * failure-safe so public pages always render without ads configured.
 */
export const getActiveAds = cache(async (placement: AdPlacement): Promise<AdUnitData[]> => {
  try {
    const rows = await prisma.adUnit.findMany({
      where: { placement, enabled: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toAdUnitData)
  } catch {
    return []
  }
})

const headerLinkSelect = {
  id: true,
  label: true,
  labelKey: true,
  labels: true,
  url: true,
  icon: true,
  color: true,
  newTab: true,
  enabled: true,
  position: true,
  parentId: true,
  builtIn: true,
} as const

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

/** Stored JSON is admin-typed text; keep only the supported locale keys. */
function toHeaderLinkLabels(value: unknown): HeaderLinkLabels | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const labels: HeaderLinkLabels = {}
  for (const locale of locales) {
    const text = (value as Record<string, unknown>)[locale]
    if (typeof text === 'string' && text.trim()) labels[locale] = text.trim()
  }
  return Object.keys(labels).length ? labels : null
}

function toHeaderLinkData(row: HeaderLinkRecord): HeaderLinkData {
  return {
    id: row.id,
    label: row.label,
    labelKey: row.labelKey,
    labels: toHeaderLinkLabels(row.labels),
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

/** Enabled header links for the public site header menu, ordered. Failure-safe. */
export const getActiveHeaderLinks = cache(async (): Promise<HeaderLinkData[]> => {
  try {
    const rows = await prisma.headerLink.findMany({
      where: { enabled: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: headerLinkSelect,
    })
    return rows.map(toHeaderLinkData)
  } catch {
    return []
  }
})

/**
 * The `nav` catalog text for every reusable menu key in every supported
 * locale, so the admin editor can prefill and compare translation overrides.
 */
export const getHeaderMenuTranslations = cache(
  async (): Promise<Record<HeaderMenuKey, Record<Locale, string>>> => {
    const catalogs = await Promise.all(
      locales.map(async (locale) => {
        const nav = await getTranslations({ locale, namespace: 'nav' })
        return [locale, nav] as const
      }),
    )
    const result = {} as Record<HeaderMenuKey, Record<Locale, string>>
    for (const key of HEADER_MENU_KEYS) {
      const byLocale = {} as Record<Locale, string>
      for (const [locale, nav] of catalogs) {
        byLocale[locale] = nav.has(key) ? nav(key) : ''
      }
      result[key] = byLocale
    }
    return result
  },
)

/** Every ad unit for the admin manager, grouped by placement then order. */
export const getAllAdUnits = cache(async (): Promise<AdUnitData[]> => {
  const rows = await prisma.adUnit.findMany({
    orderBy: [{ placement: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(toAdUnitData)
})

/** Every header link for the admin manager, ordered. */
export const getAllHeaderLinks = cache(async (): Promise<HeaderLinkData[]> => {
  const rows = await prisma.headerLink.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: headerLinkSelect,
  })
  return rows.map(toHeaderLinkData)
})
