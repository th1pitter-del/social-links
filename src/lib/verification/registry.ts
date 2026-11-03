import 'server-only'

export type VerifyOutcome =
  | { status: 'VERIFIED'; proof: string }
  | { status: 'NOT_FOLLOWING'; proof: string }
  | { status: 'INVALID_HANDLE'; message: string }
  | { status: 'UNAVAILABLE'; message: string }

type VerifierBase = {
  platformKey: string
  /** Extract the link owner's identity from the action target they pasted. */
  parseCreator(target: string): string | null
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
      check(visitorHandle: string, creator: string): Promise<VerifyOutcome>
    })
  | (VerifierBase & { mode: 'HANDOFF' })

export type VerifyMode = Verifier['mode']

const verifiers = new Map<string, () => Verifier>()

export function registerVerifier(platformKey: string, build: () => Verifier): void {
  verifiers.set(platformKey.toLowerCase(), build)
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
