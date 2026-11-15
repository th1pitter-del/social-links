/**
 * Pure theme-color helpers shared by the server (CSS override + settings) and
 * the admin previews. Kept free of server imports so client components can
 * derive the same tokens the site actually renders.
 */

export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

/**
 * Admin-configurable theme colors, per color mode. Defaults mirror the shipped
 * Pulse palette in `globals.css`.
 */
export const DEFAULT_THEME = {
  light: { primary: '#c9f72a', background: '#f6f7f2', accentText: '#5f7a0a' },
  dark: { primary: '#d5ff2f', background: '#050505', accentText: '#d5ff2f' },
} as const

export const THEME_KEYS = [
  'theme.light.primary',
  'theme.light.background',
  'theme.light.accentText',
  'theme.dark.primary',
  'theme.dark.background',
  'theme.dark.accentText',
] as const

/** Returns a normalized lowercase hex color, or null when invalid. */
export function sanitizeHex(value: string | undefined | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ''
  return HEX_PATTERN.test(trimmed) ? trimmed : null
}

function channel(hex: string, offset: number) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

/** Relative luminance (WCAG) of a `#rrggbb` color, 0 (dark) to 1 (light). */
function luminance(hex: string) {
  const [r, g, b] = [channel(hex, 1), channel(hex, 3), channel(hex, 5)].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Picks dark or light text so `--primary-foreground` stays legible. */
export function foregroundFor(hex: string) {
  return luminance(hex) > 0.45 ? '#171812' : '#ffffff'
}

/** Scales a hex color toward black (factor < 1) or white (factor > 1). */
export function shade(hex: string, factor: number) {
  const target = factor < 1 ? 0 : 255
  const mix = (c: number) => Math.round(c + (target - c) * Math.abs(1 - factor))
  const [r, g, b] = [channel(hex, 1), channel(hex, 3), channel(hex, 5)].map(mix)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export type ThemeSettings = {
  light: { primary: string; background: string; accentText: string }
  dark: { primary: string; background: string; accentText: string }
}

/** Sanitized theme colors with defaults filled in from the DB map. */
export function getThemeSettings(map: Record<string, string>): ThemeSettings {
  const pick = (key: keyof (typeof DEFAULT_THEME)['light'], area: 'light' | 'dark') =>
    sanitizeHex(map[`theme.${area}.${key}`]) ?? DEFAULT_THEME[area][key]
  return {
    light: {
      primary: pick('primary', 'light'),
      background: pick('background', 'light'),
      accentText: pick('accentText', 'light'),
    },
    dark: {
      primary: pick('primary', 'dark'),
      background: pick('background', 'dark'),
      accentText: pick('accentText', 'dark'),
    },
  }
}

export function themeMatchesDefaults(theme: ThemeSettings) {
  return (
    theme.light.primary === DEFAULT_THEME.light.primary &&
    theme.light.background === DEFAULT_THEME.light.background &&
    theme.light.accentText === DEFAULT_THEME.light.accentText &&
    theme.dark.primary === DEFAULT_THEME.dark.primary &&
    theme.dark.background === DEFAULT_THEME.dark.background &&
    theme.dark.accentText === DEFAULT_THEME.dark.accentText
  )
}

/**
 * Builds a `<style>` body overriding the theme color tokens. Uses
 * `html:root` / `html:root.dark` selectors, which out-specify the `:root` and
 * `.dark` rules in `globals.css`. Returns '' when everything is default so no
 * extra CSS ships.
 *
 * These tokens are content tokens only: the admin console gets the same
 * light/dark values as the rest of the app and keeps its permanently dark
 * sidebar from the static `.admin-theme` rule in `globals.css`.
 */
export function getThemeOverrideCss(map: Record<string, string>): string {
  const theme = getThemeSettings(map)
  if (themeMatchesDefaults(theme)) return ''

  const light = [
    `--primary:${theme.light.primary}`,
    `--primary-foreground:${foregroundFor(theme.light.primary)}`,
    `--background:${theme.light.background}`,
    `--ring:${shade(theme.light.primary, 0.78)}`,
    `--accent-text:${theme.light.accentText}`,
    `--sidebar-primary:${theme.light.primary}`,
    `--sidebar-ring:${shade(theme.light.primary, 0.78)}`,
  ].join(';')
  const dark = [
    `--primary:${theme.dark.primary}`,
    `--primary-foreground:${foregroundFor(theme.dark.primary)}`,
    `--background:${theme.dark.background}`,
    `--ring:${theme.dark.primary}`,
    `--accent-text:${theme.dark.accentText}`,
    `--sidebar-primary:${theme.dark.primary}`,
    `--sidebar-primary-foreground:${foregroundFor(theme.dark.primary)}`,
    `--sidebar-ring:${theme.dark.primary}`,
  ].join(';')

  return `html:root{${light}}html:root.dark{${dark}}`
}
