// Shared (client-safe) constants and types for the admin-managed ads and
// user-page header links. Server data access lives in `ads-data.ts`.

import type { Locale } from '@/i18n/config'

/** Slots where ad units can be rendered across the site. */
export const AD_PLACEMENTS = [
  'home-top',
  'home-mid',
  'home-bottom',
  'page-top',
  'page-bottom',
  'unlock-top',
  'unlock-bottom',
  'bio-top',
  'bio-bottom',
  'dashboard-top',
  'dashboard-bottom',
] as const

export type AdPlacement = (typeof AD_PLACEMENTS)[number]

/**
 * Standard IAB creative size each slot is designed for. Banner images are
 * rendered in a reserved frame of this ratio, so a page never shifts when the
 * creative loads and an ad looks exactly as it would on a real network.
 */
export const AD_SLOT_SIZES: Record<AdPlacement, { width: number; height: number }> = {
  'home-top': { width: 970, height: 250 }, // billboard
  'home-mid': { width: 970, height: 250 }, // in-feed billboard
  'home-bottom': { width: 728, height: 90 }, // leaderboard
  'page-top': { width: 970, height: 250 }, // billboard
  'page-bottom': { width: 728, height: 90 }, // leaderboard
  'unlock-top': { width: 728, height: 90 }, // leaderboard
  'unlock-bottom': { width: 728, height: 90 }, // leaderboard
  'bio-top': { width: 300, height: 250 }, // medium rectangle
  'bio-bottom': { width: 320, height: 100 }, // mobile banner
  'dashboard-top': { width: 728, height: 90 }, // leaderboard
  'dashboard-bottom': { width: 728, height: 90 }, // leaderboard
}

export const AD_TYPES = ['banner', 'html', 'link'] as const
export type AdType = (typeof AD_TYPES)[number]

export const AD_NAME_MAX_LENGTH = 80
export const AD_LABEL_MAX_LENGTH = 60
export const AD_URL_MAX_LENGTH = 2048
export const AD_HTML_MAX_LENGTH = 20000
/** Site-wide ad-network snippet (loader, auto ads, verification) pasted in settings. */
export const AD_NETWORK_SCRIPT_MAX_LENGTH = 20000
export const HEADER_LINK_LABEL_MAX_LENGTH = 60

/** Serializable ad unit shape shared by admin UI and public renderers. */
export type AdUnitData = {
  id: string
  name: string
  placement: AdPlacement
  type: AdType
  label: string | null
  url: string | null
  imageUrl: string | null
  html: string | null
  newTab: boolean
  enabled: boolean
  position: number
}

/** Per-locale label text for a header link; missing locales fall back. */
export type HeaderLinkLabels = Partial<Record<Locale, string>>

/** Serializable header-link shape shared by admin UI and public renderers. */
export type HeaderLinkData = {
  id: string
  label: string
  labelKey: string | null
  labels: HeaderLinkLabels | null
  url: string
  icon: string
  color: string | null
  newTab: boolean
  enabled: boolean
  position: number
  /** Top-level menu this row appears under; null means it is a top-level menu. */
  parentId: string | null
  /** Seeded menu whose label stays locked to the site translations. */
  builtIn: boolean
}

export type AdUnitInput = {
  name: string
  placement: string
  type: string
  label?: string
  url?: string
  imageUrl?: string
  html?: string
  newTab: boolean
  enabled?: boolean
}

export type HeaderLinkInput = {
  label: string
  url: string
  icon: string
  color?: string
  newTab: boolean
  enabled?: boolean
  /** Pick a label from the site's nav catalogs instead of typed text. */
  labelKey?: string
  /** Admin-typed label per locale; empty locales fall back to English/catalog. */
  labels?: HeaderLinkLabels | null
  /** Parent menu id for a sub-link; null or omitted keeps it top-level. */
  parentId?: string | null
}

/**
 * Menu labels admins can reuse from the `nav` message catalogs. Keys are
 * resolved per locale on the public header, so the same row reads correctly
 * in every language. Anything outside this list is site chrome, not a menu.
 */
export const HEADER_MENU_KEYS = [
  'howItWorks',
  'features',
  'faqShort',
  'contact',
  'privacy',
  'terms',
  'videoCompressor',
  'videoDownloader',
] as const

export type HeaderMenuKey = (typeof HEADER_MENU_KEYS)[number]

export function isHeaderMenuKey(value: string): value is HeaderMenuKey {
  return (HEADER_MENU_KEYS as readonly string[]).includes(value)
}

/** Icon keys selectable in the admin; must match the site-nav icon map. */
export const HEADER_ICONS = [
  'link',
  'globe',
  'star',
  'gift',
  'tag',
  'rocket',
  'sparkles',
  'listChecks',
  'circleHelp',
  'minimize',
  'download',
  'play',
  'film',
  'music',
  'camera',
  'heart',
  'flame',
] as const

export type HeaderIcon = (typeof HEADER_ICONS)[number]

export const HEADER_ICON_DEFAULT: HeaderIcon = 'link'

/** Menu brand colours are plain hex like `#5182EF`; empty means default tone. */
export function isHeaderMenuColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

/**
 * Targets for ads and header links: absolute http(s) URLs or site-relative
 * paths (e.g. `/create`). Data and media API paths are accepted too.
 */
export function isUsableTargetUrl(value: string): boolean {
  const trimmed = value.trim()
  if (/^https?:\/\//.test(trimmed)) return true
  return /^\/[A-Za-z0-9?#&=/_.-]*$/.test(trimmed)
}

/**
 * Banner creatives: an http(s) image, an uploaded media file, or a static
 * image shipped in `public/` — the seeded placeholder creatives live there.
 */
export function isUsableAdImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (/^https?:\/\//.test(trimmed)) return true
  if (/^\/api\/media\/[A-Za-z0-9_-]+$/.test(trimmed)) return true
  return /^\/[A-Za-z0-9/_.-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(trimmed)
}
