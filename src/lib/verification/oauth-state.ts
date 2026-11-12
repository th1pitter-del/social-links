import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const OAUTH_TTL_SECONDS = 600
export const OAUTH_COOKIE = 'unlock-oauth'
export const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/verify',
  maxAge: OAUTH_TTL_SECONDS,
}

export type OAuthState = { token: string; provider: string; nonce: string; exp: number }

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function bindUnlockBrowser(token: string): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return
  const jar = await cookies()
  jar.set(`unlock-owner-${token}`, signature(`owner:${token}`, secret), {
    ...OAUTH_COOKIE_OPTIONS, maxAge: 2 * 60 * 60,
  })
}

export async function ownsUnlockSession(token: string): Promise<boolean> {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || !/^[A-Za-z0-9_-]{32}$/.test(token)) return false
  const owner = (await cookies()).get(`unlock-owner-${token}`)?.value
  return Boolean(owner && equal(owner, signature(`owner:${token}`, secret)))
}

export function signOAuthState(input: Omit<OAuthState, 'exp'>): string | null {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) return null
  const payload = Buffer.from(JSON.stringify({
    ...input, exp: Date.now() + OAUTH_TTL_SECONDS * 1000,
  })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function readOAuthState(state: string | null): OAuthState | null {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || !state || state.length > 2048) return null
  const cut = state.lastIndexOf('.')
  if (cut <= 0) return null
  const payload = state.slice(0, cut)
  if (!equal(state.slice(cut + 1), signature(payload, secret))) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const { token, provider, nonce, exp } = parsed as Record<string, unknown>
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token) ||
      typeof provider !== 'string' || !['google', 'github'].includes(provider) ||
      typeof nonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(nonce) ||
      typeof exp !== 'number' || !Number.isFinite(exp) || exp <= Date.now()) return null
    return { token, provider, nonce, exp }
  } catch {
    return null
  }
}
