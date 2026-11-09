import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 10 * 60 * 1000

export type VisitToken = {
  /** The unlock session whose step this redirect answers for. */
  session: string
  action: string
  exp: number
}

function secret(): string | null {
  return process.env.BETTER_AUTH_SECRET || null
}

function signature(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

/**
 * A step can only be marked visited by passing through this signed redirect,
 * so the server performs the navigation itself instead of trusting a click.
 */
export function signVisitToken(input: { sessionId: string; actionId: string }): string | null {
  const key = secret()
  if (!key) return null
  const payload = Buffer.from(
    JSON.stringify({
      session: input.sessionId,
      action: input.actionId,
      exp: Date.now() + TTL_MS,
    }),
  ).toString('base64url')
  return `${payload}.${signature(payload, key)}`
}

export function readVisitToken(token: string | null): VisitToken | null {
  const key = secret()
  if (!key || !token || token.length > 1024) return null

  const cut = token.lastIndexOf('.')
  if (cut <= 0) return null
  const payload = token.slice(0, cut)
  const given = Buffer.from(token.slice(cut + 1))
  const expected = Buffer.from(signature(payload, key))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const { session, action, exp } = parsed as Record<string, unknown>
    if (typeof session !== 'string' || typeof action !== 'string' || typeof exp !== 'number') {
      return null
    }
    if (exp <= Date.now()) return null
    return { session, action, exp }
  } catch {
    return null
  }
}
