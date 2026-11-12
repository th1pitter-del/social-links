import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { consumeBySetting } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/seo'
import { readOAuthRequest } from '@/lib/unlock-confirm'
import { oauthProvider } from '@/lib/verification'
import {
  OAUTH_COOKIE, OAUTH_COOKIE_OPTIONS, OAUTH_TTL_SECONDS,
  ownsUnlockSession, signOAuthState,
} from '@/lib/verification/oauth-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const providerId = url.searchParams.get('provider') ?? ''
  if (!(await ownsUnlockSession(token))) return NextResponse.redirect(new URL('/', SITE_URL))
  const target = await readOAuthRequest(token, providerId)
  if (!target) return NextResponse.redirect(new URL('/', SITE_URL))
  const back = new URL(`/link/${encodeURIComponent(target.slug)}`, SITE_URL)
  back.searchParams.set('token', token)
  back.searchParams.set('verify', 'unavailable')
  const budget = await consumeBySetting(`oauth:start:${token}`, 'limits.verifyPerMinute', 8, 60)
  if (!budget.ok) return NextResponse.redirect(back)
  const provider = oauthProvider(providerId)
  const nonce = randomBytes(32).toString('base64url')
  const state = signOAuthState({ token, provider: providerId, nonce })
  const authorizeUrl = provider && state && (await provider.isConfigured())
    ? await provider.authorizeUrl({ state, redirectUri: `${SITE_URL}/api/verify/callback` })
    : null
  if (!authorizeUrl || !state) return NextResponse.redirect(back)
  await prisma.verification.create({
    data: {
      id: `unlock-oauth-${nonce}`, identifier: 'unlock-oauth', value: state,
      expiresAt: new Date(Date.now() + OAUTH_TTL_SECONDS * 1000),
    },
  })
  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(OAUTH_COOKIE, nonce, OAUTH_COOKIE_OPTIONS)
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
