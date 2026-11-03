import 'server-only'

import { configText, EMAIL_SETTINGS } from '@/lib/config'

/**
 * Minimal transactional email hook.
 *
 * The platform has no bundled email provider. Instead it POSTs a JSON payload to
 * a configured webhook endpoint (an automation endpoint, a relay, or any
 * provider that accepts an HTTP webhook), which keeps the app free of an extra
 * dependency and lets the operator choose the transport. The endpoint, its
 * bearer token and the sender address are administrator settings.
 *
 * In development, or when the webhook is missing, the payload is logged so the
 * flow stays testable without leaking anything to visitors.
 */
export type MailPayload = {
  to: string
  subject: string
  text: string
  type: string
  url?: string
}

export async function sendMail(payload: MailPayload): Promise<boolean> {
  const [url, token, from] = await Promise.all([
    configText(EMAIL_SETTINGS.webhookUrl.dbKey, EMAIL_SETTINGS.webhookUrl.envName),
    configText(EMAIL_SETTINGS.webhookToken.dbKey, EMAIL_SETTINGS.webhookToken.envName),
    configText(EMAIL_SETTINGS.from.dbKey, EMAIL_SETTINGS.from.envName),
  ])
  if (!url) return false

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...payload, from: from || undefined }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      console.error('[mail] webhook rejected the message', { status: response.status })
      return false
    }
    return true
  } catch (error) {
    console.error('[mail] webhook request failed', error)
    return false
  }
}
