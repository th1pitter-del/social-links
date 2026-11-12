'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { getActionOptionMap } from '@/lib/action-catalog'
import { actionLabel } from '@/lib/action-label'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'
import { signVisitToken } from '@/lib/visit-token'
import { bindUnlockBrowser } from '@/lib/verification/oauth-state'
import { createHash } from 'node:crypto'
import {
  fetchOgadsOffers,
  getOgadsConfig,
  isOgadsReady,
  readStoredOffers,
} from '@/lib/ogads'
import { promoteIfComplete } from '@/lib/unlock-completion'
import {
  isUnlockLinkAvailable,
  isStepSettled,
  pollTelegramCheckin,
  settledActionIds,
  startTelegramCheckin,
  stepChecks,
  type StepCheck,
} from '@/lib/unlock-confirm'
import type { UnlockStatus } from '@/generated/prisma/enums'

const UNLOCK_SESSION_TTL_MS = 2 * 60 * 60 * 1000

/**
 * How a step is proven, when this install can prove it at all. Null means the
 * step is the ordinary single press it always was.
 */
export type StepVerificationView = {
  mode: 'OAUTH' | 'HANDOFF'
  platformKey: string
  /** OAUTH: where the visitor grants read access to their own account. */
  connectUrl: string | null
}

export type UnlockActionView = {
  id: string
  type: string
  label: string
  target: string
  completed: boolean
  /** The visitor has opened the step, even if its proof is still outstanding. */
  opened: boolean
  behavior: 'URL' | 'EMAIL'
  icon: string
  platform: string | null
  /** Signed redirect that records a website visit; null for other steps. */
  visitUrl: string | null
  verification: StepVerificationView | null
}

function verificationView(
  check: StepCheck | undefined,
  sessionId: string,
): StepVerificationView | null {
  if (!check) return null
  return {
    mode: check.mode,
    platformKey: check.platformKey,
    connectUrl:
      check.mode === 'OAUTH'
        ? `/api/verify/start?token=${encodeURIComponent(sessionId)}&provider=${encodeURIComponent(check.providerId)}`
        : null,
  }
}

/** One OGAds offer shown as part of the single "complete any offer" step. */
export type UnlockOfferView = {
  id: string
  name: string
  credited: boolean
  /** Server redirect that mints the attributed smartlink; null once credited. */
  clickUrl: string | null
}

export type UnlockState = {
  token: string
  linkTitle: string
  status: UnlockStatus
  expired: boolean
  actions: UnlockActionView[]
  offers: UnlockOfferView[]
  /** True when every offer step is done (or there is none to do). */
  offersSatisfied: boolean
  allActionsCompleted: boolean
  canUnlock: boolean
  expiresAt: string
}

function hashVisitorIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.BETTER_AUTH_SECRET ?? 'linkunlock'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export type StartUnlockResult =
  | { ok: true; state: UnlockState }
  | { ok: false; error: string }

async function getClientContext() {
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? null
  const userAgent = headerList.get('user-agent')
  const referrer = headerList.get('referer')
  return { ip, userAgent, referrer }
}

function generateToken() {
  return randomBytes(24).toString('base64url')
}

