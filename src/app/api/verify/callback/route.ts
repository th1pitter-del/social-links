import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/seo'
import { applyOAuthVerification, readOAuthRequest } from '@/lib/unlock-confirm'
import { promoteIfComplete } from '@/lib/unlock-completion'
import { oauthProvider } from '@/lib/verification'
import {
  OAUTH_COOKIE, OAUTH_COOKIE_OPTIONS, ownsUnlockSession, readOAuthState,
} from '@/lib/verification/oauth-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function redirectBack(slug?: string, token?: string, verify?: 'unavailable' | 'notdone') {
  const url = new URL(slug ? `/link/${encodeURIComponent(slug)}` : '/', SITE_URL)
  if (token) url.searchParams.set('token', token)
  if (verify) url.searchParams.set('verify', verify)
  const response = NextResponse.redirect(url)
  response.cookies.set(OAUTH_COOKIE, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 })
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const encoded = url.searchParams.get('state')
  const state = readOAuthState(encoded)
  if (!state || (await cookies()).get(OAUTH_COOKIE)?.value !== state.nonce ||
    !(await ownsUnlockSession(state.token))) return redirectBack()

  const consumed = await prisma.verification.deleteMany({
    where: {
      id: `unlock-oauth-${state.nonce}`, identifier: 'unlock-oauth',
      value: encoded!, expiresAt: { gt: new Date() },
    },
  })
  if (consumed.count !== 1) return redirectBack()
  const pending = await readOAuthRequest(state.token, state.provider)
  if (!pending) return redirectBack()
  const code = url.searchParams.get('code')
  const provider = oauthProvider(state.provider)
  if (!code || code.length > 4096 || !provider || !(await provider.isConfigured())) {
    return redirectBack(pending.slug, state.token, 'unavailable')
  }
  const exchanged = await provider.exchange({ code, redirectUri: `${SITE_URL}/api/verify/callback` })
  if (!exchanged) return redirectBack(pending.slug, state.token, 'unavailable')
  const result = await applyOAuthVerification({
    token: state.token, provider: state.provider, accessToken: exchanged.accessToken,
  })
  if (!result.slug) return redirectBack()
  await promoteIfComplete(state.token)
  return redirectBack(
    result.slug, state.token, result.error ? 'unavailable' : result.refused ? 'notdone' : undefined,
  )
}
