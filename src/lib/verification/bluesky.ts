import 'server-only'

import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://public.api.bsky.app/xrpc'
// The XRPC endpoint rejects a limit above 100 for this query.
const PAGE_SIZE = 100
const MAX_PAGES = 20

async function getJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
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

type ResolveHandleResult = { did?: string }
type GetFollowsResult = { follows?: { did?: string }[]; cursor?: string }

/** Handle → DID. Returns null when the account does not exist. */
async function resolveDid(handle: string): Promise<string | null> {
  const result = await getJson<ResolveHandleResult>(
    `${API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  )
  if (!result.ok) return null
  return result.data.did ?? null
}

export function extractBlueskyHandle(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/bsky\.app\/profile\/([^/?#]+)/i)
  const candidate = fromUrl ? fromUrl[1] : trimmed
  const handle = normalizeHandle(decodeURIComponent(candidate)).toLowerCase()
  // A DID is a valid actor for the API but never a handle someone should type.
  if (/^did:/.test(handle)) return handle
  return /^[a-z0-9.-]+\.[a-z0-9.-]*[a-z]$/.test(handle) ? handle : null
}

async function check(visitorHandle: string, creatorHandle: string): Promise<VerifyOutcome> {
  const visitorDid = await resolveDid(visitorHandle)
  if (!visitorDid) {
    return { status: 'INVALID_HANDLE', message: 'unknown_visitor' }
  }
  const creatorDid = await resolveDid(creatorHandle)
  if (!creatorDid) {
    return { status: 'INVALID_HANDLE', message: 'unknown_creator' }
  }

  let cursor: string | undefined
  let exhausted = false
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url =
      `${API}/app.bsky.graph.getFollows?actor=${encodeURIComponent(visitorDid)}` +
      `&limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const result = await getJson<GetFollowsResult>(url)
    if (!result.ok) {
      // A failed page must never be reported as "did not follow".
      return { status: 'UNAVAILABLE', message: `http_${result.status}` }
    }
    const follows = result.data.follows ?? []
    if (follows.some((entry) => entry.did === creatorDid)) {
      return { status: 'VERIFIED', proof: `${visitorHandle} follows ${creatorHandle}` }
    }
    cursor = result.data.cursor
    if (!cursor) {
      exhausted = true
      break
    }
  }

  if (!exhausted) {
    // The visitor follows more accounts than we scanned; absence proves nothing.
    return { status: 'UNAVAILABLE', message: 'follows_list_too_long' }
  }

  return { status: 'NOT_FOLLOWING', proof: `${visitorHandle} not in follows of ${creatorHandle}` }
}

registerVerifier('bluesky', () => ({
  platformKey: 'bluesky',
  mode: 'HANDLE',
  parseCreator: extractBlueskyHandle,
  check,
  // The follow list is public, so no credential is needed to read it.
  isConfigured: async () => true,
}))
