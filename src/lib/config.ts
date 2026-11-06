import 'server-only'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'

/**
 * Runtime configuration lives in the admin-managed `Setting` table so it can be
 * changed without a redeploy. A row that exists is authoritative even when it
 * is empty — that is how an administrator clears or disables a value. The
 * environment is consulted only while no row exists, which keeps existing
 * installs working until the panel is filled in.
 */
const readSetting = cache(async (key: string): Promise<{ value: string } | null> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key }, select: { value: true } })
    return row ? { value: row.value.trim() } : null
  } catch {
    return null
  }
})

/** Effective text value for a configuration key, DB first then env fallback. */
export async function configText(dbKey: string, envName?: string): Promise<string> {
  const stored = await readSetting(dbKey)
  if (stored) return stored.value
  return envName ? (process.env[envName]?.trim() ?? '') : ''
}

export const VERIFICATION_SETTINGS = {
  telegramBotToken: { dbKey: 'verification.telegramBotToken', envName: 'TELEGRAM_BOT_TOKEN' },
  githubToken: { dbKey: 'verification.githubToken', envName: 'VERIFIER_GITHUB_TOKEN' },
  steamWebApiKey: { dbKey: 'verification.steamWebApiKey', envName: 'STEAM_WEB_API_KEY' },
  youtubeApiKey: { dbKey: 'verification.youtubeApiKey', envName: 'YOUTUBE_API_KEY' },
  /**
   * Google OAuth client used to read the visitor's own likes and subscriptions.
   * The API key above only reads public comments; these two let a visitor prove
   * a like or a subscription from their own Google account.
   */
  googleClientId: { dbKey: 'verification.googleClientId', envName: 'GOOGLE_CLIENT_ID' },
  googleClientSecret: {
    dbKey: 'verification.googleClientSecret',
    envName: 'GOOGLE_CLIENT_SECRET',
  },
  discordBotToken: { dbKey: 'verification.discordBotToken', envName: 'DISCORD_BOT_TOKEN' },
  /** Optional: lets the bot check any invite link the owner pastes. */
  discordGuildId: { dbKey: 'verification.discordGuildId', envName: 'DISCORD_GUILD_ID' },
} as const

export type ConfigRef = { dbKey: string; envName?: string }

/** Read one of the maps below without unpacking its two halves at the call site. */
export async function configValue(ref: ConfigRef): Promise<string> {
  return configText(ref.dbKey, ref.envName)
}

export const EMAIL_SETTINGS = {
  webhookUrl: { dbKey: 'email.webhookUrl', envName: 'EMAIL_WEBHOOK_URL' },
  webhookToken: { dbKey: 'email.webhookToken', envName: 'EMAIL_WEBHOOK_TOKEN' },
  from: { dbKey: 'email.from', envName: 'EMAIL_FROM' },
} as const

export const RETENTION_SETTINGS = {
  analyticsDays: { dbKey: 'retention.analyticsDays', envName: 'RETENTION_ANALYTICS_DAYS' },
} as const
