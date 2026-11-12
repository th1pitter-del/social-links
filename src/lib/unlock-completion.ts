import 'server-only'

import { prisma } from '@/lib/prisma'
import { readStoredOffers } from '@/lib/ogads'
import { isUnlockLinkAvailable, settledActionIds } from '@/lib/unlock-confirm'

/**
 * Moves a session to VERIFIED once every configured action is settled and, when
 * offers were shown, at least one of them has been credited. A step whose
 * platform can answer for it is settled only once that answer is recorded.
 *
 * Shared by the step actions, the signed visit redirect and the OGAds postback:
 * any of them can be the last thing a session was waiting for.
 */
export async function promoteIfComplete(sessionId: string): Promise<void> {
  const session = await prisma.unlockSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      expiresAt: true,
      ogadsOffers: true,
      link: { select: {
        status: true, expiresAt: true, ownerId: true,
        actions: { select: { id: true, type: true, target: true } },
      } },
      completions: { select: { linkActionId: true, verified: true, proof: true } },
      ogadsClicks: { where: { status: 'CREDITED' }, select: { id: true }, take: 1 },
    },
  })
  if (!session || session.status === 'VERIFIED') return

  const settled = await settledActionIds(session)
  const actionsDone = session.link.actions.every((action) => settled.has(action.id))
  const offersRequired = readStoredOffers(session.ogadsOffers).length > 0
  const offersDone = !offersRequired || session.ogadsClicks.length > 0
  if (actionsDone && offersDone) {
    await prisma.unlockSession.update({
      where: { id: sessionId },
      data: { status: 'VERIFIED' },
    })
  }
}
