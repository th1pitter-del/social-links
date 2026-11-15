import 'server-only'

import { cache } from 'react'
import { getLocale, getMessages } from 'next-intl/server'

import { isLocale, locales, type Locale } from '@/i18n/config'
import {
  BRAND_NAME_SPLIT_MAX,
  DEFAULT_BRAND_NAME_STYLE,
  type BrandNameStyle,
} from '@/lib/brand-name'
import { isBrandMarkIcon } from '@/lib/brand-mark-icons'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PAGE_CONTENT } from '@/lib/default-page-content'


export const DEFAULT_SITE_NAME = 'Link Unlocker'
export const DEFAULT_TAGLINE = 'Free social unlock links'

export const CONTENT_PAGES = ['faq', 'privacy', 'terms', 'contact'] as const
export type ContentPage = (typeof CONTENT_PAGES)[number]

/**
 * Site identity and search-appearance keys that every locale may override.
 * The base key holds the English copy and is the fallback for other locales
 * (`site.tagline` → `site.tagline.es`).
 */
export const SITE_LOCALIZED_KEYS = [
  'site.name',
  'site.tagline',
  'site.seoTitle',
  'site.seoDescription',
  'site.seoImage',
  'site.seoIcon',
] as const

export const DEFAULT_CONTENT: Record<ContentPage, string> = DEFAULT_PAGE_CONTENT

type LocalizedDefaults = {
  name: string
  tagline: string
  content: Partial<Record<ContentPage, string>>
}

/**
 * Locale-aware fallbacks read from the message catalogs (`site.name`,
 * `site.tagline` and `pages.<page>.content`). Falls back to the shipped
 * English defaults when the catalogs are unavailable (e.g. outside a request
 * scope).
 */
async function getLocalizedDefaults(): Promise<LocalizedDefaults> {
  try {
    const messages = await getMessages()
    const site = messages.site as { name?: string; tagline?: string } | undefined
    const pages = messages.pages as
      | Partial<Record<ContentPage, { content?: string }>>
      | undefined
    return {
      name: site?.name?.trim() || DEFAULT_SITE_NAME,
      tagline: site?.tagline?.trim() || DEFAULT_TAGLINE,
      content: {
        faq: pages?.faq?.content,
        privacy: pages?.privacy?.content,
        terms: pages?.terms?.content,
        contact: pages?.contact?.content,
      },
    }
  } catch {
    return { name: DEFAULT_SITE_NAME, tagline: DEFAULT_TAGLINE, content: {} }
  }
}


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

/** Built-in default for a `theme.*` setting key, or null when not a theme key. */
export function defaultThemeValue(key: string): string | null {
  switch (key) {
    case 'theme.light.primary':
      return DEFAULT_THEME.light.primary
    case 'theme.light.background':
      return DEFAULT_THEME.light.background
    case 'theme.light.accentText':
      return DEFAULT_THEME.light.accentText
    case 'theme.dark.primary':
      return DEFAULT_THEME.dark.primary
    case 'theme.dark.background':
      return DEFAULT_THEME.dark.background
    case 'theme.dark.accentText':
      return DEFAULT_THEME.dark.accentText
    default:
      return null
  }
}

export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export const DEFAULT_STEP_HOLD_SECONDS = 3
export const STEP_HOLD_MAX_SECONDS = 15

/**
 * How long a pressed unlock step shows its spinner before it reads as
 * completed. The admin sets it in whole seconds; 0 turns the hold off.
 */
export function getStepHoldMs(map: Record<string, string>): number {
  const raw = map['unlock.stepHoldSeconds']?.trim()
  const parsed = raw ? Number(raw) : DEFAULT_STEP_HOLD_SECONDS
  const seconds = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), 0), STEP_HOLD_MAX_SECONDS)
    : DEFAULT_STEP_HOLD_SECONDS
  return seconds * 1000
}

/** Shipped default for a settings field, as the admin form should show it. */
export function defaultSettingValue(key: string): string | null {
  if (key === 'unlock.stepHoldSeconds') return String(DEFAULT_STEP_HOLD_SECONDS)
  if (key === 'brand.splitChars') return String(DEFAULT_BRAND_NAME_STYLE.splitChars)
  return defaultThemeValue(key)
}

/** Returns a normalized lowercase hex color, or null when invalid. */
export function sanitizeHex(value: string | undefined | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ''
  return HEX_PATTERN.test(trimmed) ? trimmed : null
}

