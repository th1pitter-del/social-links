'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { getActionOptionMap } from '@/lib/action-catalog'
import { actionLabel } from '@/lib/action-label'
import {
  buildCheckinLink,
  findCheckinVisitor,
  getBotUsername,
  isTelegramConfigured,
  normalizeHandle,
  readMemberStatus,
  verifierFor,
} from '@/lib/verification'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'
import { createHash } from 'node:crypto'
import type { UnlockStatus } from '@/generated/prisma/enums'
import {
  outstandingConfirmations,
  recordConfirmation,
  type HandleConfirmation,
} from '@/lib/unlock-confirm'

const UNLOCK_SESSION_TTL_MS = 2 * 60 * 60 * 1000

export type UnlockActionView = {
  id: string
  type: string
  label: string
  target: string
  completed: boolean
  behavior: 'URL' | 'EMAIL'
  icon: string
  platform: string | null
}

export type UnlockState = {
  token: string
  linkTitle: string
  status: UnlockStatus
  expired: boolean
  actions: UnlockActionView[]
  allActionsCompleted: boolean
  canUnlock: boolean
  /**
   * A step whose platform publishes a record we can read is still unconfirmed.
   * The visitor sees this as one quiet profile field at the moment of release,
   * never as a per-step ceremony.
   */
  requiresProfileConfirm: boolean
  /** Format the outstanding platform expects, shown in the profile field. */
  profileHandleExample: string | null
  /**
   * A step whose platform answers only for the visitor's signed-in account is
   * still unconfirmed. The visitor connects the provider once at release.
   */
  requiresAccountConfirm: boolean
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
          actions: {
            orderBy: { position: 'asc' },
            select: { id: true, type: true, label: true, target: true },
          },
        },
      },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
    },
  })

  if (!session) return null

  const completed = new Set(session.completions.map((row) => row.linkActionId))
  const expired = session.expiresAt.getTime() <= Date.now()
  const catalog = await getActionOptionMap()
  const actionCopy = await getTranslations('actions')
  const actions: UnlockActionView[] = session.link.actions.map((action) => {
    const option = catalog.get(action.type)
    return {
      id: action.id,
      type: action.type,
      label:
        action.label?.trim() ||
        (option ? actionLabel(option, actionCopy) : action.type),
      target: action.target,
      completed: completed.has(action.id),
      behavior: option?.behavior ?? 'URL',
      icon: option?.icon ?? 'link',
      platform: option?.platform ?? null,
    }
  })

  const allActionsCompleted = actions.every((action) => action.completed)
  const verified = session.status === 'VERIFIED'
  const outstanding = await outstandingConfirmations(session)
  const handleOutstanding = outstanding.filter(
    (item): item is HandleConfirmation => item.mode === 'HANDLE',
  )

  return {
    token: session.id,
    linkTitle: session.link.title,
    status: expired ? 'EXPIRED' : session.status,
    expired,
    actions,
    allActionsCompleted,
    canUnlock: !expired && allActionsCompleted && verified,
    requiresProfileConfirm: handleOutstanding.length > 0,
    profileHandleExample: handleOutstanding[0]?.verifier.handleExample ?? null,
    requiresAccountConfirm: outstanding.some((item) => item.mode === 'OAUTH'),
    expiresAt: session.expiresAt.toISOString(),
  }
}

export async function getUnlockState(token: string): Promise<UnlockState | null> {
  if (!token || token.length > 128) return null
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
      link: { select: { actions: { select: { id: true, type: true } } } },
    },
  })
  if (!session) return { ok: false, error: t('sessionExpiredReload') }
  if (session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('sessionExpiredReloadLong') }
  }

  const action = session.link.actions.find((candidate) => candidate.id === actionId)
  if (!action) return { ok: false, error: t('unknownAction') }

  const option = (await getActionOptionMap()).get(action.type)
  const behavior = option?.behavior ?? 'URL'
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

  await promoteIfComplete(token, session.link.actions.map((candidate) => candidate.id))

  const state = await buildState(token)
  if (!state) return { ok: false, error: t('updateSessionFailed') }
  return { ok: true, state }
}

/** Moves a session to VERIFIED once every configured action has a completion row. */
async function promoteIfComplete(sessionId: string, actionIds: string[]): Promise<void> {
  const completions = await prisma.unlockActionCompletion.findMany({
    where: { unlockSessionId: sessionId },
    select: { linkActionId: true },
  })
  const completedSet = new Set(completions.map((row) => row.linkActionId))
  if (actionIds.every((id) => completedSet.has(id))) {
    await prisma.unlockSession.update({
      where: { id: sessionId },
      data: { status: 'VERIFIED' },
    })
  }
}

