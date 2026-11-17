import 'server-only'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { isCustomCodeSlot, type CustomCodeData } from '@/lib/custom-code'

type CustomCodeRecord = {
  id: string
  name: string
  slot: string
  code: string
  enabled: boolean
  position: number
}

function serialize(row: CustomCodeRecord): CustomCodeData {
  return {
    id: row.id,
    name: row.name,
    slot: isCustomCodeSlot(row.slot) ? row.slot : 'header',
    code: row.code,
    enabled: row.enabled,
    position: row.position,
  }
}

/** Every saved snippet, for the admin manager. */
export const getAllCustomCodes = cache(async (): Promise<CustomCodeData[]> => {
  try {
    const rows = await prisma.customCode.findMany({
      orderBy: [{ slot: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(serialize)
  } catch {
    // The table can be missing until the release migration has run; the public
    // site then keeps using the legacy settings values instead of failing.
    return []
  }
})

/** Enabled snippets in injection order, for the public root layout. */
export const getEnabledCustomCodes = cache(async (): Promise<CustomCodeData[]> => {
  try {
    const rows = await prisma.customCode.findMany({
      where: { enabled: true },
      orderBy: [{ slot: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(serialize)
  } catch {
    return []
  }
})