async function buildState(sessionId: string): Promise<UnlockState | null> {
  const session = await prisma.unlockSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      link: {
        select: {
          title: true,
          status: true,
          expiresAt: true,
          ownerId: true,
          actions: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              type: true,
              label: true,
              target: true,
            },
          },
        },
      },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
      ogadsOffers: true,
      ogadsClicks: { select: { offerId: true, status: true } },
    },
  })

  if (!session) return null

  const byAction = new Map(session.completions.map((row) => [row.linkActionId, row]))
  const checks = await stepChecks(session.link.actions)
  const credited = new Set(
    session.ogadsClicks.filter((row) => row.status === 'CREDITED').map((row) => row.offerId),
  )
  const now = Date.now()
  const expired = session.expiresAt.getTime() <= now || !(await isUnlockLinkAvailable(session.link))
  const catalog = await getActionOptionMap()
  const actionCopy = await getTranslations('actions')
  const actions: UnlockActionView[] = session.link.actions.map((action) => {
    const option = catalog.get(action.type)
    const completion = byAction.get(action.id)
    const check = checks.get(action.id)

    return {
      id: action.id,
      type: action.type,
      label:
        action.label?.trim() ||
        (option ? actionLabel(option, actionCopy) : action.type),
      target: action.target,
      completed: isStepSettled(completion, Boolean(check)),
      opened: Boolean(completion),
      behavior: option?.behavior ?? 'URL',
      icon: option?.icon ?? 'link',
      platform: option?.platform ?? null,
      verification: verificationView(check, session.id),
      visitUrl:
        action.type === 'VISIT'
          ? (() => {
              const token = signVisitToken({ sessionId: session.id, actionId: action.id })
              return token ? `/go?t=${encodeURIComponent(token)}` : null
            })()
          : null,
    }
  })

  const allActionsCompleted = actions.every((action) => action.completed)
  const offers: UnlockOfferView[] = readStoredOffers(session.ogadsOffers).map((offer) => {
    const done = credited.has(offer.id)
    return {
      id: offer.id,
      name: offer.name,
      credited: done,
      clickUrl: done ? null : `/o/${encodeURIComponent(session.id)}/${encodeURIComponent(offer.id)}`,
    }
  })
  const offersSatisfied = offers.length === 0 || offers.some((offer) => offer.credited)
  const verified = session.status === 'VERIFIED'

  return {
    token: session.id,
    linkTitle: session.link.title,
    status: expired ? 'EXPIRED' : session.status,
    expired,
    actions,
    offers,
    offersSatisfied,
    allActionsCompleted,
    canUnlock: !expired && allActionsCompleted && offersSatisfied && verified,
    expiresAt: session.expiresAt.toISOString(),
  }
}

export async function getUnlockState(token: string): Promise<UnlockState | null> {
  if (!token || token.length > 128) return null
  await promoteIfComplete(token)
  return buildState(token)
}

/**
 * Creates a fresh visitor unlock session.
 *
 * `preview: true` lets a link owner walk through an unpublished link. It is
 * server-authorized against the link owner, never recorded in analytics, and
 * cannot be used by visitors or for disabled links.
 */
export async function startUnlock(
  slug: string,
  options: { preview?: boolean } = {},
): Promise<StartUnlockResult> {
  const t = await getTranslations('errors')
  const { ip, userAgent, referrer } = await getClientContext()
  const preview = options.preview === true

  const limited = await consumeBySetting(
    `unlock:start:${hashVisitorIp(ip) ?? 'anon'}`,
    'limits.unlockStartPerMinute',
    30,
    60,
  )
  if (!limited.ok) {
    return { ok: false, error: t('rateLimited') }
  }

  const link = await prisma.link.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      status: true,
      expiresAt: true,
      actions: { select: { id: true } },
    },
  })

  if (!link) {
    return { ok: false, error: t('linkNotAvailable') }
  }

  if (preview) {
    const session = await getSession()
    if (!session || session.user.id !== link.ownerId || link.status === 'DISABLED') {
      return { ok: false, error: t('linkNotAvailable') }
    }
  } else if (link.status !== 'ACTIVE') {
    return { ok: false, error: t('linkNotAvailable') }
  }

  if (!preview && link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('linkExpired') }
  }

  const session = await prisma.unlockSession.create({
    data: {
      id: generateToken(),
      linkId: link.id,
      status: link.actions.length === 0 ? 'VERIFIED' : 'PENDING',
      ipHash: hashVisitorIp(ip),
      userAgent: userAgent?.slice(0, 500) ?? null,
      referrer: referrer?.slice(0, 500) ?? null,
      expiresAt: new Date(Date.now() + UNLOCK_SESSION_TTL_MS),
    },
    select: { id: true },
  })

  if (!preview) {
    await prisma.analyticsEvent.createMany({
      data: [
        { linkId: link.id, unlockSessionId: session.id, type: 'VIEW', ipHash: hashVisitorIp(ip) },
        { linkId: link.id, unlockSessionId: session.id, type: 'UNLOCK_START' },
      ],
    })
  }

  // Offers are part of the unlock only when the link asks for other tasks. Their
  // smartlinks are minted per session, so the snapshot is fetched here with this
  // session id as aff_sub4; a failure leaves the unlock working without the step.
  if (link.actions.length > 0) {
    const ogads = await getOgadsConfig()
    if (isOgadsReady(ogads)) {
      try {
        const offers = await fetchOgadsOffers({ ip, userAgent, affSub4: session.id })
        if (offers.length > 0) {
          await prisma.unlockSession.update({
            where: { id: session.id },
            data: { ogadsOffers: offers.map(({ id, name }) => ({ id, name })) },
          })
        }
      } catch (error) {
        console.error('[ogads] could not load offers for session', session.id, error)
      }
    }
  }

  await bindUnlockBrowser(session.id)
  const state = await buildState(session.id)
  if (!state) {
    return { ok: false, error: t('startSessionFailed') }
  }
  return { ok: true, state }
}

