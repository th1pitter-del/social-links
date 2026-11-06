import { ACTION_OPTION_DEFAULTS } from '@/lib/action-defaults'

/**
 * The parts of a next-intl translator this lookup uses, so one helper serves
 * `getTranslations()` on the server and `useTranslations()` in a client
 * component.
 */
type Translator = {
  (key: string): string
  has(key: string): boolean
}

const builtInLabel = new Map(ACTION_OPTION_DEFAULTS.map((action) => [action.key, action.label]))

/**
 * A built-in action speaks the visitor's locale: its wording lives under
 * `actions.<KEY>` in `messages/<locale>.json`, keyed by the same stable key the
 * database stores. Two cases keep the stored text - an admin who renamed the
 * action no longer matches the built-in wording this key stands for, and an
 * action the message files have not been translated for.
 */
export function actionLabel(
  action: { key: string; label: string },
  messages: Translator,
): string {
  if (builtInLabel.get(action.key) !== action.label) return action.label
  return messages.has(action.key) ? messages(action.key) : action.label
}

// The label each built-in platform row carries in the seed. A stored name that
// no longer matches it was renamed, and stays as the admin wrote it.
const builtInPlatformLabel = new Map<string, string>([
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'],
  ['discord', 'Discord'],
  ['spotify', 'Spotify'],
  ['none', 'Website'],
])

/** The platform counterpart of `actionLabel`, keyed under `platforms.<KEY>`. */
export function platformLabel(
  platform: { key: string; label?: string | null },
  messages: Translator,
): string {
  const fallback = builtInPlatformLabel.get(platform.key)
  const stored = platform.label ?? fallback ?? platform.key
  if (fallback !== undefined && stored !== fallback) return stored
  return messages.has(platform.key) ? messages(platform.key) : stored
}
