/**
 * Bundled logo marks offered in Settings → Brand. Selecting one stores its
 * path in `site.logoUrl`, the same key an upload writes, so every surface that
 * renders the mark needs no extra lookup.
 */
export const BRAND_LOGO_LIBRARY = [
  { key: 'chain', src: '/brand/logos/chain-circle.svg' },
  { key: 'unlock', src: '/brand/logos/unlock-squircle.svg' },
  { key: 'key', src: '/brand/logos/key-diamond.svg' },
  { key: 'bolt', src: '/brand/logos/bolt-hex.svg' },
  { key: 'shield', src: '/brand/logos/shield-keyhole.svg' },
  { key: 'orbit', src: '/brand/logos/orbit-link.svg' },
  { key: 'spark', src: '/brand/logos/spark.svg' },
  { key: 'target', src: '/brand/logos/target.svg' },
] as const

/**
 * Bundled favicons, drawn bolder than the logo marks so they stay readable at
 * 16px. Stored in `site.faviconUrl`, like an upload.
 */
export const BRAND_FAVICON_LIBRARY = [
  { key: 'chain', src: '/brand/favicons/chain.svg' },
  { key: 'keyhole', src: '/brand/favicons/keyhole.svg' },
  { key: 'bolt', src: '/brand/favicons/bolt.svg' },
  { key: 'unlock', src: '/brand/favicons/unlock.svg' },
  { key: 'spark', src: '/brand/favicons/spark.svg' },
  { key: 'arrow', src: '/brand/favicons/arrow.svg' },
] as const

export function isBrandLogoSrc(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return BRAND_LOGO_LIBRARY.some((entry) => entry.src === trimmed)
}

export function isBrandFaviconSrc(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return BRAND_FAVICON_LIBRARY.some((entry) => entry.src === trimmed)
}
