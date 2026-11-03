import type { ComponentType } from 'react'
import { Database, Globe, KeyRound, Mail, Palette, Scale, ShieldCheck, Timer, Upload } from 'lucide-react'

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
}

export type SettingsGroup = {
  id: string
  icon: IconType
  fields: SettingsField[]
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
    fields: [
      { key: 'site.name' },
      { key: 'site.tagline' },
      { key: 'site.logoUrl', image: true },
      { key: 'site.faviconUrl', image: true },
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
    id: 'rate-limits',
    icon: Timer,
    fields: [
      { key: 'limits.linkCreatePerHour' },
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
    id: 'platform-rules',
    icon: Scale,
    fields: [
      { key: 'rules.socialPlatforms', multiline: true },
      { key: 'rules.contentPolicy', multiline: true },
    ],
  },
  {
    id: 'demo-access',
    icon: KeyRound,
    fields: [
      { key: 'demo.loginEnabled', toggle: true },
      { key: 'demo.label' },
      { key: 'demo.email' },
      { key: 'demo.password' },
    ],
  },
  {
    id: 'step-verification',
    icon: ShieldCheck,
    fields: [
      { key: 'verification.telegramBotToken', secret: true },
      { key: 'verification.githubToken', secret: true },
    ],
  },
  {
    id: 'email-delivery',
    icon: Mail,
    fields: [
      { key: 'email.webhookUrl' },
      { key: 'email.webhookToken', secret: true },
      { key: 'email.from' },
    ],
  },
  {
    id: 'data-retention',
    icon: Database,
    fields: [{ key: 'retention.analyticsDays' }],
  },
]

/** Translation key suffix for a settings field (dots become underscores). */
export function settingsFieldKey(key: string) {
  return key.replace(/\./g, '_')
}

export function getSettingsGroup(id: string): SettingsGroup | undefined {
  return SETTINGS_GROUPS.find((group) => group.id === id)
}
