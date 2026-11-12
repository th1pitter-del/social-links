import 'server-only'

import { normalizeHandle, registerOAuthVerifier, type VerifyOutcome } from './registry'
import { isGoogleConfigured } from './google-oauth'

const API = 'https://www.googleapis.com/youtube/v3'
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/
const HANDLE_RE = /^[A-Za-z0-9._-]{3,30}$/
const USERNAME_RE = /^[A-Za-z0-9._-]{2,50}$/
const CHANNEL_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be'])
const EMBED_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])

type ApiResult<T> = { ok: true; data: T } | { ok: false; reason: string }
type ResourceList = { items?: ({ id?: string } | null)[] }
type VideoRating = { items?: ({ videoId?: string; rating?: string } | null)[] }
type SubscriptionList = {
  nextPageToken?: string
  pageInfo?: { totalResults?: number }
  items?: ({ snippet?: { resourceId?: { channelId?: string } } } | null)[]
}
type ChannelQuery = { field: 'id' | 'forHandle' | 'forUsername'; value: string }

async function apiOAuth<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<ApiResult<T>> {
  if (!accessToken?.trim()) return { ok: false, reason: 'access_token_required' }
  const url = new URL(`${API}/${path}`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
    })
    const body = (await response.json().catch(() => null)) as
      | (T & { error?: { errors?: { reason?: string }[] } })
      | null
    if (!response.ok || body?.error) {
      const reason = body?.error?.errors?.[0]?.reason
      return { ok: false, reason: typeof reason === 'string' ? reason : `http_${response.status}` }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, reason: 'response_unreadable' }
    }
    return { ok: true, data: body }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

function targetUrl(value: string): URL | null {
  if (!value || /[\s\\]/.test(value)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password || url.port) return null
    return url
  } catch {
    return null
  }
}

/** A video link (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`) to its id. */
export function extractYoutubeVideo(value: string): string | null {
  const url = targetUrl(value.trim())
  if (!url) return null
  const host = url.hostname.toLowerCase()
  let id: string | null = null
  if (SHORT_HOSTS.has(host)) {
    id = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null
  } else if (CHANNEL_HOSTS.has(host)) {
    if (/^\/watch\/?$/.test(url.pathname)) id = url.searchParams.get('v')
    else id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)\/?$/)?.[1] ?? null
  } else if (EMBED_HOSTS.has(host)) {
    id = url.pathname.match(/^\/embed\/([^/]+)\/?$/)?.[1] ?? null
  }
  return id && VIDEO_ID_RE.test(id) ? id : null
}

/** Resolve a creator channel only; the visitor is identified exclusively by OAuth. */
export function parseCreatorChannel(value: string): ChannelQuery | null {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (CHANNEL_ID_RE.test(trimmed)) return { field: 'id', value: trimmed }

  if (trimmed.includes('/') || trimmed.includes(':')) {
    const url = targetUrl(trimmed)
    if (!url || !CHANNEL_HOSTS.has(url.hostname.toLowerCase())) return null
    const channel = url.pathname.match(/^\/channel\/([^/]+)\/?$/)?.[1]
    if (channel) return CHANNEL_ID_RE.test(channel) ? { field: 'id', value: channel } : null
    const handle = url.pathname.match(/^\/@([^/]+)\/?$/)?.[1]
    if (handle) return HANDLE_RE.test(handle) ? { field: 'forHandle', value: handle } : null
    const username = url.pathname.match(/^\/user\/([^/]+)\/?$/)?.[1]
    if (username) return USERNAME_RE.test(username) ? { field: 'forUsername', value: username } : null
    // Legacy /c/ custom URLs do not reliably map to the same modern handle.
    return null
  }

  const handle = normalizeHandle(trimmed)
  return HANDLE_RE.test(handle) ? { field: 'forHandle', value: handle } : null
}

