import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  getOgadsConfig,
  isChargebackStatus,
  parseOgadsPayout,
  verifyOgadsSecret,
} from '@/lib/ogads'
import { promoteIfComplete } from '@/lib/unlock-completion'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function reject(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status })
}

/**
 * OGAds conversion callback. The shared secret in the URL is the only thing
 * proving a call is genuine, because serverless hosts have no fixed IP for
 * OGAds to allowlist.
 */
export async function GET(request: Request) {
  const config = await getOgadsConfig()
  if (!config.enabled || !config.postbackSecret) {
    return reject(503, 'ogads postback is not configured')
  }

  const params = new URL(request.url).searchParams
  if (!verifyOgadsSecret(params.get('secret'), config.postbackSecret)) {
    return reject(401, 'unauthorized')
  }
  if (config.affiliateId) {
    const reported = params.get('affiliate_id')?.trim()
    if (reported && reported !== config.affiliateId) return reject(403, 'affiliate mismatch')
  }

  const sessionId = params.get('aff_sub4')?.trim() ?? ''
  const offerId = params.get('offer_id')?.trim() ?? ''
  if (!sessionId || sessionId.length > 128 || !offerId || offerId.length > 191) {
    return reject(400, 'missing session or offer')
  }

  const rawPayout = params.get('payout')
  const payout = parseOgadsPayout(rawPayout)
  if (rawPayout !== null && payout === null) return reject(400, 'invalid payout')

  const session = await prisma.unlockSession.findUnique({
    where: { id: sessionId },
    select: { id: true, ogadsOffers: true },
  })
  // An unknown or offer-less session is not ours to credit; answer 200 so the
  // network does not keep retrying a callback we will never accept.
  if (!session) return NextResponse.json({ success: false, error: 'unknown session' })
  if (!Array.isArray(session.ogadsOffers) || session.ogadsOffers.length === 0) {
    return NextResponse.json({ success: false, error: 'session has no offers' })
  }

  const chargeback = isChargebackStatus(params.get('status'))
  const offerName = (params.get('offer_name') ?? '').trim().slice(0, 191) || null
  const rawPostback = Object.fromEntries(
    [...params.entries()].filter(([key]) => key !== 'secret'),
  )

  try {
    let duplicate = false
    const existing = await prisma.ogadsOfferClick.findUnique({
      where: {
        unlockSessionId_offerId: { unlockSessionId: sessionId, offerId },
      },
      select: { id: true, status: true },
    })

    if (chargeback) {
      await prisma.ogadsOfferClick.upsert({
        where: {
          unlockSessionId_offerId: { unlockSessionId: sessionId, offerId },
        },
        create: {
          unlockSessionId: sessionId,
          offerId,
          offerName,
          status: 'REVERSED',
          payout,
          rawPostback,
        },
        update: { status: 'REVERSED', payout, rawPostback },
      })
    } else if (existing?.status === 'CREDITED') {
      // A retry of the same conversion: keep the original credit time so a
      // duplicate never moves a conversion into today's count.
      duplicate = true
      await prisma.ogadsOfferClick.update({
        where: { id: existing.id },
        data: { payout, rawPostback, offerName },
      })
    } else {
      await prisma.ogadsOfferClick.upsert({
        where: {
          unlockSessionId_offerId: { unlockSessionId: sessionId, offerId },
        },
        create: {
          unlockSessionId: sessionId,
          offerId,
          offerName,
          status: 'CREDITED',
          payout,
          creditedAt: new Date(),
          rawPostback,
        },
        update: {
          offerName,
          status: 'CREDITED',
          payout,
          creditedAt: new Date(),
          rawPostback,
        },
      })
      await promoteIfComplete(sessionId)
    }

    return NextResponse.json({ success: true, duplicate })
  } catch (error) {
    console.error('[ogads] postback failed', { sessionId, offerId, error })
    return reject(500, 'could not record conversion')
  }
}
