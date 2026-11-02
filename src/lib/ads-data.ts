import 'server-only'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import type { AdPlacement, AdType, AdUnitData, HeaderLinkData } from '@/lib/ads'

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
  url: true,
  icon: true,
  color: true,
  newTab: true,
  enabled: true,
  position: true,
} as const

/** Enabled header links for the public site header menu, ordered. Failure-safe. */
export const getActiveHeaderLinks = cache(async (): Promise<HeaderLinkData[]> => {
  try {
    return await prisma.headerLink.findMany({
      where: { enabled: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: headerLinkSelect,
    })
  } catch {
    return []
  }
})

/** Every ad unit for the admin manager, grouped by placement then order. */
export const getAllAdUnits = cache(async (): Promise<AdUnitData[]> => {
  const rows = await prisma.adUnit.findMany({
    orderBy: [{ placement: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(toAdUnitData)
})

/** Every header link for the admin manager, ordered. */
export const getAllHeaderLinks = cache(async (): Promise<HeaderLinkData[]> => {
  return prisma.headerLink.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: headerLinkSelect,
  })
})
