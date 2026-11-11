import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { promoteIfComplete } from '@/lib/unlock-completion'
import { readVisitToken } from '@/lib/visit-token'

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
 * The only way a website-visit step can complete. The signed token ties the
 * redirect to one unlock session and one step, so the server itself performs
 * the navigation before recording it; a bare click cannot claim the visit.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  const payload = readVisitToken(token)
  if (!payload) return NextResponse.redirect(new URL('/', request.url))

  const session = await prisma.unlockSession.findUnique({
    where: { id: payload.session },
    select: {
      id: true,
      linkId: true,
      expiresAt: true,
      link: {
        select: {
          status: true,
          actions: { select: { id: true, type: true, target: true } },
        },
      },
      completions: { select: { linkActionId: true } },
    },
  })

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (session.link.status === 'DISABLED') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const action = session.link.actions.find(
    (candidate) => candidate.id === payload.action && candidate.type === 'VISIT',
  )
  if (!action || !isHttpUrl(action.target)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const alreadyDone = session.completions.some(
    (row) => row.linkActionId === action.id,
  )
  if (!alreadyDone) {
    await prisma.unlockActionCompletion.upsert({
      where: {
        unlockSessionId_linkActionId: {
          unlockSessionId: session.id,
          linkActionId: action.id,
        },
      },
      create: {
        unlockSessionId: session.id,
        linkActionId: action.id,
        verified: true,
      },
      update: { verified: true },
    })

    await prisma.analyticsEvent.create({
      data: { linkId: session.linkId, unlockSessionId: session.id, type: 'ACTION_DONE' },
    })

    await promoteIfComplete(session.id)
  }

  return NextResponse.redirect(action.target, 302)
}
