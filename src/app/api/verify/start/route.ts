import { NextResponse } from 'next/server'

import { readOAuthRequest } from '@/lib/unlock-confirm'
import { oauthProvider } from '@/lib/verification'
import { signOAuthState } from '@/lib/verification/oauth-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Starts the quiet account check: the visitor is sent to the provider that can
 * answer for their own account, and comes back to the same link page. The
 * callback URL is derived from the request origin so the provider console only
 * needs this deployment's own address.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const target = await readOAuthRequest(token)
  if (!target) return NextResponse.redirect(new URL('/', request.url))

  const back = new URL(`/u/${encodeURIComponent(target.slug)}`, request.url)
  back.searchParams.set('token', token)

  const provider = oauthProvider(target.provider)
  const state = signOAuthState({ token, provider: target.provider })
  const redirectUri = `${new URL(request.url).origin}/api/verify/callback`
  const authorizeUrl =
    provider && state && (await provider.isConfigured())
      ? await provider.authorizeUrl({ state, redirectUri })
      : null

  if (!authorizeUrl) {
    back.searchParams.set('verify', 'unavailable')
    return NextResponse.redirect(back)
  }

  return NextResponse.redirect(authorizeUrl)
}
