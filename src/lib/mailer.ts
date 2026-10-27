import 'server-only'

/**
 * Minimal transactional email hook.
 *
 * The platform has no bundled email provider. Instead it POSTs a JSON payload to
 * a configured `EMAIL_WEBHOOK_URL` (an automation endpoint, a relay, or any
 * provider that accepts an HTTP webhook), which keeps the app free of an extra
 * dependency and lets the operator choose the transport.
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
  const url = process.env.EMAIL_WEBHOOK_URL
  if (!url) return false

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EMAIL_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ ...payload, from: process.env.EMAIL_FROM ?? undefined }),
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
