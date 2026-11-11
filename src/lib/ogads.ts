import 'server-only'

import { cache } from 'react'
import { timingSafeEqual } from 'node:crypto'
import { headers } from 'next/headers'

import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/seo'

/**
 * OGAds offer step.
 *
 * The Offer API selects offers from the visitor's IP and User-Agent and bakes
 * the `aff_sub4` value we pass into every smartlink it returns, so the request
 * that mints a link must carry the unlock session id. That is why only sessions
 * with no aff_sub are cached: a cached link would credit the wrong session.
 */

export const OGADS_DEFAULT_ENDPOINT = 'https://lockerpreview.com/api/v2'
export const OGADS_DEFAULT_OFFERS_SHOWN = 3
export const OGADS_MAX_OFFERS_SHOWN = 10

export type OgadsConfig = {
  enabled: boolean
  apiKey: string
  endpoint: string
  affiliateId: string
  /** Bitwise offer categories (1 CPI, 2 CPA, 4 PIN, 8 VID); empty = all. */
  ctype: string
  offersShown: number
  postbackSecret: string
}

/** Settings sent to the browser as-is; the key and postback secret never are. */
export const OGADS_SETTING_KEYS = [
  'ogads.enabled',
  'ogads.apiKey',
  'ogads.endpoint',
  'ogads.affiliateId',
  'ogads.ctype',
  'ogads.offersShown',
  'ogads.postbackSecret',
  'ogads.postbackUrl',
] as const

export type OgadsOffer = {
  id: string
  name: string
}

type OgadsOfferWithLink = OgadsOffer & { link: string }

export type OgadsErrorKind = 'not_configured' | 'auth' | 'upstream' | 'network' | 'bad_response'

export class OgadsError extends Error {
  constructor(
    readonly kind: OgadsErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'OgadsError'
  }
}

/**
 * Admin-managed configuration, read once per request. The panel is the only
 * place these live; the API key and postback secret are never rendered back.
 */
export const getOgadsConfig = cache(async (): Promise<OgadsConfig> => {
  let rows: Array<{ key: string; value: string }> = []
  try {
    rows = await prisma.setting.findMany({
      where: { key: { startsWith: 'ogads.' } },
      select: { key: true, value: true },
    })
  } catch {
    // Settings unavailable (e.g. static generation): behave as switched off.
  }
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const parsedOffers = Number.parseInt(map['ogads.offersShown'] ?? '', 10)
  const offersShown =
    Number.isFinite(parsedOffers) && parsedOffers > 0
      ? Math.min(parsedOffers, OGADS_MAX_OFFERS_SHOWN)
      : OGADS_DEFAULT_OFFERS_SHOWN

  return {
    enabled: map['ogads.enabled'] === 'true',
    apiKey: map['ogads.apiKey']?.trim() ?? '',
    endpoint: map['ogads.endpoint']?.trim() || OGADS_DEFAULT_ENDPOINT,
    affiliateId: map['ogads.affiliateId']?.trim() ?? '',
    ctype: map['ogads.ctype']?.trim() ?? '',
    offersShown,
    postbackSecret: map['ogads.postbackSecret']?.trim() ?? '',
  }
})

/** Offers can only be shown when the feature is on, keyed and pointed at an API. */
export function isOgadsReady(config: OgadsConfig): boolean {
  return config.enabled && config.apiKey.length > 0 && config.offersShown > 0
}

/** The visitor identity OGAds targets offers with, taken from the proxy headers. */
export async function getVisitorTargeting(): Promise<{
  ip: string | null
  userAgent: string | null
}> {
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')
  return {
    ip: forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? null,
    userAgent: headerList.get('user-agent'),
  }
}

export function ogadsPostbackUrl(config: OgadsConfig): string {
  // Macros are left unencoded: OGAds only substitutes the exact {name} tokens,
  // and a %7B-escaped brace is just text to it.
  const query = [
    `secret=${encodeURIComponent(config.postbackSecret)}`,
    'affiliate_id={affiliate_id}',
    'offer_id={offer_id}',
    'offer_name={offer_name}',
    'payout={payout}',
    'aff_sub4={aff_sub4}',
    'session_ip={session_ip}',
    'datetime={datetime}',
  ].join('&')
  return `${SITE_URL}/api/ogads/postback?${query}`
}

