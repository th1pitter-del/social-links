import 'server-only'

import { prisma } from '@/lib/prisma'
import { readStoredOffers } from '@/lib/ogads'

/**
 * Moves a session to VERIFIED once every configured action has a completion row
 * and, when offers were shown, at least one of them has been credited.
 *
 * Shared by the step actions, the signed visit redirect and the OGAds postback:
 * any of them can be the last thing a session was waiting for.
 */
export async function promoteIfComplete(sessionId: string): Promise<void> {
  const session = await prisma.unlockSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      ogadsOffers: true,
      link: { select: { actions: { select: { id: true } } } },
      completions: { select: { linkActionId: true } },
      ogadsClicks: { where: { status: 'CREDITED' }, select: { id: true }, take: 1 },
    },
  })
  if (!session || session.status === 'VERIFIED') return

  const completedSet = new Set(session.completions.map((row) => row.linkActionId))
  const actionsDone = session.link.actions.every((action) => completedSet.has(action.id))
  const offersRequired = readStoredOffers(session.ogadsOffers).length > 0
  const offersDone = !offersRequired || session.ogadsClicks.length > 0
  if (actionsDone && offersDone) {
    await prisma.unlockSession.update({
      where: { id: sessionId },
      data: { status: 'VERIFIED' },
    })
  }
}
