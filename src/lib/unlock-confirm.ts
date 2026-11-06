import 'server-only'

import { getTranslations } from 'next-intl/server'

import { actionLabel } from '@/lib/action-label'
import { getActionOptionMap } from '@/lib/action-catalog'
import { consumeBySetting } from '@/lib/rate-limit'
import {
  activeOAuthVerifierForAction,
  activeVerifierFor,
  type OAuthVerifier,
  type Verifier,
} from '@/lib/verification'
import { prisma } from '@/lib/prisma'

type HandleVerifier = Extract<Verifier, { mode: 'HANDLE' }>

export type ConfirmableSession = {
  link: { actions: { id: string; type: string; label: string | null; target: string }[] }
  completions: { linkActionId: string; verified: boolean; proof: string | null }[]
}

type OutstandingBase = {
  actionId: string
  actionType: string
  label: string
  /** The platform whose record (or account) answers for this step. */
  platformKey: string
  /** The administrator's own platform name, so stored evidence reads properly. */
  platformName: string
  creator: string
}

export type HandleConfirmation = OutstandingBase & {
  mode: 'HANDLE'
  verifier: HandleVerifier
}

export type OAuthConfirmation = OutstandingBase & {
  mode: 'OAUTH'
  verifier: OAuthVerifier
  providerId: string
}

export type OutstandingConfirmation = HandleConfirmation | OAuthConfirmation

/** Omit that keeps the union branches apart (plain `Omit` merges them). */
type WithoutPlatformName<T> = T extends unknown ? Omit<T, 'platformName'> : never

/**
 * Completed steps whose platform can still check them, and which have neither
 * been confirmed nor already attempted. A public record is read through the
 * visitor's handle; an account-only step waits for the visitor to connect.
 */
export async function outstandingConfirmations(
  session: ConfirmableSession,
): Promise<OutstandingConfirmation[]> {
  const catalog = await getActionOptionMap()
  const actionCopy = await getTranslations('actions')
  const byAction = new Map(session.completions.map((row) => [row.linkActionId, row]))
  const found: WithoutPlatformName<OutstandingConfirmation>[] = []

  for (const action of session.link.actions) {
    const completion = byAction.get(action.id)
    // An existing proof means the lookup already ran; do not repeat it.
    if (!completion || completion.verified || completion.proof) continue
    const option = catalog.get(action.type)
    const platform = option?.platform
    const label =
      action.label?.trim() || (option ? actionLabel(option, actionCopy) : action.type)

    const handleVerifier = await activeVerifierFor(platform)
    if (handleVerifier && handleVerifier.mode === 'HANDLE') {
      if (!handleVerifier.actionTypes || handleVerifier.actionTypes.includes(action.type)) {
        const creator = handleVerifier.parseCreator(action.target)
        if (creator) {
          found.push({
            mode: 'HANDLE',
            actionId: action.id,
            actionType: action.type,
            label,
            platformKey: handleVerifier.platformKey,
            verifier: handleVerifier,
            creator,
          })
          continue
        }
      }
    }

    const accountVerifier = await activeOAuthVerifierForAction(platform, action.type)
    if (accountVerifier) {
      const creator = accountVerifier.parseCreator(action.target, action.type)
      if (creator) {
        found.push({
          mode: 'OAUTH',
          actionId: action.id,
          actionType: action.type,
          label,
          platformKey: accountVerifier.platformKey,
          verifier: accountVerifier,
          providerId: accountVerifier.provider,
          creator,
        })
      }
    }
  }

  if (!found.length) return []

  const rows = await prisma.platform.findMany({
    where: { key: { in: found.map((item) => item.platformKey) } },
    select: { key: true, label: true },
  })
  const nameByKey = new Map(rows.map((row) => [row.key, row.label]))

  return found.map((item) => ({
    ...item,
    platformName: nameByKey.get(item.platformKey) ?? item.platformKey,
  }))
}

/** Writes what a lookup found onto the step the visitor already opened. */
export async function recordConfirmation(
  sessionId: string,
  actionId: string,
  verified: boolean,
  proof: string,
): Promise<void> {
  await prisma.unlockActionCompletion.update({
    where: {
      unlockSessionId_linkActionId: { unlockSessionId: sessionId, linkActionId: actionId },
    },
    data: { verified, proof },
  })
}

/**
 * What the connect flow needs before sending the visitor to the provider: which
 * link page to come back to and which provider answers. Null when no
 * account-only step is waiting, so the routes never open a pointless consent.
 */
export async function readOAuthRequest(
  token: string,
): Promise<{ slug: string; provider: string } | null> {
  if (!token || token.length > 128) return null

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      expiresAt: true,
      link: {
        select: {
          slug: true,
          actions: { select: { id: true, type: true, label: true, target: true } },
        },
      },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
    },
  })
  if (!session || session.expiresAt.getTime() <= Date.now()) return null

  const outstanding = await outstandingConfirmations(session)
  const account = outstanding.find(
    (item): item is OAuthConfirmation => item.mode === 'OAUTH',
  )
  return account ? { slug: session.link.slug, provider: account.providerId } : null
}

export type OAuthVerifyResult = {
  slug: string | null
  /** Steps the signed-in account demonstrably has not done yet. */
  refused: string[]
  error: string | null
}

/**
 * Applies what the visitor's own account proves after the provider sends them
 * back. Verified steps get their proof; a step the account disagrees with stays
 * outstanding so the release keeps waiting; a lookup that failed is recorded as
 * unproven rather than reported as a cheat.
 */
export async function applyOAuthVerification(input: {
  token: string
  provider: string
  accessToken: string
}): Promise<OAuthVerifyResult> {
  const t = await getTranslations('errors')

  const session = await prisma.unlockSession.findUnique({
    where: { id: input.token },
    select: {
      id: true,
      expiresAt: true,
      link: {
        select: {
          slug: true,
          actions: { select: { id: true, type: true, label: true, target: true } },
        },
      },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
    },
  })
  if (!session) return { slug: null, refused: [], error: t('sessionExpiredReload') }
  if (session.expiresAt.getTime() <= Date.now()) {
    return { slug: session.link.slug, refused: [], error: t('sessionExpiredReloadLong') }
  }

  const limited = await consumeBySetting(
    `verify:${session.id}`,
    'limits.verifyPerMinute',
    8,
    60,
  )
  if (!limited.ok) {
    return { slug: session.link.slug, refused: [], error: t('rateLimited') }
  }

  const outstanding = (await outstandingConfirmations(session)).filter(
    (item): item is OAuthConfirmation =>
      item.mode === 'OAUTH' && item.providerId === input.provider,
  )

  const refused: string[] = []
  for (const item of outstanding) {
    const outcome = await item.verifier.check(input.accessToken, item.creator, item.actionType)

    if (outcome.status === 'VERIFIED') {
      await recordConfirmation(session.id, item.actionId, true, outcome.proof)
      continue
    }
    if (outcome.status === 'NOT_FOLLOWING') {
      refused.push(item.label)
      continue
    }
    await recordConfirmation(
      session.id,
      item.actionId,
      false,
      outcome.status === 'INVALID_HANDLE'
        ? `Not checked: ${item.platformName} did not recognise the creator`
        : `Not checked: ${item.platformName} did not answer`,
    )
  }

  return { slug: session.link.slug, refused, error: null }
}
