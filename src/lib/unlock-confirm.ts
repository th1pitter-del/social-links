import 'server-only'

import { randomBytes } from 'node:crypto'
import { getTranslations } from 'next-intl/server'

import { getActionOptionMap } from '@/lib/action-catalog'
import { prisma } from '@/lib/prisma'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'
import {
  activeOAuthVerifierForAction,
  activeVerifierFor,
  buildCheckinLink,
  findCheckinVisitor,
  getBotUsername,
  readMemberStatus,
  type OAuthVerifier,
} from '@/lib/verification'

export type CheckableAction = { id: string; type: string; target: string }
export type StepCheck =
  | { mode: 'OAUTH'; platformKey: string; creator: string; providerId: string; verifier: OAuthVerifier }
  | { mode: 'HANDOFF'; platformKey: string; creator: string }

export async function isUnlockLinkAvailable(link: {
  status: string
  expiresAt: Date | null
  ownerId: string | null
}): Promise<boolean> {
  if (link.status === 'DISABLED') return false
  if (link.status === 'DRAFT') {
    const session = await getSession()
    return Boolean(session && session.user.id === link.ownerId)
  }
  return link.status === 'ACTIVE' && (!link.expiresAt || link.expiresAt.getTime() > Date.now())
}

export async function stepChecks(actions: CheckableAction[]): Promise<Map<string, StepCheck>> {
  const found = new Map<string, StepCheck>()
  if (actions.length === 0) return found
  const catalog = await getActionOptionMap()

  for (const action of actions) {
    const platform = catalog.get(action.type)?.platform
    if (!platform) continue
    const account = await activeOAuthVerifierForAction(platform, action.type)
    if (account) {
      const creator = account.parseCreator(action.target, action.type)
      if (creator) {
        found.set(action.id, {
          mode: 'OAUTH', platformKey: account.platformKey, creator,
          providerId: account.provider, verifier: account,
        })
        continue
      }
    }
    const handoff = await activeVerifierFor(platform, action.type)
    const creator = handoff?.parseCreator(action.target)
    if (handoff && creator) {
      found.set(action.id, { mode: 'HANDOFF', platformKey: handoff.platformKey, creator })
    }
  }
  return found
}

export type StepCompletion = { linkActionId: string; verified: boolean; proof: string | null }

export function isStepSettled(completion: StepCompletion | undefined, checkable: boolean): boolean {
  return Boolean(completion && (!checkable || completion.verified))
}

export async function settledActionIds(session: {
  link: { actions: CheckableAction[] }
  completions: StepCompletion[]
}): Promise<Set<string>> {
  const checks = await stepChecks(session.link.actions)
  const byAction = new Map(session.completions.map((row) => [row.linkActionId, row]))
  return new Set(session.link.actions
    .filter((action) => isStepSettled(byAction.get(action.id), checks.has(action.id)))
    .map((action) => action.id))
}

async function recordProof(sessionId: string, actionId: string, verified: boolean, proof: string) {
  await prisma.unlockActionCompletion.updateMany({
    where: { unlockSessionId: sessionId, linkActionId: actionId, verified: false },
    data: { verified, proof },
  })
}

async function unchecked(sessionId: string, actionId: string, platform: string) {
  await recordProof(sessionId, actionId, false, `Not checked: ${platform} did not answer`)
}

async function verifyBudget(sessionId: string): Promise<boolean> {
  return (await consumeBySetting(`verify:${sessionId}`, 'limits.verifyPerMinute', 8, 60)).ok
}

const CHECKIN_TTL_MS = 15 * 60 * 1000

