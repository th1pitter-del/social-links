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
