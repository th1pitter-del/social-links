import 'server-only'

import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const PER_PAGE = 80
const MAX_PAGES = 10
const HOST_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i
const USER_RE = /^[a-z0-9_.-]{1,64}$/i

type MastodonAccount = { id?: string; acct?: string; url?: string }

async function api<T>(
  host: string,
  path: string,
  query: Record<string, string | number>,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const url = new URL(`https://${host}/api/v1/${path}`)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, status: 0 }
  }
}

/** `user` or `user@host` → `{ user, host }`. A bare name has no knowable home server. */
function splitAcct(value: string): { user: string; host: string } | null {
  const cleaned = normalizeHandle(value).toLowerCase()
  if (!cleaned.includes('@')) return null
  const [user, host] = cleaned.split('@')
  if (!user || !host) return null
  if (!USER_RE.test(user) || !HOST_RE.test(host)) return null
  return { user, host }
}

/** Full name as Mastodon stores it: `jane` on jane's own server, `jane@m.h.c` elsewhere. */
function qualify(acct: string, host: string): string {
  const cleaned = normalizeHandle(acct).toLowerCase()
  return cleaned.includes('@') ? cleaned : `${cleaned}@${host}`
}

/**
 * `https://mastodon.social/@jane`, `https://social.example/users/jane`,
 * `@jane@mastodon.social` → `jane@mastodon.social`.
 */
export function extractMastodonAcct(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/^https?:\/\/([a-z0-9.-]+\.[a-z]{2,})\/(?:@|users\/|profile\/)([^/?#]+)/i)
  if (fromUrl) return `${normalizeHandle(fromUrl[2]).toLowerCase()}@${fromUrl[1].toLowerCase()}`
  const parsed = splitAcct(trimmed)
  return parsed ? `${parsed.user}@${parsed.host}` : null
}

/** Resolve an account on its own server; null only when that server says it is absent. */
async function lookup(
  host: string,
  user: string,
): Promise<{ found: true; account: MastodonAccount } | { found: false; blocked: boolean }> {
  const result = await api<MastodonAccount>(host, 'accounts/lookup', { acct: user })
  if (result.ok) {
    return result.data.id
      ? { found: true, account: result.data }
      : { found: false, blocked: true }
  }
  // 404 is the instance saying the account is absent; anything else proves nothing.
  if (result.status === 404) return { found: false, blocked: false }
  return { found: false, blocked: true }
}

async function check(visitorHandle: string, creator: string): Promise<VerifyOutcome> {
  const creatorAcct = splitAcct(creator)
  if (!creatorAcct) return { status: 'INVALID_HANDLE', message: 'bad_creator' }

  const visitor = splitAcct(visitorHandle)
  if (!visitor) return { status: 'INVALID_HANDLE', message: 'need_instance' }

  const visitorAccount = await lookup(visitor.host, visitor.user)
  if (!visitorAccount.found) {
    return visitorAccount.blocked
      ? { status: 'UNAVAILABLE', message: `lookup_blocked_${visitor.host}` }
      : { status: 'INVALID_HANDLE', message: 'unknown_visitor' }
  }

  // Confirming the owner's handle exists keeps a typo in their link settings
  // from reading as "this visitor does not follow you".
  const creatorAccount = await lookup(creatorAcct.host, creatorAcct.user)
  if (!creatorAccount.found) {
    return creatorAccount.blocked
      ? { status: 'UNAVAILABLE', message: `lookup_blocked_${creatorAcct.host}` }
      : { status: 'INVALID_HANDLE', message: 'unknown_creator' }
  }

  let cursor: string | undefined
  let exhausted = false
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await api<MastodonAccount[]>(visitor.host, `accounts/${visitorAccount.account.id}/following`, {
      limit: PER_PAGE,
      ...(cursor ? { max_id: cursor } : {}),
    })
    if (!result.ok) {
      // An unreadable page must never be reported as "does not follow".
      return { status: 'UNAVAILABLE', message: `http_${result.status}` }
    }
    const following = result.data ?? []
    if (
      following.some(
        (entry) => entry.acct && qualify(entry.acct, visitor.host) === `${creatorAcct.user}@${creatorAcct.host}`,
      )
    ) {
      return {
        status: 'VERIFIED',
        proof: `${visitor.user}@${visitor.host} follows ${creatorAcct.user}@${creatorAcct.host}`,
      }
    }
    cursor = following.at(-1)?.id
    if (!cursor || following.length < PER_PAGE) {
      exhausted = true
      break
    }
  }

  if (!exhausted) {
    return { status: 'UNAVAILABLE', message: 'following_list_too_long' }
  }

  return {
    status: 'NOT_FOLLOWING',
    proof: `${visitor.user}@${visitor.host} not in follows of ${creatorAcct.user}@${creatorAcct.host}`,
  }
}

registerVerifier('mastodon', () => ({
  platformKey: 'mastodon',
  mode: 'HANDLE',
  parseCreator: extractMastodonAcct,
  check,
  handleExample: '@you@mastodon.social',
  // Follow lists are public on the federated API, so nothing has to be configured.
  isConfigured: async () => true,
}))
