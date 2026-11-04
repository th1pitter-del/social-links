import { NextResponse } from 'next/server'

import { writeAudit } from '@/lib/admin-utils'
import { getSession } from '@/lib/session'
import {
  completeTwitchConnect,
  twitchRedirectUri,
  verifyConnectState,
} from '@/lib/verification/twitch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BACK = '/admin/settings/step-verification'

/**
 * Twitch sends the channel owner back here with a one-time code. Only the admin
 * who started the flow may trade it, and only once: the state ties the callback
 * to their account and expires with it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (outcome: string) =>
    NextResponse.redirect(`${url.origin}${BACK}?twitch=${outcome}`)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error')) return back('denied')
  if (!code || !state) return back('failed')

  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return back('failed')
  if (!verifyConnectState(state, session.user.id)) return back('failed')

  const result = await completeTwitchConnect(code, twitchRedirectUri(url.origin))
  if (!result.ok) return back('failed')

  await writeAudit({
    action: 'twitch.connect',
    targetType: 'setting',
    targetId: 'verification.twitchAccessToken',
    details: JSON.stringify({ login: result.login }),
  })
  return back('connected')
}
