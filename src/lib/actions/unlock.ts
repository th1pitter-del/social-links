'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { getActionOptionMap } from '@/lib/action-catalog'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'
import { createHash } from 'node:crypto'
import type { UnlockStatus } from '@/generated/prisma/enums'

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
      completions: { select: { linkActionId: true } },
    },
  })

  if (!session) return null

  const completed = new Set(session.completions.map((row) => row.linkActionId))
  const expired = session.expiresAt.getTime() <= Date.now()
  const catalog = await getActionOptionMap()
  const actions: UnlockActionView[] = session.link.actions.map((action) => {
    const option = catalog.get(action.type)
    return {
      id: action.id,
      type: action.type,
      label: action.label?.trim() || option?.label || action.type,
      target: action.target,
      completed: completed.has(action.id),
      behavior: option?.behavior ?? 'URL',
      icon: option?.icon ?? 'link',
      platform: option?.platform ?? null,
    }
  })

  const allActionsCompleted = actions.every((action) => action.completed)
  const verified = session.status === 'VERIFIED'

  return {
    token: session.id,
    linkTitle: session.link.title,
    status: expired ? 'EXPIRED' : session.status,
    expired,
    actions,
    allActionsCompleted,
    canUnlock: !expired && allActionsCompleted && verified,
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

  const behavior = (await getActionOptionMap()).get(action.type)?.behavior ?? 'URL'
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

  const allActions = session.link.actions
  const completions = await prisma.unlockActionCompletion.findMany({
    where: { unlockSessionId: token },
    select: { linkActionId: true },
  })
  const completedSet = new Set(completions.map((c) => c.linkActionId))
  if (allActions.every((a) => completedSet.has(a.id))) {
    await prisma.unlockSession.update({
      where: { id: token },
      data: { status: 'VERIFIED' },
    })
  }

  const state = await buildState(token)
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
      completions: { select: { linkActionId: true } },
      link: {
        select: {
          fileId: true,
          contentType: true,
          targetUrl: true,
          textContent: true,
          actions: { select: { id: true } },
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
