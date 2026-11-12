import 'server-only'

import { normalizeHandle } from './registry'

const API = 'https://api.github.com'
const LOGIN_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/
const HOSTS = new Set(['github.com', 'www.github.com'])

/** Read GitHub only as the visitor who just authorized the OAuth flow. */
export async function githubStatus(path: string, accessToken: string): Promise<number> {
  if (!accessToken?.trim()) return 0
  try {
    const response = await fetch(`${API}${path}`, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    return response.status
  } catch {
    return 0
  }
}

function githubUrl(value: string): URL | null {
  if (!value || /[\s\\]/.test(value)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (!HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null
    return url
  } catch {
    return null
  }
}

/** A GitHub profile URL or bare creator login, not a visitor ownership claim. */
export function extractGithubLogin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  const login = normalizeHandle(trimmed)
  if (LOGIN_RE.test(login)) return login

  const url = githubUrl(trimmed)
  const match = url?.pathname.match(/^\/([^/]+)\/?$/)
  return match && LOGIN_RE.test(match[1]) ? match[1] : null
}

/** A GitHub repository URL; profile URLs and lookalike hosts are not repositories. */
export function extractGithubRepo(value: string): string | null {
  const url = githubUrl(value.trim())
  const match = url?.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/)
  if (!match) return null
  const owner = match[1]
  const repo = match[2].replace(/\.git$/i, '')
  if (!LOGIN_RE.test(owner) || !REPO_RE.test(repo) || /^\.+$/.test(repo)) return null
  return `${owner}/${repo}`
}
