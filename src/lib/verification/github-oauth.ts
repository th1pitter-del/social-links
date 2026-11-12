import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'
import { extractGithubLogin, extractGithubRepo, githubStatus } from './github'
import { registerOAuthProvider, registerOAuthVerifier, type VerifyOutcome } from './registry'

const AUTH_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'

async function credentials(): Promise<{ id: string; secret: string } | null> {
  const [id, secret] = await Promise.all([
    configValue(VERIFICATION_SETTINGS.githubClientId),
    configValue(VERIFICATION_SETTINGS.githubClientSecret),
  ])
  if (!id || !secret) return null
  return { id, secret }
}

export async function isGithubOAuthConfigured(): Promise<boolean> {
  return (await credentials()) !== null
}

/** A relationship 404 is conclusive only for an authenticated visitor and a readable target. */
async function checkRelationship(
  accessToken: string,
  relationshipPath: string,
  targetPath: string,
  proof: { yes: string; no: string },
): Promise<VerifyOutcome> {
  const status = await githubStatus(relationshipPath, accessToken)
  if (status === 204) return { status: 'VERIFIED', proof: proof.yes }
  if (status !== 404) return { status: 'UNAVAILABLE', message: `http_${status}` }

  const [visitorStatus, targetStatus] = await Promise.all([
    githubStatus('/user', accessToken),
    githubStatus(targetPath, accessToken),
  ])
  if (visitorStatus !== 200) {
    return { status: 'UNAVAILABLE', message: `visitor_http_${visitorStatus}` }
  }
  if (targetStatus !== 200) {
    return { status: 'UNAVAILABLE', message: `target_http_${targetStatus}` }
  }
  return { status: 'NOT_FOLLOWING', proof: proof.no }
}

async function checkOAuth(
  accessToken: string,
  creator: string,
  actionType: string,
): Promise<VerifyOutcome> {
  if (!accessToken?.trim()) return { status: 'UNAVAILABLE', message: 'access_token_required' }
  if (actionType === 'GITHUB_STAR') {
    const repo = extractGithubRepo(`https://github.com/${creator}`)
    if (!repo || repo !== creator) return { status: 'UNAVAILABLE', message: 'invalid_target' }
    const path = repo.split('/').map(encodeURIComponent).join('/')
    return checkRelationship(accessToken, `/user/starred/${path}`, `/repos/${path}`, {
      yes: `visitor starred github repository ${repo}`,
      no: `visitor has not starred github repository ${repo}`,
    })
  }
  if (actionType === 'GITHUB_FOLLOW') {
    const login = extractGithubLogin(creator)
    if (!login || login !== creator) return { status: 'UNAVAILABLE', message: 'invalid_target' }
    const path = encodeURIComponent(login)
    return checkRelationship(accessToken, `/user/following/${path}`, `/users/${path}`, {
      yes: `visitor follows ${login} on GitHub`,
      no: `visitor is not following ${login} on GitHub`,
    })
  }
  return { status: 'UNAVAILABLE', message: 'unsupported_action' }
}

registerOAuthVerifier(() => ({
  platformKey: 'github',
  provider: 'github',
  actionTypes: ['GITHUB_STAR', 'GITHUB_FOLLOW'],
  parseCreator(target, actionType) {
    if (actionType === 'GITHUB_STAR') return extractGithubRepo(target)
    if (actionType === 'GITHUB_FOLLOW') return extractGithubLogin(target)
    return null
  },
  check: checkOAuth,
  isConfigured: isGithubOAuthConfigured,
}))

registerOAuthProvider('github', () => ({
  id: 'github',
  isConfigured: isGithubOAuthConfigured,
  async authorizeUrl({ state, redirectUri }) {
    const values = await credentials()
    if (!values) return null
    const url = new URL(AUTH_URL)
    url.searchParams.set('client_id', values.id)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    // Public stars and follows need no repository or follow write scopes.
    url.searchParams.set('scope', '')
    url.searchParams.set('allow_signup', 'false')
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
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: values.id,
          client_secret: values.secret,
          redirect_uri: redirectUri,
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