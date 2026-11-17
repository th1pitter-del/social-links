import type { ComponentType } from 'react'
import { Code, Database, Gift, Globe, Mail, Palette, Search, Server, ShieldCheck, Timer, Unlock, Upload } from 'lucide-react'

import { defaultLocale, type Locale } from '@/i18n/config'

type IconType = ComponentType<{ className?: string }>

export type SettingsField = {
  key: string
  /** Renders a color picker plus a hex text input instead of a plain input. */
  color?: boolean
  multiline?: boolean
  /** Renders a URL input with an image-upload button and preview (logo/favicon). */
  image?: boolean
  /** Renders an on/off switch storing 'true'/'false'. */
  toggle?: boolean
  /**
   * A credential. The stored value is never sent to the browser: the panel
   * shows whether one is configured and offers replace/remove instead of a
   * prefilled input.
   */
  secret?: boolean
  /** Computed server-side and shown with a copy button; never saved from here. */
  readonly?: boolean
  /** Two text inputs (first/second part) that compose one stored name value. */
  brandName?: boolean
  /** Whole-number input. */
  integer?: boolean
  /**
   * Occupies the full width of the two-column field grid. Short values (a
   * number, a color, a switch) share a row; URLs, sentences and credentials
   * need the room.
   */
  wide?: boolean
  /** Loaded and saved with the group, but drawn inside another field's block. */
  embedded?: boolean
  /** Catalog key a localized instance points at (the unsuffixed base key). */
  labelKey?: string
}

export type SettingsGroup = {
  id: string
  icon: IconType
  /** Shows the `groups.<id>.notice` copy above the fields. */
  notice?: boolean
  /** Keeps the field definitions but hides them until the feature is in use. */
  fieldsHidden?: boolean
  fields: SettingsField[]
  /**
   * Field definitions repeated inside a tab for every enabled locale. The
   * stored key gains the locale suffix (`site.name` → `site.name.es`), except
   * for the default locale, which uses the base key.
   */
  localizedFields?: SettingsField[]
}

/** Stored key for a per-locale field: base key for the default locale. */
export function localizedSettingsKey(base: string, locale: Locale) {
  return locale === defaultLocale ? base : `${base}.${locale}`
}

/**
 * Structural definition of the admin settings groups. All user-facing text
 * (titles, descriptions, field labels, hints and placeholders) lives in the
 * `admin.settings` namespace of the message catalogs, keyed by group id and
 * by field key with dots replaced by underscores (e.g. `site.name` →
 * `fields.site_name`).
 */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'site-content',
    icon: Globe,
    // The mark sources are drawn as tabbed blocks beside the live preview, so
    // these keys only supply the values and the dirty tracking.
    fields: [
      { key: 'site.logoUrl', image: true, embedded: true },
      { key: 'site.logoIcon', embedded: true },
      { key: 'site.faviconUrl', image: true, embedded: true },
      // Shared by every language, so they sit inside the site-name block.
      { key: 'brand.color1', color: true, embedded: true },
      { key: 'brand.color2', color: true, embedded: true },
      { key: 'brand.splitChars', integer: true, embedded: true },
      { key: 'brand.nameSize', integer: true, embedded: true },
    ],
    // One tab per enabled locale; every locale may carry its own name and
    // tagline. Empty fields fall back to the base (English) copy.
    localizedFields: [
      { key: 'site.name', brandName: true },
      { key: 'site.tagline', wide: true },
    ],
  },
  {
    id: 'seo',
    icon: Search,
    fields: [],
    // Search appearance is copy per language, so it lives on its own page
    // instead of crowding the branding fields.
    localizedFields: [
      { key: 'site.seoTitle', wide: true },
      { key: 'site.seoDescription', multiline: true },
      { key: 'site.seoImage', image: true },
      { key: 'site.seoIcon', image: true },
    ],
  },
  {
    id: 'appearance',
    icon: Palette,
    fields: [
      { key: 'theme.light.primary', color: true },
      { key: 'theme.light.background', color: true },
      { key: 'theme.light.accentText', color: true },
      { key: 'theme.dark.primary', color: true },
      { key: 'theme.dark.background', color: true },
      { key: 'theme.dark.accentText', color: true },
    ],
  },
  {
    id: 'unlock',
    icon: Unlock,
    fields: [
      { key: 'unlock.stepHoldSeconds' },
    ],
  },
  {
    id: 'rate-limits',
    icon: Timer,
    fields: [
      { key: 'limits.linkCreatePerHour' },
      { key: 'limits.shortLinkCreatePerHour' },
      { key: 'limits.guestLinkCreatePerHour' },
      { key: 'limits.unlockStartPerMinute' },
      { key: 'limits.verifyPerMinute' },
      { key: 'limits.reportPerHour' },
      { key: 'limits.uploadPerHour' },
    ],
  },
  {
    id: 'upload-limits',
    icon: Upload,
    fields: [{ key: 'limits.uploadMaxMb' }, { key: 'limits.fileMaxMb' }],
  },
  {
    id: 'email-delivery',
    icon: Mail,
    notice: true,
    fields: [
      { key: 'email.webhookUrl', wide: true },
      { key: 'email.webhookToken', secret: true, wide: true },
      { key: 'email.from', wide: true },
    ],
  },
  {
    id: 'custom-code',
    icon: Code,
    // The group renders its own snippet manager instead of generic fields.
    fields: [],
  },
  {
    id: 'step-verification',
    icon: ShieldCheck,
    notice: true,
    fieldsHidden: true,
    fields: [
      { key: 'verification.enabled', toggle: true },
      { key: 'verification.oauthRedirectUrl', readonly: true },
      { key: 'verification.googleClientId', wide: true },
      { key: 'verification.googleClientSecret', secret: true, wide: true },
      { key: 'verification.githubClientId', wide: true },
      { key: 'verification.githubClientSecret', secret: true, wide: true },
      { key: 'verification.telegramBotToken', secret: true, wide: true },
    ],
  },
  {
    id: 'data-retention',
    icon: Database,
    fields: [{ key: 'retention.analyticsDays' }],
  },
  {
    id: 'system-ops',
    icon: Server,
    fields: [
      { key: 'ops.gitBranch' },
      { key: 'ops.backupRetention' },
      { key: 'ops.processManager' },
      { key: 'ops.processName' },
    ],
  },
  {
    id: 'ogads',
    icon: Gift,
    fields: [
      { key: 'ogads.enabled', toggle: true },
      { key: 'ogads.apiKey', secret: true, wide: true },
      { key: 'ogads.endpoint', wide: true },
      { key: 'ogads.affiliateId', wide: true },
      { key: 'ogads.ctype' },
      { key: 'ogads.offersShown' },
      { key: 'ogads.postbackSecret', secret: true, wide: true },
      { key: 'ogads.postbackUrl', readonly: true },
    ],
  },
]

/** Translation key suffix for a settings field (dots become underscores). */
export function settingsFieldKey(key: string) {
  return key.replace(/\./g, '_')
}

export function getSettingsGroup(id: string): SettingsGroup | undefined {
  return SETTINGS_GROUPS.find((group) => group.id === id)
}
