import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { fetchOgadsOffers, getVisitorTargeting, readStoredOffers } from '@/lib/ogads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * The only way an offer row can be clicked. The smartlink is minted here with
 * the unlock session as `aff_sub4`, so the postback knows which session earned
 * the conversion and the browser never receives an unattributed link.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; offerId: string }> },
) {
  const { token, offerId } = await context.params
  if (!token || token.length > 128 || !offerId || offerId.length > 191) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const back = (slug: string) => NextResponse.redirect(new URL(`/link/${slug}`, request.url))

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      expiresAt: true,
      ogadsOffers: true,
      link: { select: { slug: true, status: true } },
    },
  })
  if (!session) return NextResponse.redirect(new URL('/', request.url))
  if (session.expiresAt.getTime() <= Date.now() || session.link.status === 'DISABLED') {
    return back(session.link.slug)
  }

  // Only offers this session actually showed are clickable, so a guessed URL
  // cannot attach conversions from offers the visitor never saw.
  const shown = readStoredOffers(session.ogadsOffers)
  if (!shown.some((offer) => offer.id === offerId)) return back(session.link.slug)

  const { ip, userAgent } = await getVisitorTargeting()
  let offers
  try {
    offers = await fetchOgadsOffers({ ip, userAgent, affSub4: session.id })
  } catch (error) {
    console.error('[ogads] click redirect failed', { session: session.id, offerId, error })
    return back(session.link.slug)
  }

  const offer = offers.find((candidate) => candidate.id === offerId)
  if (!offer || !isHttpUrl(offer.link)) return back(session.link.slug)

  try {
    await prisma.ogadsOfferClick.upsert({
      where: {
        unlockSessionId_offerId: { unlockSessionId: session.id, offerId: offer.id },
      },
      create: {
        unlockSessionId: session.id,
        offerId: offer.id,
        offerName: offer.name,
        clickCount: 1,
        firstClickedAt: new Date(),
      },
      update: { clickCount: { increment: 1 } },
    })
  } catch (error) {
    // A missing click row only costs us click stats; the conversion still
    // arrives by postback, so never strand the visitor on an error page.
    console.error('[ogads] click not recorded', { session: session.id, offerId, error })
  }

  return NextResponse.redirect(offer.link, 302)
}
