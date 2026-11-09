import { notFound } from 'next/navigation'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Plain redirect for the short-link service. No unlock session is involved. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const link = await prisma.shortLink.findUnique({
    where: { code },
    select: { id: true, targetUrl: true, status: true },
  })

  if (!link || link.status !== 'ACTIVE') {
    notFound()
  }

  // Counted before the redirect so a press that lands on the destination is
  // never lost to a navigation the client abandons.
  await prisma.shortLink.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 }, lastClickAt: new Date() },
  })

  return NextResponse.redirect(link.targetUrl, {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  })
}
