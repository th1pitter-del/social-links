import 'server-only'

import { cache } from 'react'

import type { ActionOptionView } from '@/lib/action-defaults'
import { prisma } from '@/lib/prisma'

export type ActionOption = ActionOptionView & {
  enabled: boolean
  position: number
  system: boolean
}

export type PlatformActionOption = {
  key: string
  label: string
  icon: string
  behavior: 'URL' | 'EMAIL'
  enabled: boolean
  position: number
  system: boolean
}

export type Platform = {
  id: string
  key: string
  label: string
  icon: string
  enabled: boolean
  position: number
  system: boolean
  actionOptions: PlatformActionOption[]
}

type ActionOptionRow = {
  key: string
  label: string
  platform: string | null
  icon: string
  behavior: string
  enabled: boolean
  position: number
  system: boolean
}

function toOption(row: ActionOptionRow): ActionOption {
  return {
    key: row.key,
    label: row.label,
    platform: row.platform,
    icon: row.icon,
    behavior: row.behavior === 'EMAIL' ? 'EMAIL' : 'URL',
    enabled: row.enabled,
    position: row.position,
    system: row.system,
  }
}

type PlatformOptionRow = {
  key: string
  label: string
  icon: string
  behavior: string
  enabled: boolean
  position: number
  system: boolean
}

function toPlatformOption(row: PlatformOptionRow): PlatformActionOption {
  return {
    key: row.key,
    label: row.label,
    icon: row.icon,
    behavior: row.behavior === 'EMAIL' ? 'EMAIL' : 'URL',
    enabled: row.enabled,
    position: row.position,
    system: row.system,
  }
}

const ORDER = [{ position: 'asc' as const }, { label: 'asc' as const }]

/** All configured actions keyed by their stable string key. */
export const getActionOptionMap = cache(async (): Promise<Map<string, ActionOption>> => {
  const rows = await prisma.actionOption.findMany({
    orderBy: ORDER,
    include: { platform: true },
  })
  return new Map(
    rows.map((row): [string, ActionOption] => [
      row.key,
      toOption({
        key: row.key,
        label: row.label,
        platform: row.platform?.key ?? null,
        icon: row.icon,
        behavior: row.behavior,
        enabled: row.enabled,
        position: row.position,
        system: row.system,
      }),
    ]),
  )
})

/** Actions offered to link owners in the link editor. */
export const getEnabledActionOptions = cache(async (): Promise<ActionOption[]> => {
  const rows = await prisma.actionOption.findMany({
    where: { enabled: true, platform: { enabled: true } },
    orderBy: ORDER,
    include: { platform: true },
  })
  return rows.map((row) =>
    toOption({
      key: row.key,
      label: row.label,
      platform: row.platform?.key ?? null,
      icon: row.icon,
      behavior: row.behavior,
      enabled: row.enabled,
      position: row.position,
      system: row.system,
    }),
  )
})

/** Every action, for the admin management screen. */
export const getAllActionOptions = cache(async (): Promise<ActionOption[]> => {
  const rows = await prisma.actionOption.findMany({
    orderBy: ORDER,
    include: { platform: true },
  })
  return rows.map((row) =>
    toOption({
      key: row.key,
      label: row.label,
      platform: row.platform?.key ?? null,
      icon: row.icon,
      behavior: row.behavior,
      enabled: row.enabled,
      position: row.position,
      system: row.system,
    }),
  )
})

/** All platforms with their action options. */
export const getAllPlatforms = cache(async (): Promise<Platform[]> => {
  const platforms = await prisma.platform.findMany({
    orderBy: [{ position: 'asc' }, { label: 'asc' }],
    include: {
      actionOptions: {
        orderBy: [{ position: 'asc' }, { label: 'asc' }],
        select: {
          key: true,
          label: true,
          icon: true,
          behavior: true,
          enabled: true,
          position: true,
          system: true,
        },
      },
    },
  })
  return platforms.map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    icon: p.icon,
    enabled: p.enabled,
    position: p.position,
    system: p.system,
    actionOptions: p.actionOptions.map(toPlatformOption),
  }))
})

/** Enabled platforms with enabled action options. */
export const getEnabledPlatforms = cache(async (): Promise<Platform[]> => {
  const platforms = await prisma.platform.findMany({
    where: { enabled: true },
    orderBy: [{ position: 'asc' }, { label: 'asc' }],
    include: {
      actionOptions: {
        where: { enabled: true },
        orderBy: [{ position: 'asc' }, { label: 'asc' }],
        select: {
          key: true,
          label: true,
          icon: true,
          behavior: true,
          enabled: true,
          position: true,
          system: true,
        },
      },
    },
  })
  return platforms.map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    icon: p.icon,
    enabled: p.enabled,
    position: p.position,
    system: p.system,
    actionOptions: p.actionOptions.map(toPlatformOption),
  }))
})