export function verifyOgadsSecret(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false
  const given = Buffer.from(provided)
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want)
}

export function isChargebackStatus(status: string | null): boolean {
  const value = status?.toLowerCase() ?? ''
  return (
    value.includes('chargeback') ||
    value.includes('reject') ||
    value.includes('reversed') ||
    value.includes('declined')
  )
}

export function parseOgadsPayout(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value.replace(',', '.').trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** The offers a session showed, read back from its JSON snapshot. */
export function readStoredOffers(value: unknown): OgadsOffer[] {
  if (!Array.isArray(value)) return []
  const offers: OgadsOffer[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string' || !record.id) continue
    offers.push({
      id: record.id,
      name: typeof record.name === 'string' && record.name ? record.name : record.id,
    })
  }
  return offers
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOffer(raw: unknown): OgadsOfferWithLink | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const id = text(record.offerid) || text(record.offer_id) || text(record.id)
  const link = text(record.link) || text(record.url)
  if (!id || !link) return null
  const name = text(record.name) || text(record.name_short) || id
  return { id, name: name.slice(0, 120), link }
}

export async function fetchOgadsOffers(input: {
  ip: string | null
  userAgent: string | null
  /** The unlock session id OGAds echoes back as aff_sub4. Empty for previews. */
  affSub4?: string
}): Promise<OgadsOfferWithLink[]> {
  const config = await getOgadsConfig()
  if (!isOgadsReady(config)) throw new OgadsError('not_configured', 'OGAds is not configured')
  if (!input.ip || !input.userAgent) {
    throw new OgadsError('network', 'Visitor IP and user agent are required for offer targeting')
  }

  const endpoint = new URL(config.endpoint)
  endpoint.searchParams.set('ip', input.ip)
  endpoint.searchParams.set('user_agent', input.userAgent)
  endpoint.searchParams.set('max', String(config.offersShown))
  if (config.ctype) endpoint.searchParams.set('ctype', config.ctype)

  if (input.affSub4) {
    // The API bakes this into every link it returns, which is how the postback
    // finds the unlock session. Cached responses must never carry one.
    endpoint.searchParams.set('aff_sub4', input.affSub4)
  } else {
    const cached = readPreviewCache(endpoint.toString())
    if (cached) return cached
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(input.affSub4 ? 6000 : 3500),
    })
  } catch (error) {
    throw new OgadsError(
      'network',
      error instanceof Error ? `${error.name}: ${error.message}` : 'offer request failed',
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new OgadsError('auth', `OGAds rejected the API key (HTTP ${response.status})`)
  }
  if (!response.ok) {
    throw new OgadsError('upstream', `OGAds returned HTTP ${response.status}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new OgadsError('bad_response', 'OGAds response was not JSON')
  }
  if (!payload || typeof payload !== 'object' || (payload as { success?: unknown }).success !== true) {
    throw new OgadsError('bad_response', 'OGAds response did not report success')
  }
  const rawOffers = (payload as { offers?: unknown }).offers
  if (!Array.isArray(rawOffers)) {
    throw new OgadsError('bad_response', 'OGAds response had no offers array')
  }

  const offers = rawOffers
    .map(normalizeOffer)
    .filter((offer): offer is OgadsOfferWithLink => offer !== null)
    .slice(0, config.offersShown)

  if (!input.affSub4) writePreviewCache(endpoint.toString(), offers)
  return offers
}

/** Offers are picked per visitor; this only spares the API identical pageviews. */
const PREVIEW_TTL_MS = 90_000
const PREVIEW_CACHE_LIMIT = 300
const previewCache = new Map<string, { offers: OgadsOfferWithLink[]; expiresAt: number }>()

function readPreviewCache(key: string): OgadsOfferWithLink[] | null {
  const hit = previewCache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    previewCache.delete(key)
    return null
  }
  return hit.offers
}

function writePreviewCache(key: string, offers: OgadsOfferWithLink[]) {
  if (previewCache.size >= PREVIEW_CACHE_LIMIT) {
    const oldest = previewCache.keys().next().value
    if (oldest) previewCache.delete(oldest)
  }
  previewCache.set(key, { offers, expiresAt: Date.now() + PREVIEW_TTL_MS })
}