/** Records a platform-confirmed completion and reveals the content if nothing is left. */
async function settleVerified(input: {
  sessionId: string
  linkId: string
  actionId: string
  actionIds: string[]
  proof: string
}): Promise<void> {
  await prisma.unlockActionCompletion.upsert({
    where: {
      unlockSessionId_linkActionId: {
        unlockSessionId: input.sessionId,
        linkActionId: input.actionId,
      },
    },
    create: {
      unlockSessionId: input.sessionId,
      linkActionId: input.actionId,
      verified: true,
      proof: input.proof,
    },
    update: { verified: true, proof: input.proof },
  })

  await prisma.analyticsEvent.create({
    data: { linkId: input.linkId, unlockSessionId: input.sessionId, type: 'ACTION_DONE' },
  })

  await promoteIfComplete(input.sessionId, input.actionIds)
}

export type ConfirmProfileResult =
  | { ok: true; state: UnlockState }
  | { ok: false; error: string }

/**
 * The quiet confirmation. The visitor names one profile and we read that
 * account's public record for every step that can be read, without them seeing
 * a ceremony per step. Only a real account that demonstrably does not follow
 * stops the release; a handle the platform does not know, or a lookup that
 * failed, is recorded as unproven and never reported as a cheat.
 */
export async function confirmProfile(input: {
  token: string
  handle: string
}): Promise<ConfirmProfileResult> {
  const { token } = input
  const t = await getTranslations('errors')
  const handle = normalizeHandle(input.handle)
  if (!handle) return { ok: false, error: t('confirmHandleRequired') }

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      linkId: true,
      expiresAt: true,
      link: {
        select: {
          actions: { select: { id: true, type: true, label: true, target: true } },
        },
      },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
    },
  })
  if (!session) return { ok: false, error: t('sessionExpiredReload') }
  if (session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('sessionExpiredReloadLong') }
  }

  // Only a public-record step can be answered by naming a profile; the
  // account-only steps wait for their own connect flow below.
  const outstanding = (await outstandingConfirmations(session)).filter(
    (item): item is HandleConfirmation => item.mode === 'HANDLE',
  )
  if (!outstanding.length) {
    const built = await buildState(token)
    return built ? { ok: true, state: built } : { ok: false, error: t('updateSessionFailed') }
  }

  const limited = await consumeBySetting(
    `verify:${token}`,
    'limits.verifyPerMinute',
    8,
    60,
  )
  if (!limited.ok) return { ok: false, error: t('rateLimited') }

  // One handle names one account. When steps from several platforms are
  // outstanding, the same string cannot answer for all of them, so each
  // confirmation settles the first platform and the next field asks for the
  // next one with its own format hint.
  const platformKey = outstanding[0].platformKey
  const batch = outstanding.filter((item) => item.platformKey === platformKey)

  const refused: string[] = []
  for (const item of batch) {
    const outcome = await item.verifier.check(handle, item.creator, item.actionType)

    if (outcome.status === 'VERIFIED') {
      await recordConfirmation(token, item.actionId, true, outcome.proof)
      continue
    }
    if (outcome.status === 'NOT_FOLLOWING') {
      refused.push(item.label)
      continue
    }
    await recordConfirmation(
      token,
      item.actionId,
      false,
      outcome.status === 'INVALID_HANDLE'
        ? `Not checked: no ${item.platformName} profile named ${handle}`
        : `Not checked: ${item.platformName} did not answer`,
    )
  }

  if (refused.length) {
    return { ok: false, error: t('confirmNotFollowing', { handle, steps: refused.join(', ') }) }
  }

  const built = await buildState(token)
  if (!built) return { ok: false, error: t('updateSessionFailed') }
  return { ok: true, state: built }
}

const TELEGRAM_CHECKIN_TTL_MS = 30 * 60 * 1000

type TelegramContext = {
  sessionId: string
  linkId: string
  actionId: string
  actionIds: string[]
  chatId: string
}

/** Resolves the session, the step and the channel its target points at. */
async function telegramContext(
  token: string,
  actionId: string,
): Promise<TelegramContext | { error: string }> {
  const t = await getTranslations('errors')

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      linkId: true,
      expiresAt: true,
      link: { select: { actions: { select: { id: true, type: true, target: true } } } },
    },
  })
  if (!session) return { error: t('sessionExpiredReload') }
  if (session.expiresAt.getTime() <= Date.now()) return { error: t('sessionExpiredReloadLong') }

  const action = session.link.actions.find((candidate) => candidate.id === actionId)
  if (!action) return { error: t('unknownAction') }

  const option = (await getActionOptionMap()).get(action.type)
  const verifier = verifierFor(option?.platform)
  if (!verifier || verifier.platformKey !== 'telegram') return { error: t('unknownAction') }
  if (!(await isTelegramConfigured())) return { error: t('telegramNotConfigured') }

  const chatId = verifier.parseCreator(action.target)
  if (!chatId) return { error: t('verifierTargetInvalid') }

  return {
    sessionId: session.id,
    linkId: session.linkId,
    actionId,
    actionIds: session.link.actions.map((candidate) => candidate.id),
    chatId,
  }
}

