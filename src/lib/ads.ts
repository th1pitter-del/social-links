// Shared (client-safe) constants and types for the admin-managed ads and
// user-page header links. Server data access lives in `ads-data.ts`.

/** Slots where ad units can be rendered across the site. */
export const AD_PLACEMENTS = [
  'home-top',
  'home-bottom',
  'unlock-top',
  'unlock-bottom',
  'bio-top',
  'bio-bottom',
  'dashboard-top',
  'dashboard-bottom',
] as const

export type AdPlacement = (typeof AD_PLACEMENTS)[number]

export const AD_TYPES = ['banner', 'html', 'link'] as const
export type AdType = (typeof AD_TYPES)[number]

export const AD_NAME_MAX_LENGTH = 80
export const AD_LABEL_MAX_LENGTH = 60
export const AD_URL_MAX_LENGTH = 2048
export const AD_HTML_MAX_LENGTH = 20000
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

/** Serializable header-link shape shared by admin UI and public renderers. */
export type HeaderLinkData = {
  id: string
  label: string
  url: string
  newTab: boolean
  enabled: boolean
  position: number
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
  newTab: boolean
  enabled?: boolean
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