/** Brand name colors and single-word split, sanitized from the DB map. */
export function getBrandNameStyle(map: Record<string, string>): BrandNameStyle {
  const raw = map['brand.splitChars']?.trim()
  const parsed = raw ? Number(raw) : DEFAULT_BRAND_NAME_STYLE.splitChars
  const splitChars = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), 0), BRAND_NAME_SPLIT_MAX)
    : DEFAULT_BRAND_NAME_STYLE.splitChars
  return {
    color1: sanitizeHex(map['brand.color1']) ?? '',
    color2: sanitizeHex(map['brand.color2']) ?? '',
    splitChars,
  }
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
function shade(hex: string, factor: number) {
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

function themeMatchesDefaults(theme: ThemeSettings) {
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

/**
 * Reads admin-managed settings once per request. Falls back to defaults so the
 * public site always renders even before an administrator configures anything.
 */
export const getSettingMap = cache(async (): Promise<Record<string, string>> => {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            // Site identity, public details and search appearance. The base key
            // is the English copy and every locale may override it.
            ...SITE_LOCALIZED_KEYS.flatMap((key) => [
              key,
              ...locales.map((locale) => `${key}.${locale}`),
            ]),
            'site.logoUrl',
            'site.logoIcon',
            'site.faviconUrl',
            'brand.color1',
            'brand.color2',
            'brand.splitChars',
            'rules.socialPlatforms',
            'rules.contentPolicy',
            'ads.headScripts',
            'unlock.stepHoldSeconds',
            ...THEME_KEYS,
            ...CONTENT_PAGES.map((page) => `content.${page}`),
          ],
        },
      },
    })
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})
  } catch {
    // Never break rendering (including static generation) if settings are
    // unavailable; fall back to defaults.
    return {}
  }
})

export type SiteSettings = {
  name: string
  tagline: string
  /** True when an admin saved `site.tagline`; otherwise the localized default is in use. */
  hasCustomTagline: boolean
  /** Per-locale search title; '' = the generated title. */
  seoTitle: string
  /** Per-locale search description; '' = the tagline or catalog description. */
  seoDescription: string
  /** Per-locale share-card image (`/api/media/<id>` or http(s)); '' = generated card. */
  seoImage: string
  /** Per-locale tab/search icon; '' = the site favicon. */
  seoIcon: string
  /** Admin-managed custom logo (`/api/media/<id>` or http(s) URL); '' = built-in mark. */
  logoUrl: string
  /** Selected built-in mark icon key; '' = the shipped glyph. */
  logoIcon: string
  /** Admin-managed favicon URL; '' = the shipped brand favicon. */
  faviconUrl: string
  /** Two-tone colors and single-word split for the name shown next to the logo. */
  brand: BrandNameStyle
  allowedPlatforms: string[]
  contentPolicy: string
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const [map, defaults, rawLocale] = await Promise.all([
    getSettingMap(),
    getLocalizedDefaults(),
    getLocale(),
  ])
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'
  // The base key is the English copy and the fallback for every other locale.
  const localized = (key: string) => map[`${key}.${locale}`]?.trim() ?? ''
  const baseTagline = map['site.tagline']?.trim() ?? ''
  const customTagline = localized('site.tagline') || baseTagline
  const seoImage = localized('site.seoImage') || map['site.seoImage']?.trim() || ''
  const seoIcon = localized('site.seoIcon') || map['site.seoIcon']?.trim() || ''
  const logoIcon = map['site.logoIcon']?.trim() ?? ''
  return {
    name: localized('site.name') || map['site.name']?.trim() || defaults.name,
    tagline: customTagline || defaults.tagline,
    hasCustomTagline: customTagline.length > 0,
    seoTitle: localized('site.seoTitle') || map['site.seoTitle']?.trim() || '',
    seoDescription:
      localized('site.seoDescription') || map['site.seoDescription']?.trim() || '',
    seoImage: isMediaOrHttpUrl(seoImage) ? seoImage : '',
    seoIcon: isMediaOrHttpUrl(seoIcon) ? seoIcon : '',
    logoUrl: isMediaOrHttpUrl(map['site.logoUrl']) ? (map['site.logoUrl'] as string) : '',
    logoIcon: isBrandMarkIcon(logoIcon) ? logoIcon : '',
    faviconUrl: isMediaOrHttpUrl(map['site.faviconUrl']) ? (map['site.faviconUrl'] as string) : '',
    brand: getBrandNameStyle(map),
    allowedPlatforms: (map['rules.socialPlatforms'] ?? '')
      .split(',')
      .map((platform) => platform.trim())
      .filter(Boolean),
    contentPolicy: map['rules.contentPolicy']?.trim() || '',
  }
})

/** True for values usable as logo/favicon URLs (uploaded media or http(s)). */
export function isMediaOrHttpUrl(value: string | undefined | null): boolean {
  const trimmed = value?.trim() ?? ''
  return /^https?:\/\//.test(trimmed) || /^\/api\/media\/[A-Za-z0-9_-]+$/.test(trimmed)
}

/** Locale-aware shipped default body for a content page. */
export const getDefaultContent = cache(async (page: ContentPage): Promise<string> => {
  const defaults = await getLocalizedDefaults()
  return defaults.content[page]?.trim() || DEFAULT_CONTENT[page]
})

/** Admin-authored page body, falling back to the shipped default content. */
export const getPageContent = cache(async (page: ContentPage): Promise<string> => {
  const [map, defaultContent] = await Promise.all([
    getSettingMap(),
    getDefaultContent(page),
  ])
  return map[`content.${page}`]?.trim() || defaultContent
})
