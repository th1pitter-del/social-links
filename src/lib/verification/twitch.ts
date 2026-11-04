import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { prisma } from '@/lib/prisma'
import { configText } from '@/lib/config'
import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const AUTH = 'https://id.twitch.tv/oauth2'
const HELIX = 'https://api.twitch.tv/helix'
const SCOPE = 'moderator:read:followers'
const CONNECT_STATE_TTL_MS = 15 * 60 * 1000

const KEYS = {
  clientId: 'verification.twitchClientId',
  clientSecret: 'verification.twitchClientSecret',
  accessToken: 'verification.twitchAccessToken',
  refreshToken: 'verification.twitchRefreshToken',
  broadcasterId: 'verification.twitchBroadcasterId',
  broadcasterLogin: 'verification.twitchBroadcasterLogin',
} as const

type HelixUsers = { data?: { id?: string; login?: string }[] }
type HelixFollowers = { data?: { user_id?: string }[] }

async function read(key: string): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key }, select: { value: true } })
    return (row?.value ?? '').trim()
  } catch {
    return ''
  }
}

async function write(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

type StoredTokens = {
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken: string
  broadcasterId: string
  broadcasterLogin: string
}

/** Every piece the flow needs, or null when the owner has not connected yet. */
async function tokens(): Promise<StoredTokens | null> {
  const [clientId, clientSecret, accessToken, refreshToken, broadcasterId, broadcasterLogin] =
    await Promise.all(Object.values(KEYS).map((key) => read(key)))
  if (
    !clientId ||
    !clientSecret ||
    !accessToken ||
    !refreshToken ||
    !broadcasterId ||
    !broadcasterLogin
  ) {
    return null
  }
  return { clientId, clientSecret, accessToken, refreshToken, broadcasterId, broadcasterLogin }
}

/** The URL the owner registers in the Twitch console, shown in the panel. */
export function twitchRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/connections/twitch`
}

function sign(payload: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? 'linkunlock'
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/**
 * The state carries the admin who started the flow, so a callback can neither be
 * replayed against another install nor attach someone else's channel.
 */
export function createConnectState(adminUserId: string): string {
  const payload = `${adminUserId}.${Date.now() + CONNECT_STATE_TTL_MS}`
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

export function verifyConnectState(state: string, expectedAdminUserId: string): boolean {
  const [body, signature] = state.split('.')
  if (!body || !signature) return false
  let payload: string
  try {
    payload = Buffer.from(body, 'base64url').toString('utf8')
  } catch {
    return false
  }
  const [userId, expiryRaw] = payload.split('.')
  const expiry = Number(expiryRaw)
  if (!userId || !Number.isFinite(expiry) || expiry < Date.now()) return false
  if (userId !== expectedAdminUserId) return false
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL(`${AUTH}/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  // Force the consent screen even when the owner is already signed in to Twitch,
  // so they cannot silently authorize with a different account.
  url.searchParams.set('force_verify', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

/** The link an admin clicks; null explains what is still missing in the panel. */
export async function startTwitchConnect(
  adminUserId: string,
  origin: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: 'missing_client' | 'missing_secret' }> {
  const clientId = await configText(KEYS.clientId)
  const clientSecret = await configText(KEYS.clientSecret)
  if (!clientId) return { ok: false, reason: 'missing_client' }
  if (!clientSecret) return { ok: false, reason: 'missing_secret' }
  return {
    ok: true,
    url: buildAuthorizeUrl(clientId, twitchRedirectUri(origin), createConnectState(adminUserId)),
  }
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  scope?: string[]
}

async function postToken(form: Record<string, string>): Promise<TokenResponse | null> {
  try {
    const response = await fetch(`${AUTH}/token`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    })
    if (!response.ok) return null
    return (await response.json()) as TokenResponse
  } catch {
    return null
  }
}

/**
 * Trades the one-time code for the broadcaster's own token pair and remembers who
 * they are. Twitch only answers the follow check with a *user* token, so this is
 * the step that cannot be avoided with an app credential.
 */
export async function completeTwitchConnect(
  code: string,
  redirectUri: string,
): Promise<{ ok: true; login: string } | { ok: false; reason: 'exchange_failed' | 'no_scope' | 'identity_failed' }> {
  const clientId = await configText(KEYS.clientId)
  const clientSecret = await configText(KEYS.clientSecret)
  if (!clientId || !clientSecret) return { ok: false, reason: 'exchange_failed' }

  const granted = await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  if (!granted?.access_token || !granted.refresh_token) {
    return { ok: false, reason: 'exchange_failed' }
  }
  if (!granted.scope?.includes(SCOPE)) return { ok: false, reason: 'no_scope' }

  const identity = await helix<HelixUsers>(`${HELIX}/users`, {
    Authorization: `Bearer ${granted.access_token}`,
    'Client-Id': clientId,
  })
  const me = identity?.data?.[0]
  if (!me?.id || !me.login) return { ok: false, reason: 'identity_failed' }

  await Promise.all([
    write(KEYS.accessToken, granted.access_token),
    write(KEYS.refreshToken, granted.refresh_token),
    write(KEYS.broadcasterId, me.id),
    write(KEYS.broadcasterLogin, me.login),
  ])
  return { ok: true, login: me.login }
}

export async function disconnectTwitch(): Promise<void> {
  await Promise.all([
    write(KEYS.accessToken, ''),
    write(KEYS.refreshToken, ''),
    write(KEYS.broadcasterId, ''),
    write(KEYS.broadcasterLogin, ''),
  ])
}

async function helix<T>(
  url: string,
  headers: Record<string, string>,
): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/**
 * A Twitch access token is good for a few hours, so reads carry their own
 * repair: try the stored token, refresh once when Twitch rejects it, retry.
 */
type Read<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'rejected'; data?: undefined }
  | { kind: 'failed'; data?: undefined }

