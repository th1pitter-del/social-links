import 'server-only'

export type VerifyOutcome =
  | { status: 'VERIFIED'; proof: string }
  | { status: 'NOT_FOLLOWING'; proof: string }
  | { status: 'INVALID_HANDLE'; message: string }
  | { status: 'UNAVAILABLE'; message: string }

type VerifierBase = {
  platformKey: string
  /**
   * The action keys this provider can prove. A platform can host steps its
   * public record cannot answer (a YouTube like leaves no trace per person),
   * and checking those would refuse a visitor who did act.
   */
  actionTypes?: readonly string[]
  /** Extract the link owner's identity from the action target they pasted. */
  parseCreator(target: string): string | null
  /**
   * The shape this platform's identity takes, shown as the placeholder of the
   * one quiet profile field. Mastodon needs a server, Steam a profile name, so
   * a generic hint otherwise invites handles that cannot be read.
   */
  handleExample?: string
  /**
   * Whether the administrator has supplied what this provider needs. An
   * unconfigured provider must behave as if it did not exist, otherwise a
   * visitor would be sent into a verification flow that cannot complete.
   */
  isConfigured(): Promise<boolean>
}

/**
 * HANDLE reads a public record the visitor names (Bluesky, GitHub). HANDOFF
 * cannot, because the platform gives no username lookup: the visitor has to
 * pass through the platform first and the answer comes back from there.
 */
export type Verifier =
  | (VerifierBase & {
      mode: 'HANDLE'
      /** Check the platform's public record for `visitorHandle → creator`. */
      check(visitorHandle: string, creator: string, actionType?: string): Promise<VerifyOutcome>
    })
  | (VerifierBase & { mode: 'HANDOFF' })

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

/** The OAuth verifier only when its provider is configured on this install. */
export async function activeOAuthVerifierForAction(
  platform: string | null | undefined,
  actionType: string,
): Promise<OAuthVerifier | null> {
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
): Promise<Verifier | null> {
  const verifier = verifierFor(platform)
  if (!verifier) return null
  return (await verifier.isConfigured()) ? verifier : null
}

export function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
}
