import 'server-only'

import { configValue, VERIFICATION_SETTINGS } from '@/lib/config'

export type VerifyOutcome =
  | { status: 'VERIFIED'; proof: string }
  | { status: 'NOT_FOLLOWING'; proof: string }
  | { status: 'UNAVAILABLE'; message: string }

/** A provider handoff proves the visitor's identity before checking their action. */
export type Verifier = {
  platformKey: string
  mode: 'HANDOFF'
  /** Only actions the provider can prove for the authenticated visitor. */
  actionTypes?: readonly string[]
  /** Extract the link owner's identity, never the visitor's identity. */
  parseCreator(target: string): string | null
  isConfigured(): Promise<boolean>
}

export type VerifyMode = Verifier['mode']

/**
 * A step the platform will answer only for the visitor's own signed-in account
 * (a like and a subscription leave no public record). The visitor connects the
 * provider once and the platform confirms the action against that account.
 */
export type OAuthVerifier = {
  platformKey: string
  /** The provider that issues the access token, e.g. `google`. */
  provider: string
  actionTypes?: readonly string[]
  /** Extract the creator's identity from the action target. */
  parseCreator(target: string, actionType: string): string | null
  check(accessToken: string, creator: string, actionType: string): Promise<VerifyOutcome>
  /** Whether the administrator has supplied the provider credentials. */
  isConfigured(): Promise<boolean>
}

/** The parts of an OAuth provider the verification flow needs. */
export type OAuthProvider = {
  id: string
  isConfigured(): Promise<boolean>
  authorizeUrl(input: { state: string; redirectUri: string }): Promise<string | null>
  exchange(input: { code: string; redirectUri: string }): Promise<{ accessToken: string } | null>
}

const verifiers = new Map<string, () => Verifier>()
const oauthVerifiers: (() => OAuthVerifier)[] = []
const oauthProviders = new Map<string, () => OAuthProvider>()

export function registerVerifier(platformKey: string, build: () => Verifier): void {
  verifiers.set(platformKey.toLowerCase(), build)
}

export function registerOAuthVerifier(build: () => OAuthVerifier): void {
  oauthVerifiers.push(build)
}

export function registerOAuthProvider(id: string, build: () => OAuthProvider): void {
  oauthProviders.set(id, build)
}

/** The OAuth verifier for an action type, regardless of configuration. */
export function oauthVerifierForAction(
  platform: string | null | undefined,
  actionType: string,
): OAuthVerifier | null {
  if (!platform) return null
  for (const build of oauthVerifiers) {
    const verifier = build()
    if (verifier.platformKey.toLowerCase() !== platform.toLowerCase()) continue
    if (verifier.actionTypes && !verifier.actionTypes.includes(actionType)) continue
    return verifier
  }
  return null
}

/**
 * The administrator's master switch, on until they turn it off. Off means no
 * provider is contacted and every step completes on its single press, exactly
 * as it did before any of this existed.
 */
export async function verificationEnabled(): Promise<boolean> {
  return (await configValue(VERIFICATION_SETTINGS.enabled)) !== 'false'
}

/** The OAuth verifier only when its provider is configured on this install. */
export async function activeOAuthVerifierForAction(
  platform: string | null | undefined,
  actionType: string,
): Promise<OAuthVerifier | null> {
  if (!(await verificationEnabled())) return null
  const verifier = oauthVerifierForAction(platform, actionType)
  if (!verifier) return null
  return (await verifier.isConfigured()) ? verifier : null
}

export function oauthProvider(id: string): OAuthProvider | null {
  const build = oauthProviders.get(id)
  return build ? build() : null
}

/** The verifier for a link action's platform, or null when the platform cannot be checked. */
export function verifierFor(platform: string | null | undefined): Verifier | null {
  if (!platform) return null
  const build = verifiers.get(platform.toLowerCase())
  return build ? build() : null
}

/** The verifier only when it can actually run with the settings on this install. */
export async function activeVerifierFor(
  platform: string | null | undefined,
  actionType?: string,
): Promise<Verifier | null> {
  if (!(await verificationEnabled())) return null
  const verifier = verifierFor(platform)
  if (!verifier) return null
  if (actionType && verifier.actionTypes && !verifier.actionTypes.includes(actionType)) return null
  return (await verifier.isConfigured()) ? verifier : null
}

export function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
}
