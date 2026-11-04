import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'
import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://steamcommunity.com'
// Steam64 ids are 17 digits beginning 765611, the namespace offset plus the account id.
const STEAMID_RE = /^765611[0-9]{11}$/

type Summary = { steamid?: string; communityvisibilitystate?: number; personaname?: string }

async function call<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const key = await configValue(VERIFICATION_SETTINGS.steamWebApiKey)
  if (!key) return { ok: false, status: 0 }
  const url = new URL(`${API}/steam/${endpoint}/v1/`)
  url.searchParams.set('key', key)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
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

/** `76561198...`, `https://steamcommunity.com/profiles/76561198...` or `/id/custom-name`. */
export function extractSteamId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(
    /steamcommunity\.com\/(profiles|id|games)\/([^/?#]+)/i,
  )
  const candidate = normalizeHandle(fromUrl ? fromUrl[2] : trimmed).toLowerCase()
  if (!candidate) return null
  if (STEAMID_RE.test(candidate)) return candidate
  // A vanity name is only useful when it is not a URL to something else.
  if (fromUrl && fromUrl[1].toLowerCase() !== 'id') return null
  return /^[a-z0-9_-]{2,32}$/.test(candidate) ? candidate : null
}

/** Vanity names resolve through the API; bare 765611... ids are already final. */
async function resolveSteamId(input: string): Promise<string | null> {
  if (STEAMID_RE.test(input)) return input
  const result = await call<{ response?: { steamid?: string; success?: number } }>(
    'ISteamUser/ResolveVanityURL',
    { vanityurl: input },
  )
  if (!result.ok) return null
  return result.data.response?.success === 1 ? (result.data.response.steamid ?? null) : null
}

async function visibility(steamId: string): Promise<number | null> {
  const result = await call<{ response?: { players?: Summary[] } }>(
    'ISteamUser/GetPlayerSummaries',
    { steamids: steamId },
  )
  if (!result.ok) return null
  return result.data.response?.players?.[0]?.communityvisibilitystate ?? null
}

async function check(visitorHandle: string, creator: string): Promise<VerifyOutcome> {
  // The owner may have pasted a custom URL, so their side needs resolving too.
  const wanted = await resolveSteamId(creator)
  if (!wanted) return { status: 'INVALID_HANDLE', message: 'unknown_creator' }

  const visitorInput = extractSteamId(normalizeHandle(visitorHandle))
  if (!visitorInput) return { status: 'INVALID_HANDLE', message: 'bad_format' }

  const visitorId = await resolveSteamId(visitorInput)
  if (!visitorId) return { status: 'INVALID_HANDLE', message: 'unknown_visitor' }

  // Steam returns an empty friend list for anything below "public", so absence
  // would look like refusal to add. Read the visibility flag before judging.
  const state = await visibility(visitorId)
  if (state === null) return { status: 'UNAVAILABLE', message: 'visibility_unreadable' }
  if (state !== 3) return { status: 'UNAVAILABLE', message: `profile_state_${state}` }

  const result = await call<{ friendslist?: { friends?: { steamid?: string }[] } }>(
    'ISteamUser/GetFriendList',
    { steamid: visitorId, relationship: 'friend' },
  )
  if (!result.ok) return { status: 'UNAVAILABLE', message: `http_${result.status}` }

  const friends = result.data.friendslist?.friends ?? []
  if (friends.some((entry) => entry.steamid === wanted)) {
    return { status: 'VERIFIED', proof: `${visitorId} is a Steam friend of ${wanted}` }
  }
  return { status: 'NOT_FOLLOWING', proof: `${visitorId} not in friends of ${wanted}` }
}

export async function isSteamConfigured(): Promise<boolean> {
  return Boolean(await configValue(VERIFICATION_SETTINGS.steamWebApiKey))
}

registerVerifier('steam', () => ({
  platformKey: 'steam',
  mode: 'HANDLE',
  parseCreator: extractSteamId,
  check,
  handleExample: 'your-profile-name',
  isConfigured: isSteamConfigured,
}))