export async function startTelegramCheckin(input: {
  sessionId: string
  action: CheckableAction
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const t = await getTranslations('errors')
  const check = (await stepChecks([input.action])).get(input.action.id)
  if (!check || check.mode !== 'HANDOFF') return { ok: false, error: t('verifyUnavailable') }
  if (!(await verifyBudget(input.sessionId))) return { ok: false, error: t('rateLimited') }
  const bot = await getBotUsername()
  if (!bot) return { ok: false, error: t('verifyUnavailable') }
  const existing = await prisma.telegramCheckin.findFirst({
    where: {
      unlockSessionId: input.sessionId, linkActionId: input.action.id,
      chatId: check.creator, expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  const nonce = existing?.id ?? (await prisma.telegramCheckin.create({
    data: {
      id: randomBytes(16).toString('base64url'), unlockSessionId: input.sessionId,
      linkActionId: input.action.id, chatId: check.creator,
      expiresAt: new Date(Date.now() + CHECKIN_TTL_MS),
    },
    select: { id: true },
  })).id
  return { ok: true, url: buildCheckinLink(bot, nonce) }
}

export async function pollTelegramCheckin(input: {
  sessionId: string
  actionId: string
}): Promise<{ ok: true; done: boolean } | { ok: false; error: string }> {
  const t = await getTranslations('errors')
  const checkin = await prisma.telegramCheckin.findFirst({
    where: { unlockSessionId: input.sessionId, linkActionId: input.actionId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, chatId: true, expiresAt: true },
  })
  if (!checkin) return { ok: false, error: t('verifyUnavailable') }
  if (checkin.expiresAt.getTime() <= Date.now()) return { ok: false, error: t('telegramCheckinExpired') }
  if (!(await verifyBudget(input.sessionId))) return { ok: false, error: t('rateLimited') }
  const visitor = await findCheckinVisitor(checkin.id)
  if (visitor === 'NOT_SEEN') return { ok: true, done: false }
  if (visitor === 'UNAVAILABLE') {
    await unchecked(input.sessionId, input.actionId, 'telegram')
    return { ok: false, error: t('verifyUnavailable') }
  }
  const outcome = await readMemberStatus(checkin.chatId, visitor)
  if (outcome.status === 'VERIFIED') {
    await prisma.telegramCheckin.update({ where: { id: checkin.id }, data: { memberStatus: 'member' } })
    await recordProof(input.sessionId, input.actionId, true, outcome.proof)
    return { ok: true, done: true }
  }
  if (outcome.status === 'NOT_FOLLOWING') return { ok: false, error: t('verifyNotDone') }
  await unchecked(input.sessionId, input.actionId, 'telegram')
  return { ok: false, error: t('verifyUnavailable') }
}

async function readSession(token: string) {
  if (!token || token.length > 128) return null
  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true, expiresAt: true,
      link: { select: {
        slug: true, status: true, expiresAt: true, ownerId: true,
        actions: { select: { id: true, type: true, target: true } },
      } },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
    },
  })
  if (!session || session.expiresAt.getTime() <= Date.now()) return null
  return await isUnlockLinkAvailable(session.link) ? session : null
}

export async function readOAuthRequest(token: string, providerId: string): Promise<{ slug: string } | null> {
  const session = await readSession(token)
  if (!session) return null
  const checks = await stepChecks(session.link.actions)
  const byAction = new Map(session.completions.map((row) => [row.linkActionId, row]))
  for (const action of session.link.actions) {
    const check = checks.get(action.id)
    if (!check || check.mode !== 'OAUTH' || check.providerId !== providerId) continue
    const completion = byAction.get(action.id)
    if (completion && !completion.verified) return { slug: session.link.slug }
  }
  return null
}

export async function applyOAuthVerification(input: {
  token: string
  provider: string
  accessToken: string
}): Promise<{ slug: string | null; refused: boolean; error: string | null }> {
  const t = await getTranslations('errors')
  const session = await readSession(input.token)
  if (!session) return { slug: null, refused: false, error: t('sessionExpiredReload') }
  if (!(await verifyBudget(session.id))) {
    return { slug: session.link.slug, refused: false, error: t('rateLimited') }
  }
  const checks = await stepChecks(session.link.actions)
  const byAction = new Map(session.completions.map((row) => [row.linkActionId, row]))
  let refused = false
  let unavailable = false
  for (const action of session.link.actions) {
    const check = checks.get(action.id)
    if (!check || check.mode !== 'OAUTH' || check.providerId !== input.provider) continue
    const completion = byAction.get(action.id)
    if (!completion || completion.verified) continue
    const outcome = await check.verifier.check(input.accessToken, check.creator, action.type)
    if (outcome.status === 'VERIFIED') {
      await recordProof(session.id, action.id, true, outcome.proof)
    } else if (outcome.status === 'NOT_FOLLOWING') {
      refused = true
    } else {
      unavailable = true
      await unchecked(session.id, action.id, check.platformKey)
    }
  }
  return { slug: session.link.slug, refused, error: unavailable ? t('verifyUnavailable') : null }
}
