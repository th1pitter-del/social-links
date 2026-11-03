import 'server-only'

import { configText, VERIFICATION_SETTINGS } from '@/lib/config'
import { registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://api.telegram.org'

/** Statuses that mean the account is in the channel right now. */
const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted'])

async function botToken(): Promise<string> {
  const { dbKey, envName } = VERIFICATION_SETTINGS.telegramBotToken
  return configText(dbKey, envName)
}

/** True once an administrator has supplied a bot token in /admin/settings. */
export async function isTelegramConfigured(): Promise<boolean> {
  return Boolean(await botToken())
}

type BotResult<T> = { ok: true; result: T } | { ok: false; status: number; description: string }

async function call<T>(method: string, params: Record<string, unknown>): Promise<BotResult<T>> {
  const token = await botToken()
  if (!token) return { ok: false, status: 0, description: 'no_bot_token' }
  try {
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = (await response.json()) as {
      ok?: boolean
      result?: T
      description?: string
      error_code?: number
    }
    if (data.ok) return { ok: true, result: data.result as T }
    return {
      ok: false,
      status: data.error_code ?? response.status,
      description: data.description ?? 'unknown',
    }
  } catch {
    return { ok: false, status: 0, description: 'network' }
  }
}

/**
 * `https://t.me/<channel>` → `@<channel>`. Private invite links (`t.me/+xyz`)
 * carry no resolvable id, so they cannot be checked and are refused here rather
 * than failing later in front of a visitor.
 */
export function extractTelegramChannel(value: string): string | null {
  const trimmed = value.trim()
  const fromUrl = trimmed.match(/t\.me\/([^/?#]+)/i)
  const candidate = (fromUrl ? fromUrl[1] : trimmed).replace(/^@+/, '')
  if (candidate.startsWith('+')) return null
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(candidate)) return null
  return `@${candidate.toLowerCase()}`
}

type MeResult = { username?: string }
let cachedBotUsername: string | null = null

/** The bot's own username, needed to build the check-in link. */
export async function getBotUsername(): Promise<string | null> {
  if (cachedBotUsername) return cachedBotUsername
  const result = await call<MeResult>('getMe', {})
  if (!result.ok || !result.result.username) return null
  cachedBotUsername = result.result.username
  return cachedBotUsername
}

export function buildCheckinLink(botUsername: string, nonce: string): string {
  return `https://t.me/${botUsername}?start=${nonce}`
}

type UpdatesResult = {
  update_id?: number
  message?: { text?: string; from?: { id?: number; username?: string } }
}[]

export type CheckinVisitor = { userId: string; username: string | null }

/**
 * Reads the bot's pending updates for the check-in whose payload matches. No
 * offset is sent: acknowledging updates would erase other visitors' pending
 * check-ins, which are read by a different request.
 */
export async function findCheckinVisitor(nonce: string): Promise<CheckinVisitor | 'NOT_SEEN' | 'UNAVAILABLE'> {
  const result = await call<UpdatesResult>('getUpdates', { limit: 100, allowed_updates: ['message'] })
  if (!result.ok) return 'UNAVAILABLE'
  const prefix = `/start ${nonce}`
  for (const update of result.result ?? []) {
    const text = update.message?.text?.trim() ?? ''
    if (text !== prefix && !text.startsWith(`${prefix} `)) continue
    const id = update.message?.from?.id
    if (!id) return 'NOT_SEEN'
    return { userId: String(id), username: update.message?.from?.username ?? null }
  }
  return 'NOT_SEEN'
}

type MemberResult = { status?: string }

/** Membership as Telegram itself records it. A failed read is never a refusal. */
export async function readMemberStatus(chatId: string, visitor: CheckinVisitor): Promise<VerifyOutcome> {
  const result = await call<MemberResult>('getChatMember', {
    chat_id: chatId,
    user_id: Number(visitor.userId),
  })
  if (!result.ok) {
    return { status: 'UNAVAILABLE', message: `telegram_${result.status}_${result.description}` }
  }
  const status = result.result.status ?? ''
  const who = visitor.username ? `@${visitor.username}` : `id ${visitor.userId}`
  if (MEMBER_STATUSES.has(status)) {
    return { status: 'VERIFIED', proof: `${who} is ${status} of ${chatId}` }
  }
  if (status === 'left' || status === 'kicked') {
    return { status: 'NOT_FOLLOWING', proof: `${who} is ${status} of ${chatId}` }
  }
  return { status: 'UNAVAILABLE', message: `telegram_status_${status}` }
}

registerVerifier('telegram', () => ({
  platformKey: 'telegram',
  mode: 'HANDOFF',
  parseCreator: extractTelegramChannel,
  isConfigured: isTelegramConfigured,
}))