/**
 * Marks a creator-configured action as done for a visitor session.
 */
export async function markActionComplete(input: {
  token: string
  actionId: string
  email?: string
  consent?: boolean
}): Promise<{ ok: true; state: UnlockState } | { ok: false; error: string }> {
  const { token, actionId } = input
  const t = await getTranslations('errors')

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      linkId: true,
      status: true,
      expiresAt: true,
      link: { select: {
        status: true, expiresAt: true, ownerId: true,
        actions: { select: { id: true, type: true } },
      } },
      completions: { select: { linkActionId: true, verified: true } },
    },
  })
  if (!session) return { ok: false, error: t('sessionExpiredReload') }
  if (session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('sessionExpiredReloadLong') }
  }

  if (!(await isUnlockLinkAvailable(session.link))) return { ok: false, error: t('linkNotAvailable') }
  const action = session.link.actions.find((candidate) => candidate.id === actionId)
  if (!action) return { ok: false, error: t('unknownAction') }

  const option = (await getActionOptionMap()).get(action.type)
  const behavior = option?.behavior ?? 'URL'

  if (behavior === 'URL' && action.type === 'VISIT') {
    // A visit is proven by the server-side redirect, so no client call can
    // complete one on its own.
    const visit = session.completions.find((row) => row.linkActionId === action.id)
    if (!visit?.verified) return { ok: false, error: t('openStepFirst') }
  }

  if (behavior === 'EMAIL') {
    const email = input.email?.trim().toLowerCase() ?? ''
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!valid || input.consent !== true) {
      return { ok: false, error: t('emailConsentRequired') }
    }
    await prisma.emailLead.upsert({
      where: { linkId_email: { linkId: session.linkId, email } },
      create: { linkId: session.linkId, email },
      update: {},
    })
  }

  await prisma.unlockActionCompletion.upsert({
    where: { unlockSessionId_linkActionId: { unlockSessionId: token, linkActionId: actionId } },
    create: { unlockSessionId: token, linkActionId: actionId },
    update: {},
  })

  await prisma.analyticsEvent.create({
    data: { linkId: session.linkId, unlockSessionId: token, type: 'ACTION_DONE' },
  })

  await promoteIfComplete(token)

  const state = await buildState(token)
  if (!state) return { ok: false, error: t('updateSessionFailed') }
  return { ok: true, state }
}

type StepResult = { ok: true; state: UnlockState } | { ok: false; error: string }

/** The live session and one of its steps, or the reason the check cannot run. */
async function readStep(token: string, actionId: string) {
  const t = await getTranslations('errors')
  const fail = (error: string) => ({ ok: false as const, error })
  if (!token || token.length > 128) return fail(t('sessionExpiredReload'))

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      expiresAt: true,
      link: { select: {
        status: true, expiresAt: true, ownerId: true,
        actions: { select: { id: true, type: true, target: true } },
      } },
      completions: { select: { linkActionId: true } },
    },
  })
  if (!session) return fail(t('sessionExpiredReload'))
  if (session.expiresAt.getTime() <= Date.now()) return fail(t('sessionExpiredReloadLong'))
  if (!(await isUnlockLinkAvailable(session.link))) return fail(t('linkNotAvailable'))

  const action = session.link.actions.find((candidate) => candidate.id === actionId)
  if (!action) return fail(t('unknownAction'))
  // The step is opened first: a check before the visitor has even been to the
  // platform would only ever refuse them.
  if (!session.completions.some((row) => row.linkActionId === actionId)) {
    return fail(t('openStepFirst'))
  }
  return { ok: true as const, session, action }
}

