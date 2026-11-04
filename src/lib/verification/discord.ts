import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'
import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://discord.com/api/v10'
// Member search matches a prefix, so a full page means the answer was cut short.
const SEARCH_LIMIT = 100
// Discord refuses member searches whose query is shorter than this.
const MIN_QUERY = 3

type SearchedMember = {
  user?: { id?: string; username?: string; discriminator?: string }
}

async function call<T>(
  path: string,
  token: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const response = await fetch(`${API}${path}`, {
      signal: AbortSignal.timeout(8000),
      headers: { authorization: `Bot ${token}` },
    })
    if (response.status === 404) return { ok: false, status: 404 }
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, status: 0 }
  }
}

/** A server id, an invite link, or a bare invite code → the identifier to resolve. */
export function extractDiscordTarget(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const invite = trimmed.match(/(?:discord\.(?:gg|com)\/invite|discord\.gg)\/([a-z0-9-]{2,32})/i)
  if (invite) return invite[1].toLowerCase()
  const snowflake = normalizeHandle(trimmed)
  return /^\d{15,20}$/.test(snowflake) ? snowflake : null
}

/** Invite metadata is readable without a token, so the link alone can name the server. */
async function resolveGuildId(code: string): Promise<string | null> {
  try {
    const response = await fetch(`${API}/invites/${encodeURIComponent(code)}?with_counts=false`, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { guild?: { id?: string } }
    return data.guild?.id ?? null
  } catch {
    return null
  }
}

/** `name` or the legacy `name#0001`; Discord compares usernames case-insensitively. */
function parseRequested(input: string): { user: string; tag: string | null } | null {
  const cleaned = normalizeHandle(input).toLowerCase()
  if (!cleaned) return null
  const [user, tag] = cleaned.split('#')
  if (!user) return null
  if (tag && !/^\d{4}$/.test(tag)) return null
  return { user, tag: tag ?? null }
}

async function check(visitorHandle: string, creator: string): Promise<VerifyOutcome> {
  const token = await configValue(VERIFICATION_SETTINGS.discordBotToken)
  if (!token) return { status: 'UNAVAILABLE', message: 'bot_not_configured' }

  const configuredGuild = normalizeHandle(await configValue(VERIFICATION_SETTINGS.discordGuildId))
  const target = extractDiscordTarget(creator)
  if (!target) return { status: 'INVALID_HANDLE', message: 'bad_creator' }

  const guildId =
    configuredGuild && /^\d{15,20}$/.test(configuredGuild)
      ? configuredGuild
      : /^\d{15,20}$/.test(target)
        ? target
        : await resolveGuildId(target)
  if (!guildId) return { status: 'UNAVAILABLE', message: 'invite_unreadable' }

  const requested = parseRequested(visitorHandle)
  if (!requested) return { status: 'INVALID_HANDLE', message: 'bad_format' }
  if (requested.user.length < MIN_QUERY) return { status: 'UNAVAILABLE', message: 'name_too_short' }

  const search = await call<SearchedMember[]>(
    `/guilds/${guildId}/members/search?query=${encodeURIComponent(requested.user)}&limit=${SEARCH_LIMIT}`,
    token,
  )
  if (!search.ok) {
    // 403 means the bot is not in this server or cannot read members: that is a
    // configuration problem, never evidence about the visitor.
    if (search.status === 403) return { status: 'UNAVAILABLE', message: 'bot_lacks_access' }
    return { status: 'UNAVAILABLE', message: `http_${search.status}` }
  }

  const exact = search.data.filter((member) => {
    const user = member.user
    if (!user?.id || !user.username) return false
    if (user.username.toLowerCase() !== requested.user) return false
    return !requested.tag || user.discriminator === requested.tag
  })

  if (exact.length > 1) return { status: 'UNAVAILABLE', message: 'ambiguous_username' }
  if (!exact.length) {
    if (search.data.length >= SEARCH_LIMIT) {
      return { status: 'UNAVAILABLE', message: 'search_truncated' }
    }
    return {
      status: 'NOT_FOLLOWING',
      proof: `${visitorHandle} is not a member of Discord server ${guildId}`,
    }
  }

  const userId = exact[0].user!.id!
  const username = exact[0].user!.username!
  const member = await call<{ user?: { id?: string } }>(
    `/guilds/${guildId}/members/${userId}`,
    token,
  )
  if (!member.ok) {
    // A read the bot is not allowed to perform says nothing about the visitor.
    if (member.status !== 404) return { status: 'UNAVAILABLE', message: `member_read_${member.status}` }
    return {
      status: 'NOT_FOLLOWING',
      proof: `${username} (${userId}) not in Discord server ${guildId}`,
    }
  }
  if (member.data.user?.id !== userId) return { status: 'UNAVAILABLE', message: 'member_read_mismatch' }
  return {
    status: 'VERIFIED',
    proof: `${username} (${userId}) is a member of Discord server ${guildId}`,
  }
}

export async function isDiscordConfigured(): Promise<boolean> {
  return Boolean(await configValue(VERIFICATION_SETTINGS.discordBotToken))
}

registerVerifier('discord', () => ({
  platformKey: 'discord',
  mode: 'HANDLE',
  parseCreator: extractDiscordTarget,
  check,
  handleExample: 'yourusername',
  isConfigured: isDiscordConfigured,
}))
