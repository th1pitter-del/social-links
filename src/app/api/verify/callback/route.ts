import { NextResponse } from 'next/server'

import { applyOAuthVerification, readOAuthRequest } from '@/lib/unlock-confirm'
import { oauthProvider } from '@/lib/verification'
import { readOAuthState } from '@/lib/verification/oauth-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function backToLink(
  request: Request,
  slug: string,
  token: string,
  verify?: 'unavailable' | 'notdone',
) {
  const url = new URL(`/u/${encodeURIComponent(slug)}`, request.url)
  url.searchParams.set('token', token)
  if (verify) url.searchParams.set('verify', verify)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const state = readOAuthState(searchParams.get('state'))
  if (!state) return NextResponse.redirect(new URL('/', request.url))

  const code = searchParams.get('code')
  // A closed consent window leaves nothing to check. The page already shows
  // which steps remain, so the return trip stays silent.
  if (!code) {
    const pending = await readOAuthRequest(state.token)
    return pending
      ? NextResponse.redirect(
          new URL(
            `/u/${encodeURIComponent(pending.slug)}?token=${encodeURIComponent(state.token)}`,
            request.url,
          ),
        )
      : NextResponse.redirect(new URL('/', request.url))
  }

  const provider = oauthProvider(state.provider)
  const redirectUri = `${new URL(request.url).origin}/api/verify/callback`
  const exchanged = provider ? await provider.exchange({ code, redirectUri }) : null

  if (!exchanged) {
    const pending = await readOAuthRequest(state.token)
    return pending
      ? backToLink(request, pending.slug, state.token, 'unavailable')
      : NextResponse.redirect(new URL('/', request.url))
  }

  const result = await applyOAuthVerification({
    token: state.token,
    provider: state.provider,
    accessToken: exchanged.accessToken,
  })
  if (!result.slug) return NextResponse.redirect(new URL('/', request.url))

  return backToLink(
    request,
    result.slug,
    state.token,
    result.error ? 'unavailable' : result.refused.length ? 'notdone' : undefined,
  )
}
