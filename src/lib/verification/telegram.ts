import 'server-only'

import { configText, VERIFICATION_SETTINGS } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://api.telegram.org'
const UPDATE_BATCH_SIZE = 100

/** Restricted accounts need Telegram's explicit is_member flag as well. */
const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member'])

async function botToken(): Promise<string> {
  const { dbKey, envName } = VERIFICATION_SETTINGS.telegramBotToken
  return configText(dbKey, envName)
}

/** True once an administrator has supplied a bot token in /admin/settings. */
export async function isTelegramConfigured(): Promise<boolean> {
  return Boolean(await botToken())
}

type BotResult<T> = { ok: true; result: T } | { ok: false; status: number; description: string }

async function call<T>(
  method: 'getMe' | 'getUpdates' | 'getChatMember',
  params: Record<string, unknown>,
  currentToken?: string,
): Promise<BotResult<T>> {
  try {
    const token = currentToken ?? (await botToken())
    if (!token) return { ok: false, status: 0, description: 'no_bot_token' }
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
    const data = (await response.json()) as {
      ok?: boolean
      result?: T
      description?: string
      error_code?: number
    } | null
    if (response.ok && data?.ok === true && data.result != null) {
      return { ok: true, result: data.result }
    }
    return {
      ok: false,
      status: data?.error_code ?? response.status,
      description: data?.description ?? 'unknown',
    }
  } catch {
    return { ok: false, status: 0, description: 'network' }
  }
}

/** Only public usernames or exact t.me/telegram.me profile URLs are resolvable. */
export function parseTelegramChannel(value: string): string | null {
  const trimmed = value.trim()
  let candidate = trimmed.replace(/^@/, '')
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(candidate)) {
    try {
      const url = new URL(
        /^(?:t\.me|telegram\.me)\//i.test(trimmed) ? `https://${trimmed}` : trimmed,
      )
      if (
        (url.protocol !== 'https:' && url.protocol !== 'http:') ||
        (url.hostname !== 't.me' && url.hostname !== 'telegram.me') ||
        url.username || url.password || url.port
      ) return null
      const path = url.pathname.match(/^\/([A-Za-z][A-Za-z0-9_]{4,31})\/?$/)
      if (!path) return null
      candidate = path[1]
    } catch {
      return null
    }
  }
  if (candidate.toLowerCase() === 'joinchat') return null
  return `@${candidate.toLowerCase()}`
}

export const extractTelegramChannel = parseTelegramChannel

type MeResult = { username?: string }

/** Read the current token's bot every time; token changes must not reuse a username. */
export async function getBotUsername(): Promise<string | null> {
  const result = await call<MeResult>('getMe', {})
  if (!result.ok || typeof result.result.username !== 'string' || !result.result.username) return null
  return result.result.username
}

export function buildCheckinLink(botUsername: string, nonce: string): string {
  return `https://t.me/${botUsername}?start=${nonce}`
}

type UpdatesResult = {
  update_id: number
  message?: {
    text?: string
    from?: { id?: number; username?: string }
    chat?: { id?: number; type?: string }
  }
}[]

export type CheckinVisitor = { userId: string; username: string | null }

async function storedVisitor(nonce: string): Promise<CheckinVisitor | null> {
  const checkin = await prisma.telegramCheckin.findFirst({
    where: { id: nonce, expiresAt: { gt: new Date() } },
    select: { userId: true, username: true },
  })
  return checkin?.userId ? { userId: checkin.userId, username: checkin.username } : null
}

/**
 * Drain one bounded batch, durably binding every visitor before confirming it.
 * Replayed/concurrent batches may only bind an unbound, unexpired check-in.
 */
export async function findCheckinVisitor(nonce: string): Promise<CheckinVisitor | 'NOT_SEEN' | 'UNAVAILABLE'> {
  try {
    const stored = await storedVisitor(nonce)
    if (stored) return stored

    // Pin the token so a settings change cannot acknowledge a different bot's queue.
    const token = await botToken()
    const result = await call<UpdatesResult>('getUpdates', {
      limit: UPDATE_BATCH_SIZE,
      allowed_updates: ['message'],
    }, token)
    if (!result.ok || !Array.isArray(result.result) || result.result.length > UPDATE_BATCH_SIZE) {
      return 'UNAVAILABLE'
    }
    if (result.result.some((update) =>
      !update || !Number.isSafeInteger(update.update_id) || update.update_id < 0 ||
      update.update_id >= Number.MAX_SAFE_INTEGER,
    )) return 'UNAVAILABLE'

    const updates = result.result.sort((a, b) => a.update_id - b.update_id)
    for (const update of updates) {
      const message = update.message
      const id = message?.from?.id
      if (
        typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 ||
        message?.chat?.type !== 'private' || message.chat.id !== id ||
        typeof message.text !== 'string'
      ) continue
      const start = message.text.trim().match(/^\/start\s+([A-Za-z0-9_-]{1,64})$/)
      if (!start) continue
      await prisma.telegramCheckin.updateMany({
        where: { id: start[1], userId: null, expiresAt: { gt: new Date() } },
        data: {
          userId: String(id),
          username: typeof message.from?.username === 'string' ? message.from.username : null,
        },
      })
    }

    if (updates.length) {
      // Only lower update IDs are confirmed. The one extra returned update is
      // deliberately left unacknowledged for the next poll to persist.
      const acknowledged = await call<UpdatesResult>('getUpdates', {
        offset: updates[updates.length - 1].update_id + 1,
        limit: 1,
        allowed_updates: ['message'],
      }, token)
      if (!acknowledged.ok || !Array.isArray(acknowledged.result)) return 'UNAVAILABLE'
    }

    // Always return the database winner, never an identity from a losing update.
    return (await storedVisitor(nonce)) ?? 'NOT_SEEN'
  } catch {
    // Partial writes are safe to replay; never acknowledge after persistence fails.
    return 'UNAVAILABLE'
  }
}

type MemberResult = { status?: string; is_member?: boolean }

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
  if (MEMBER_STATUSES.has(status) || (status === 'restricted' && result.result.is_member === true)) {
    return { status: 'VERIFIED', proof: `${who} is ${status} of ${chatId}` }
  }
  if (status === 'left' || status === 'kicked' || (status === 'restricted' && result.result.is_member === false)) {
    return { status: 'NOT_FOLLOWING', proof: `${who} is ${status} of ${chatId}` }
  }
  return { status: 'UNAVAILABLE', message: `telegram_status_${status}` }
}

registerVerifier('telegram', () => ({
  platformKey: 'telegram',
  actionTypes: ['TELEGRAM_CHANNEL', 'TELEGRAM_GROUP'],
  mode: 'HANDOFF',
  parseCreator: parseTelegramChannel,
  isConfigured: isTelegramConfigured,
}))