async function readWithRefresh<T>(store: StoredTokens, url: string): Promise<Read<T>> {
  const attempt = async (accessToken: string): Promise<Read<T>> => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': store.clientId },
      })
      if (response.status === 401) return { kind: 'rejected' }
      if (!response.ok) return { kind: 'failed' }
      return { kind: 'ok', data: (await response.json()) as T }
    } catch {
      return { kind: 'failed' }
    }
  }

  const first = await attempt(store.accessToken)
  if (first.kind !== 'rejected') return first

  const fresh = await postToken({
    client_id: store.clientId,
    client_secret: store.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: store.refreshToken,
  })
  if (!fresh?.access_token) return { kind: 'rejected' }

  await write(KEYS.accessToken, fresh.access_token)
  if (fresh.refresh_token) await write(KEYS.refreshToken, fresh.refresh_token)
  store.accessToken = fresh.access_token
  if (fresh.refresh_token) store.refreshToken = fresh.refresh_token
  return attempt(fresh.access_token)
}

/** `https://twitch.tv/someone`, `@someone` or `someone` → `someone`. */
export function extractTwitchLogin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/twitch\.tv\/([^/?#]+)/i)
  const login = normalizeHandle(fromUrl ? fromUrl[1] : trimmed).toLowerCase()
  if (!/^[a-z0-9_]{3,25}$/.test(login)) return null
  // Twitch path segments that are not channels.
  if (['directory', 'settings', 'jobs', 'inventory', 'primetime'].includes(login)) return null
  return login
}

async function check(visitorHandle: string, creator: string): Promise<VerifyOutcome> {
  const store = await tokens()
  if (!store) return { status: 'UNAVAILABLE', message: 'not_connected' }

  const requested = extractTwitchLogin(visitorHandle)
  if (!requested) return { status: 'INVALID_HANDLE', message: 'bad_format' }

  // The token only answers for the connected channel, so a step pointing at a
  // different streamer cannot be checked by it.
  if (requested === store.broadcasterLogin.toLowerCase()) {
    return { status: 'UNAVAILABLE', message: 'visitor_is_owner' }
  }
  if (creator.toLowerCase() !== store.broadcasterLogin.toLowerCase()) {
    return { status: 'UNAVAILABLE', message: 'not_the_connected_channel' }
  }

  const looked = await readWithRefresh<HelixUsers>(
    store,
    `${HELIX}/users?login=${encodeURIComponent(requested)}`,
  )
  if (looked.kind !== 'ok') {
    return { status: 'UNAVAILABLE', message: `lookup_${looked.kind}` }
  }
  const visitorId = looked.data.data?.[0]?.id
  if (!visitorId) return { status: 'INVALID_HANDLE', message: 'unknown_visitor' }

  const followers = await readWithRefresh<HelixFollowers>(
    store,
    `${HELIX}/channels/followers?broadcaster_id=${store.broadcasterId}` +
      `&user_id=${visitorId}&first=1`,
  )
  if (followers.kind !== 'ok') {
    return { status: 'UNAVAILABLE', message: `follow_read_${followers.kind}` }
  }

  if (followers.data.data?.length) {
    return {
      status: 'VERIFIED',
      proof: `${requested} (${visitorId}) follows channel ${store.broadcasterLogin}`,
    }
  }

  // An empty follower answer also means the token lost its scope, so prove the
  // credential can read a follow at all — a broadcaster always follows themselves.
  const canary = await readWithRefresh<HelixFollowers>(
    store,
    `${HELIX}/channels/followers?broadcaster_id=${store.broadcasterId}` +
      `&user_id=${store.broadcasterId}&first=1`,
  )
  if (canary.kind !== 'ok' || !canary.data.data?.length) {
    return { status: 'UNAVAILABLE', message: 'follow_read_not_permitted' }
  }

  return {
    status: 'NOT_FOLLOWING',
    proof: `${requested} (${visitorId}) not following channel ${store.broadcasterLogin}`,
  }
}

registerVerifier('twitch', () => ({
  platformKey: 'twitch',
  mode: 'HANDLE',
  parseCreator: extractTwitchLogin,
  check,
  handleExample: 'yourlogin',
  isConfigured: async () => Boolean(await tokens()),
}))
