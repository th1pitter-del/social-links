import 'server-only'

import { configText, VERIFICATION_SETTINGS } from '@/lib/config'
import { normalizeHandle, registerVerifier, type VerifyOutcome } from './registry'

const API = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = 30
const LOGIN_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i

type GitHubUser = { login?: string }
type GitHubFollow = { login?: string }

async function getJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const { dbKey, envName } = VERIFICATION_SETTINGS.githubToken
  const token = await configText(dbKey, envName)
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: 'application/vnd.github+json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, status: 0 }
  }
}

/** `https://github.com/octocat` (or a bare login) → `octocat`. */
export function extractGithubLogin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/github\.com\/([^/?#]+)/i)
  const candidate = normalizeHandle(fromUrl ? fromUrl[1] : trimmed)
  const isRepoPath = fromUrl && /^[^/?#]+\/[^/?#]+/.test(fromUrl[1])
  if (isRepoPath) return null
  return LOGIN_RE.test(candidate) ? candidate : null
}

async function check(visitorHandle: string, creatorLogin: string): Promise<VerifyOutcome> {
  const visitor = normalizeHandle(visitorHandle)
  if (!LOGIN_RE.test(visitor)) return { status: 'INVALID_HANDLE', message: 'bad_format' }

  const profile = await getJson<GitHubUser>(`${API}/users/${encodeURIComponent(visitor)}`)
  if (!profile.ok) {
    if (profile.status === 404) return { status: 'INVALID_HANDLE', message: 'unknown_visitor' }
    return { status: 'UNAVAILABLE', message: `http_${profile.status}` }
  }

  const canonicalVisitor = profile.data.login ?? visitor
  const target = creatorLogin.toLowerCase()

  let exhausted = false
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await getJson<GitHubFollow[]>(
      `${API}/users/${encodeURIComponent(canonicalVisitor)}/following` +
        `?per_page=${PER_PAGE}&page=${page}`,
    )
    if (!result.ok) {
      return { status: 'UNAVAILABLE', message: `http_${result.status}` }
    }
    const rows = result.data
    if (rows.some((row) => (row.login ?? '').toLowerCase() === target)) {
      return { status: 'VERIFIED', proof: `${canonicalVisitor} follows ${creatorLogin}` }
    }
    if (rows.length < PER_PAGE) {
      exhausted = true
      break
    }
  }

  if (!exhausted) {
    // The visitor follows more accounts than we scanned; absence proves nothing.
    return { status: 'UNAVAILABLE', message: 'following_list_too_long' }
  }

  return { status: 'NOT_FOLLOWING', proof: `${canonicalVisitor} not following ${creatorLogin}` }
}

registerVerifier('github', () => ({
  platformKey: 'github',
  mode: 'HANDLE',
  parseCreator: extractGithubLogin,
  check,
  // A token raises the anonymous request ceiling but is not required to read
  // a public follow list, so this provider is always available.
  isConfigured: async () => true,
}))