export type BeginCheckinResult =
  | { ok: true; checkinId: string; startUrl: string }
  | { ok: false; error: string }

/**
 * Opens a check-in for a Telegram step. The id is what the bot deep link
 * carries, so the account we later read out of the bot's queue is bound to this
 * session and step and cannot be claimed by someone else.
 */
export async function beginTelegramCheckin(input: {
  token: string
  actionId: string
}): Promise<BeginCheckinResult> {
  const t = await getTranslations('errors')
  const context = await telegramContext(input.token, input.actionId)
  if ('error' in context) return { ok: false, error: context.error }

  const botUsername = await getBotUsername()
  if (!botUsername) return { ok: false, error: t('telegramNotConfigured') }

  const checkinId = randomBytes(12).toString('base64url')
  await prisma.telegramCheckin.create({
    data: {
      id: checkinId,
      unlockSessionId: context.sessionId,
      linkActionId: context.actionId,
      chatId: context.chatId,
      expiresAt: new Date(Date.now() + TELEGRAM_CHECKIN_TTL_MS),
    },
  })

  return { ok: true, checkinId, startUrl: buildCheckinLink(botUsername, checkinId) }
}

/**
 * Reads the bot's queue for the check-in and asks Telegram itself whether that
 * account is in the channel. Until the queue shows the visit the step stays
 * open, so a visitor is never told they cheated just because they checked too
 * early.
 */
export type CheckinResult =
  | { ok: true; state: UnlockState }
  | { ok: false; error: string; reason?: 'NOT_FOLLOWING' | 'UNAVAILABLE' }

export async function completeTelegramCheckin(input: {
  token: string
  actionId: string
  checkinId: string
}): Promise<CheckinResult> {
  const t = await getTranslations('errors')
  const context = await telegramContext(input.token, input.actionId)
  if ('error' in context) return { ok: false, error: context.error }

  const checkin = await prisma.telegramCheckin.findUnique({
    where: { id: input.checkinId },
    select: { id: true, unlockSessionId: true, linkActionId: true, expiresAt: true },
  })
  if (
    !checkin ||
    checkin.unlockSessionId !== context.sessionId ||
    checkin.linkActionId !== context.actionId
  ) {
    return { ok: false, error: t('telegramCheckinStale') }
  }
  if (checkin.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: t('telegramCheckinStale') }
  }

  const limited = await consumeBySetting(
    `verify:${context.sessionId}`,
    'limits.verifyPerMinute',
    8,
    60,
  )
  if (!limited.ok) return { ok: false, error: t('rateLimited') }

  const visitor = await findCheckinVisitor(checkin.id)
  if (visitor === 'UNAVAILABLE') {
    return { ok: false, error: t('verifyUnavailable'), reason: 'UNAVAILABLE' }
  }
  if (visitor === 'NOT_SEEN') {
    return { ok: false, error: t('telegramWaiting'), reason: 'UNAVAILABLE' }
  }

  await prisma.telegramCheckin.update({
    where: { id: checkin.id },
    data: { userId: visitor.userId, username: visitor.username },
  })

  const outcome = await readMemberStatus(context.chatId, visitor)

  if (outcome.status !== 'VERIFIED') {
    if (outcome.status === 'NOT_FOLLOWING') {
      await prisma.telegramCheckin.update({
        where: { id: checkin.id },
        data: { memberStatus: 'NOT_MEMBER' },
      })
      return { ok: false, error: t('telegramNotMember'), reason: 'NOT_FOLLOWING' }
    }
    return { ok: false, error: t('verifyUnavailable'), reason: 'UNAVAILABLE' }
  }

  await prisma.telegramCheckin.update({
    where: { id: checkin.id },
    data: { memberStatus: 'MEMBER' },
  })

  await settleVerified({
    sessionId: context.sessionId,
    linkId: context.linkId,
    actionId: context.actionId,
    actionIds: context.actionIds,
    proof: outcome.proof,
  })

  const state = await buildState(context.sessionId)
  if (!state) return { ok: false, error: t('updateSessionFailed') }
  return { ok: true, state }
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
  if (session.status !== 'VERIFIED') {
    return { ok: false, error: t('completeAllSteps') }
  }

  const completed = new Set(session.completions.map((row) => row.linkActionId))
  if (!session.link.actions.every((action) => completed.has(action.id))) {
    return { ok: false, error: t('completeAllSteps') }
  }
  // The quiet confirmation is part of the gate, not just of the interface.
  if ((await outstandingConfirmations(session)).length > 0) {
    return { ok: false, error: t('confirmProfileRequired') }
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
