import 'server-only'

import { cache } from 'react'
import { getMessages } from 'next-intl/server'

import { prisma } from '@/lib/prisma'


export const DEFAULT_SITE_NAME = 'Link Unlocker'
export const DEFAULT_TAGLINE = 'Free social unlock links'

export const CONTENT_PAGES = ['faq', 'privacy', 'terms', 'contact'] as const
export type ContentPage = (typeof CONTENT_PAGES)[number]

export const DEFAULT_CONTENT: Record<ContentPage, string> = {
  faq: `### Is Link Unlocker free?
Yes. Every feature available to creators is free. There are no premium plans or subscriptions.
### Are the social actions automatically verified?
Most social actions are prompted and confirmed by the visitor, not automatically verified, because the social platforms do not allow reliable third-party verification. We label each action honestly instead of claiming a verification we cannot perform.
### What happens if a link expires or is disabled?
Expired or disabled links stop unlocking immediately and show a clear message to visitors. You can re-enable a disabled link from your dashboard at any time.
### Who can see the content I protect?
Only visitors who complete every required step for that link. Content is never served through guessable direct URLs, and incomplete sessions are refused by the server.
### Can I collect email addresses?
Yes, as an optional action on your link. Visitors must consent, and only you can see or export the addresses collected through your own links.`,
  privacy: `## What we collect
Account details you provide (name, email address and a hashed password), the content and configuration of links you create, and event data about how your links perform (views, unlock starts and completions). Visitor IP addresses are stored only as salted hashes for rate limiting and abuse prevention.
## Email collection
If you enable the optional email action on a link, addresses are stored with a record of consent and are only visible to the link owner. Owners can export or delete them.
## Retention
Unlock sessions expire automatically. Analytics events are kept for as long as the link exists. You can delete a link at any time, which removes its analytics and collected emails.
## Sharing
We do not sell personal data. We share the minimum data required with email delivery providers when you trigger password reset emails.`,
  terms: `## The service
Link Unlocker lets creators publish links that require visitors to complete configured actions before the protected content is revealed. The service is free to use and has no paid plans.
## Your responsibilities
Do not use Link Unlocker for unlawful content, deception, malware distribution or to violate the terms of the platforms you ask visitors to interact with. We may disable links or accounts that breach these terms or generate abuse reports.
## Availability
The service is provided as is. We may modify or discontinue features, and we will attempt to give notice of material changes.`,
  contact: `Questions about a link, your account or the platform? Email us at [support@linkunlock.app](mailto:support@linkunlock.app).
Abuse reports are triaged first. Include the public link URL so we can investigate quickly.`,
}

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
 */export const DEFAULT_THEME = {
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

  return `html:root{${light}}html:root.dark{${dark}}html .admin-theme{${dark}}`
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
            'site.name',
            'site.tagline',
            'site.logoUrl',
            'site.faviconUrl',
            'rules.socialPlatforms',
            'rules.contentPolicy',
            'demo.loginEnabled',
            'demo.label',
            'demo.email',
            'demo.password',
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
  /** Admin-managed custom logo (`/api/media/<id>` or http(s) URL); '' = built-in mark. */
  logoUrl: string
  /** Admin-managed favicon URL; '' = the shipped favicon.ico. */
  faviconUrl: string
  allowedPlatforms: string[]
  contentPolicy: string
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const [map, defaults] = await Promise.all([getSettingMap(), getLocalizedDefaults()])
  return {
    name: map['site.name']?.trim() || defaults.name,
    tagline: map['site.tagline']?.trim() || defaults.tagline,
    logoUrl: isMediaOrHttpUrl(map['site.logoUrl']) ? (map['site.logoUrl'] as string) : '',
    faviconUrl: isMediaOrHttpUrl(map['site.faviconUrl']) ? (map['site.faviconUrl'] as string) : '',
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

export type DemoLogin = {
  label: string
  email: string
  password: string
}

/**
 * Demo credentials shown on the sign-in page. Opt-in via the `demo.loginEnabled`
 * setting with both an email and a password configured; null otherwise. The
 * password is stored in plain text on purpose — this is a demo convenience that
 * must be disabled in production.
 */
export const getDemoLogin = cache(async (): Promise<DemoLogin | null> => {
  const map = await getSettingMap()
  if (map['demo.loginEnabled'] !== 'true') return null
  const email = map['demo.email']?.trim().toLowerCase() ?? ''
  const password = map['demo.password'] ?? ''
  if (!email || !password) return null
  return {
    label: map['demo.label']?.trim() || email,
    email,
    password,
  }
})

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