async function checkLike(accessToken: string, videoId: string): Promise<VerifyOutcome> {
  if (!VIDEO_ID_RE.test(videoId)) return { status: 'UNAVAILABLE', message: 'invalid_target' }
  const video = await apiOAuth<ResourceList>('videos', { part: 'id', id: videoId }, accessToken)
  if (!video.ok) return { status: 'UNAVAILABLE', message: video.reason }
  if (!Array.isArray(video.data.items)) return { status: 'UNAVAILABLE', message: 'video_unreadable' }
  if (!video.data.items.some((item) => item?.id === videoId)) {
    return { status: 'UNAVAILABLE', message: 'unknown_video' }
  }

  const rating = await apiOAuth<VideoRating>('videos/getRating', { id: videoId }, accessToken)
  if (!rating.ok) return { status: 'UNAVAILABLE', message: rating.reason }
  const value = Array.isArray(rating.data.items)
    ? rating.data.items.find((item) => item?.videoId === videoId)?.rating
    : undefined
  if (value === 'like') {
    return { status: 'VERIFIED', proof: `visitor liked youtube video ${videoId}` }
  }
  if (value === 'none' || value === 'dislike') {
    return { status: 'NOT_FOLLOWING', proof: `visitor has not liked youtube video ${videoId}` }
  }
  return { status: 'UNAVAILABLE', message: 'rating_unreadable' }
}

async function checkSubscribe(accessToken: string, target: string): Promise<VerifyOutcome> {
  const query = parseCreatorChannel(target)
  if (!query) return { status: 'UNAVAILABLE', message: 'invalid_target' }
  const channel = await apiOAuth<ResourceList>(
    'channels',
    { part: 'id', [query.field]: query.value },
    accessToken,
  )
  if (!channel.ok) return { status: 'UNAVAILABLE', message: channel.reason }
  if (!Array.isArray(channel.data.items)) return { status: 'UNAVAILABLE', message: 'channel_unreadable' }
  const channelId = channel.data.items[0]?.id
  if (typeof channelId !== 'string' || !CHANNEL_ID_RE.test(channelId)) {
    return { status: 'UNAVAILABLE', message: 'unknown_creator' }
  }
  if (query.field === 'id' && query.value !== channelId) {
    return { status: 'UNAVAILABLE', message: 'channel_mismatch' }
  }

  const subscriptions = await apiOAuth<SubscriptionList>(
    'subscriptions',
    { part: 'snippet', mine: 'true', forChannelId: channelId, maxResults: '1' },
    accessToken,
  )
  if (!subscriptions.ok) return { status: 'UNAVAILABLE', message: subscriptions.reason }
  const items = subscriptions.data.items
  if (!Array.isArray(items)) return { status: 'UNAVAILABLE', message: 'subscriptions_unreadable' }
  if (items.some((item) => item?.snippet?.resourceId?.channelId === channelId)) {
    return { status: 'VERIFIED', proof: `visitor subscribed to youtube channel ${channelId}` }
  }
  if (items.length || subscriptions.data.nextPageToken || (subscriptions.data.pageInfo?.totalResults ?? 0) > 0) {
    return { status: 'UNAVAILABLE', message: 'subscriptions_unreadable' }
  }
  return { status: 'NOT_FOLLOWING', proof: `visitor is not subscribed to youtube channel ${channelId}` }
}

async function checkOAuth(
  accessToken: string,
  creator: string,
  actionType: string,
): Promise<VerifyOutcome> {
  if (!accessToken?.trim()) return { status: 'UNAVAILABLE', message: 'access_token_required' }
  if (actionType === 'YOUTUBE_LIKE') return checkLike(accessToken, creator)
  if (actionType === 'YOUTUBE_SUBSCRIBE') return checkSubscribe(accessToken, creator)
  return { status: 'UNAVAILABLE', message: 'unsupported_action' }
}

registerOAuthVerifier(() => ({
  platformKey: 'youtube',
  provider: 'google',
  actionTypes: ['YOUTUBE_LIKE', 'YOUTUBE_SUBSCRIBE'],
  parseCreator(target, actionType) {
    if (actionType === 'YOUTUBE_LIKE') return extractYoutubeVideo(target)
    if (actionType === 'YOUTUBE_SUBSCRIBE') return parseCreatorChannel(target) ? target.trim() : null
    return null
  },
  check: checkOAuth,
  isConfigured: isGoogleConfigured,
}))
