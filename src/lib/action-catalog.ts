import 'server-only'

import { cache } from 'react'

import { ACTION_OPTION_DEFAULTS, SUPPORTED_PLATFORM_KEYS, type ActionOptionView } from '@/lib/action-defaults'
import { prisma } from '@/lib/prisma'

const SUPPORTED_PLATFORMS = new Set<string>(SUPPORTED_PLATFORM_KEYS)
const BUILT_IN_ACTION_KEYS = new Set(ACTION_OPTION_DEFAULTS.map((option) => option.key))

/**
 * An action is offered when its platform is one the product supports and it is
 * either a built-in we ship for that platform or an option an administrator
 * created. Retired built-ins stay in the database but never reach the editor.
 * Whether the step can be proven is a separate question, answered at release
 * time by the verifier registry.
 */
function isOfferable(platform: string | null, key: string, system: boolean): boolean {
  if (!platform || !SUPPORTED_PLATFORMS.has(platform)) return false
  return !system || BUILT_IN_ACTION_KEYS.has(key)
}

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
  platform: { key: string; label: string } | null
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
    platform: row.platform?.key ?? null,
    platformLabel: row.platform?.label ?? null,
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
      toOption(row),
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
  return rows
    .map((row) => toOption(row))
    .filter((option) => isOfferable(option.platform, option.key, option.system))
})

/** Every action, for the admin management screen. */
export const getAllActionOptions = cache(async (): Promise<ActionOption[]> => {
  const rows = await prisma.actionOption.findMany({
    orderBy: ORDER,
    include: { platform: true },
  })
  return rows.map((row) => toOption(row))
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
    // Retired built-ins leave the panel with their platform; custom entries stay
    // manageable even though a custom platform is not offered to creators.
    actionOptions: p.actionOptions
      .filter(
        (option) =>
          !option.system ||
          (SUPPORTED_PLATFORMS.has(p.key) && BUILT_IN_ACTION_KEYS.has(option.key)),
      )
      .map(toPlatformOption),
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
  return platforms
    .map((p) => ({
      id: p.id,
      key: p.key,
      label: p.label,
      icon: p.icon,
      enabled: p.enabled,
      position: p.position,
      system: p.system,
      actionOptions: p.actionOptions
        .filter((option) => isOfferable(p.key, option.key, option.system))
        .map(toPlatformOption),
    }))
    // A platform with nothing offerable has nothing to show.
    .filter((platform) => platform.actionOptions.length > 0)
})