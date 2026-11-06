import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'
import {
  normalizeHandle,
  registerOAuthVerifier,
  registerVerifier,
  type VerifyOutcome,
} from './registry'
import { isGoogleConfigured } from './google-oauth'

const API = 'https://www.googleapis.com/youtube/v3'
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/
const HANDLE_RE = /^[A-Za-z0-9._-]{3,30}$/
const USERNAME_RE = /^[A-Za-z0-9._-]{2,50}$/
const PAGE_SIZE = 100
// Five pages is 500 newest comments: enough for the step to be provable on an
// active video without letting one confirmation burn the daily quota.
const MAX_PAGES = 5

/**
 * A comment can be proven from the public record without the visitor signing in.
 * A like or a subscription leaves no public trace, so those are proven from the
 * visitor's own Google account instead (see the OAuth verifier below).
 */
const PROVABLE_ACTIONS = ['YOUTUBE_COMMENT'] as const
const ACCOUNT_PROVABLE_ACTIONS = ['YOUTUBE_LIKE', 'YOUTUBE_SUBSCRIBE'] as const

type ApiFailure = { ok: false; reason: string }
type ApiResult<T> = { ok: true; data: T } | ApiFailure

type ChannelList = { items?: { id?: string }[] }

type VideoRating = { items?: { videoId?: string; rating?: string }[] }

type SubscriptionList = {
  pageInfo?: { totalResults?: number }
  items?: unknown[]
}

type CommentThreadList = {
  nextPageToken?: string
  items?: {
    snippet?: {
      topLevelComment?: {
        snippet?: { authorChannelId?: { value?: string } }
      }
    }
  }[]
}

async function api<T>(
  path: string,
  params: Record<string, string | undefined>,
  key: string,
): Promise<ApiResult<T>> {
  const url = new URL(`${API}/${path}`)
  url.searchParams.set('key', key)
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value)
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    })
    const body = (await response.json().catch(() => null)) as
      | (T & { error?: { errors?: { reason?: string }[] } })
      | null
    if (!response.ok) {
      // Google names the failure in the body; `commentsDisabled` and
      // `quotaExceeded` decide whether the visitor is at fault (they are not).
      return {
        ok: false,
        reason: body?.error?.errors?.[0]?.reason ?? `http_${response.status}`,
      }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** Same calls, but against the visitor's own account instead of the public API key. */
async function apiOAuth<T>(
  path: string,
  params: Record<string, string | undefined>,
  accessToken: string,
): Promise<ApiResult<T>> {
  const url = new URL(`${API}/${path}`)
  for (const [name, value] of Object.entries(params)) {
    if (value) url.searchParams.set(name, value)
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    })
    const body = (await response.json().catch(() => null)) as
      | (T & { error?: { errors?: { reason?: string }[] } })
      | null
    if (!response.ok) {
      return {
        ok: false,
        reason: body?.error?.errors?.[0]?.reason ?? `http_${response.status}`,
      }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

function validVideoId(value: string | null | undefined): string | null {
  return value && VIDEO_ID_RE.test(value) ? value : null
}

/** A video link (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`) → its id. */
export function extractYoutubeVideo(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') return validVideoId(path[0])
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com' && !host.endsWith('.youtube.com')) {
    return null
  }
  if (path[0] === 'watch') return validVideoId(url.searchParams.get('v'))
  if (path[0] === 'shorts' || path[0] === 'embed' || path[0] === 'live' || path[0] === 'v') {
    return validVideoId(path[1])
  }
  return null
}

type VisitorQuery = { field: 'id' | 'forHandle' | 'forUsername'; value: string }

/** A channel link, `@handle` or bare handle → the lookup that resolves its id. */
export function parseVisitorChannel(value: string): VisitorQuery | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (CHANNEL_ID_RE.test(trimmed)) return { field: 'id', value: trimmed }

  const looksLikeUrl = /^https?:\/\//i.test(trimmed) || /^(www\.|m\.)?youtube\.com\//i.test(trimmed)
  if (looksLikeUrl) {
    let url: URL
    try {
      url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    } catch {
      return null
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return null

    const path = url.pathname.split('/').filter(Boolean)
    const first = path[0] ?? ''
    if (first === 'channel') {
      return path[1] && CHANNEL_ID_RE.test(path[1]) ? { field: 'id', value: path[1] } : null
    }
    if (first.startsWith('@')) {
      const handle = first.slice(1)
      return HANDLE_RE.test(handle) ? { field: 'forHandle', value: handle } : null
    }
    if (first === 'user') {
      return path[1] && USERNAME_RE.test(path[1])
        ? { field: 'forUsername', value: path[1] }
        : null
    }
    if (first === 'c') {
      return path[1] && HANDLE_RE.test(path[1])
        ? { field: 'forHandle', value: path[1] }
        : null
    }
    return null
  }

  const handle = normalizeHandle(trimmed)
  return HANDLE_RE.test(handle) ? { field: 'forHandle', value: handle } : null
}

async function check(visitorHandle: string, videoId: string): Promise<VerifyOutcome> {
  const key = await configValue(VERIFICATION_SETTINGS.youtubeApiKey)
  if (!key) return { status: 'UNAVAILABLE', message: 'key_not_configured' }

  const query = parseVisitorChannel(visitorHandle)
  if (!query) return { status: 'INVALID_HANDLE', message: 'bad_format' }

  const channel = await api<ChannelList>('channels', { part: 'id', [query.field]: query.value }, key)
  if (!channel.ok) return { status: 'UNAVAILABLE', message: channel.reason }

  // Without an id there is nothing to match comments against; the handle may
  // still belong to a person who commented, so this is never a refusal.
  const visitorId = channel.data.items?.[0]?.id
  if (!visitorId) return { status: 'INVALID_HANDLE', message: 'unknown_visitor' }

  let pageToken: string | undefined
  let scanned = 0
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const threads = await api<CommentThreadList>(
      'commentThreads',
      {
        part: 'snippet',
        videoId,
        maxResults: String(PAGE_SIZE),
        order: 'time',
        textFormat: 'plaintext',
        pageToken,
      },
      key,
    )
    if (!threads.ok) return { status: 'UNAVAILABLE', message: threads.reason }

    const items = threads.data.items ?? []
    scanned += items.length

    const found = items.some(
      (item) => item.snippet?.topLevelComment?.snippet?.authorChannelId?.value === visitorId,
    )
    if (found) {
      return { status: 'VERIFIED', proof: `${visitorId} commented on youtube video ${videoId}` }
    }

    pageToken = threads.data.nextPageToken
    if (!pageToken) {
      // The list ended, so no visible comment from this channel exists on the
      // video. Replies are not listed here; the proof says exactly what was read.
      return {
        status: 'NOT_FOLLOWING',
        proof: `${visitorId} has no visible comment on youtube video ${videoId} (${scanned} checked)`,
      }
    }
  }

  // Older comments exist beyond what we scanned, so absence proves nothing.
  return { status: 'UNAVAILABLE', message: 'comment_scan_truncated' }
}