async function stepResult(token: string, result: { ok: boolean; error?: string }): Promise<StepResult> {
  if (!result.ok) return { ok: false, error: result.error ?? '' }
  await promoteIfComplete(token)
  const state = await buildState(token)
  if (!state) {
    const t = await getTranslations('errors')
    return { ok: false, error: t('updateSessionFailed') }
  }
  return { ok: true, state }
}

/** Mints the Telegram check-in link the visitor opens to name their account. */
export async function beginTelegramCheckin(input: {
  token: string
  actionId: string
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const read = await readStep(input.token, input.actionId)
  if (!read.ok) return { ok: false, error: read.error }
  return startTelegramCheckin({ sessionId: read.session.id, action: read.action })
}

/** One look at whether the visitor has opened the bot and joined the chat. */
export async function pollTelegramStep(input: {
  token: string
  actionId: string
}): Promise<{ ok: true; done: boolean; state: UnlockState } | { ok: false; error: string }> {
  const read = await readStep(input.token, input.actionId)
  if (!read.ok) return { ok: false, error: read.error }

  const check = (await stepChecks([read.action])).get(read.action.id)
  if (!check) {
    const result = await stepResult(input.token, { ok: true })
    return result.ok ? { ...result, done: true } : result
  }
  if (check.mode !== 'HANDOFF') {
    const t = await getTranslations('errors')
    return { ok: false, error: t('unknownAction') }
  }
  const polled = await pollTelegramCheckin({ sessionId: read.session.id, actionId: input.actionId })
  if (!polled.ok) return { ok: false, error: polled.error }

  const result = await stepResult(input.token, { ok: true })
  if (!result.ok) return result
  return { ok: true, done: polled.done, state: result.state }
}
/**
 * Returns the protected payload when all actions are completed.
 */
export async function claimContent(
  token: string,
): Promise<
  | { ok: true; contentType: 'URL' | 'TEXT' | 'FILE'; targetUrl: string | null; textContent: string | null; file?: { filename: string; size: number; downloadUrl: string } }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')
  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      linkId: true,
      status: true,
      expiresAt: true,
      completions: { select: { linkActionId: true, verified: true, proof: true } },
      link: {
        select: {
          status: true,
          expiresAt: true,
          ownerId: true,
          fileId: true,
          contentType: true,
          targetUrl: true,
          textContent: true,
          actions: { select: { id: true, type: true, label: true, target: true } },
        },
      },
    },
  })

  if (!session) return { ok: false, error: t('sessionExpired') }
  if (session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('sessionExpiredLong') }
  }
  if (!(await isUnlockLinkAvailable(session.link))) return { ok: false, error: t('linkNotAvailable') }
  if (session.status !== 'VERIFIED') {
    return { ok: false, error: t('completeAllSteps') }
  }

  const settled = await settledActionIds(session)
  if (!session.link.actions.every((action) => settled.has(action.id))) {
    return { ok: false, error: t('completeAllSteps') }
  }
  await prisma.analyticsEvent.create({
    data: { linkId: session.linkId, unlockSessionId: session.id, type: 'UNLOCK_COMPLETE' },
  })

  // Record a persistent "My unlocks" entry for signed-in users.
  try {
    const { getSession } = await import('@/lib/session')
    const userSession = await getSession()
    if (userSession) {
      await prisma.userUnlock.upsert({
        where: { userId_linkId: { userId: userSession.user.id, linkId: session.linkId } },
        create: { userId: userSession.user.id, linkId: session.linkId },
        update: {},
      })
    }
  } catch {
    // Non-fatal
  }

  revalidatePath('/dashboard')

  let file: { filename: string; size: number; downloadUrl: string } | undefined
  if (session.link.contentType === 'FILE') {
    if (!session.link.fileId) {
      // The stored file was deleted after this session was verified.
      return { ok: false, error: t('linkNotAvailable') }
    }
    const fileRow = await prisma.storedFile.findUnique({
      where: { id: session.link.fileId },
      select: { id: true, filename: true, size: true },
    })
    if (fileRow) {
      file = { filename: fileRow.filename, size: fileRow.size, downloadUrl: `/api/unlock/${session.id}/download` }
    }
  }

  return {
    ok: true,
    contentType: session.link.contentType as 'URL' | 'TEXT' | 'FILE',
    targetUrl: session.link.targetUrl,
    textContent: session.link.textContent,
    file,
  }
}
