import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'
import { registerOAuthProvider } from './registry'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
/**
 * The only scope the checks need: reading the visitor's own subscriptions and
 * video ratings. Everything else Google offers is deliberately not requested.
 */
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'

async function credentials(): Promise<{ id: string; secret: string } | null> {
  const [id, secret] = await Promise.all([
    configValue(VERIFICATION_SETTINGS.googleClientId),
    configValue(VERIFICATION_SETTINGS.googleClientSecret),
  ])
  if (!id || !secret) return null
  return { id, secret }
}

export async function isGoogleConfigured(): Promise<boolean> {
  return (await credentials()) !== null
}

registerOAuthProvider('google', () => ({
  id: 'google',
  isConfigured: isGoogleConfigured,
  async authorizeUrl({ state, redirectUri }) {
    const values = await credentials()
    if (!values) return null
    const url = new URL(AUTH_URL)
    url.searchParams.set('client_id', values.id)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPE)
    url.searchParams.set('access_type', 'online')
    url.searchParams.set('include_granted_scopes', 'false')
    url.searchParams.set('prompt', 'select_account')
    url.searchParams.set('state', state)
    return url.toString()
  },
  async exchange({ code, redirectUri }) {
    const values = await credentials()
    if (!values) return null
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        cache: 'no-store',
        redirect: 'error',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: values.id,
          client_secret: values.secret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return null
      const body = (await response.json()) as { access_token?: unknown }
      return typeof body.access_token === 'string' && body.access_token
        ? { accessToken: body.access_token }
        : null
    } catch {
      return null
    }
  },
}))