export async function isYoutubeConfigured(): Promise<boolean> {
  return Boolean(await configValue(VERIFICATION_SETTINGS.youtubeApiKey))
}

/**
 * A like leaves no public record, so it is read back from the visitor's own
 * account: `videos/getRating` answers for the signed-in user only.
 */
async function checkLike(accessToken: string, videoId: string): Promise<VerifyOutcome> {
  const rating = await apiOAuth<VideoRating>('videos/getRating', { id: videoId }, accessToken)
  if (!rating.ok) return { status: 'UNAVAILABLE', message: rating.reason }

  const value = rating.data.items?.[0]?.rating
  // No rating item means Google could not answer for this video; that is a
  // lookup problem, not a reason to tell the visitor they did not act.
  if (!value) return { status: 'UNAVAILABLE', message: 'rating_unreadable' }
  if (value === 'like') {
    return { status: 'VERIFIED', proof: `visitor liked youtube video ${videoId}` }
  }
  return { status: 'NOT_FOLLOWING', proof: `visitor has not liked youtube video ${videoId}` }
}

/**
 * Subscriptions are private to the subscriber, so the check lists the signed-in
 * visitor's subscriptions filtered to the link owner's channel.
 */
async function checkSubscribe(accessToken: string, target: string): Promise<VerifyOutcome> {
  const query = parseVisitorChannel(target)
  if (!query) return { status: 'INVALID_HANDLE', message: 'bad_format' }

  const channel = await apiOAuth<ChannelList>(
    'channels',
    { part: 'id', [query.field]: query.value },
    accessToken,
  )
  if (!channel.ok) return { status: 'UNAVAILABLE', message: channel.reason }

  const channelId = channel.data.items?.[0]?.id
  if (!channelId) return { status: 'INVALID_HANDLE', message: 'unknown_creator' }

  const subscriptions = await apiOAuth<SubscriptionList>(
    'subscriptions',
    { part: 'snippet', mine: 'true', forChannelId: channelId, maxResults: '1' },
    accessToken,
  )
  if (!subscriptions.ok) return { status: 'UNAVAILABLE', message: subscriptions.reason }

  const total = subscriptions.data.pageInfo?.totalResults ?? subscriptions.data.items?.length ?? 0
  if (total > 0) {
    return { status: 'VERIFIED', proof: `visitor subscribed to youtube channel ${channelId}` }
  }
  return { status: 'NOT_FOLLOWING', proof: `visitor is not subscribed to youtube channel ${channelId}` }
}

async function checkOAuth(
  accessToken: string,
  creator: string,
  actionType: string,
): Promise<VerifyOutcome> {
  if (actionType === 'YOUTUBE_LIKE') return checkLike(accessToken, creator)
  if (actionType === 'YOUTUBE_SUBSCRIBE') return checkSubscribe(accessToken, creator)
  return { status: 'UNAVAILABLE', message: 'unsupported_action' }
}

registerVerifier('youtube', () => ({
  platformKey: 'youtube',
  mode: 'HANDLE',
  actionTypes: PROVABLE_ACTIONS,
  parseCreator: extractYoutubeVideo,
  check,
  handleExample: '@yourhandle',
  isConfigured: isYoutubeConfigured,
}))

registerOAuthVerifier(() => ({
  platformKey: 'youtube',
  provider: 'google',
  actionTypes: ACCOUNT_PROVABLE_ACTIONS,
  parseCreator(target, actionType) {
    if (actionType === 'YOUTUBE_LIKE') return extractYoutubeVideo(target)
    if (actionType === 'YOUTUBE_SUBSCRIBE') return target.trim() || null
    return null
  },
  check: checkOAuth,
  isConfigured: isGoogleConfigured,
}))
