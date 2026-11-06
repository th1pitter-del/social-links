import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 10 * 60 * 1000

export type OAuthState = {
  /** The unlock session the provider round trip belongs to. */
  token: string
  provider: string
  exp: number
}

function stateSecret(): string | null {
  return process.env.BETTER_AUTH_SECRET || null
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/**
 * The provider hands this back untouched. It is signed so a visitor cannot
 * attach someone else's session to their own consent, and it carries an
 * expiry so a stale consent link cannot be replayed.
 */
export function signOAuthState(input: { token: string; provider: string }): string | null {
  const secret = stateSecret()
  if (!secret) return null
  const payload = Buffer.from(
    JSON.stringify({ token: input.token, provider: input.provider, exp: Date.now() + TTL_MS }),
  ).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function readOAuthState(state: string | null): OAuthState | null {
  const secret = stateSecret()
  if (!secret || !state) return null

  const cut = state.lastIndexOf('.')
  if (cut <= 0) return null
  const payload = state.slice(0, cut)
  const given = Buffer.from(state.slice(cut + 1))
  const expected = Buffer.from(signature(payload, secret))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const { token, provider, exp } = parsed as Record<string, unknown>
    if (typeof token !== 'string' || typeof provider !== 'string' || typeof exp !== 'number') {
      return null
    }
    if (exp <= Date.now()) return null
    return { token, provider, exp }
  } catch {
    return null
  }
}
