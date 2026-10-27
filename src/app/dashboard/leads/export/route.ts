import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function escapeCsvValue(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * CSV export of every email address collected across the signed-in owner's
 * links. Ownership is enforced server-side.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leads = await prisma.emailLead.findMany({
    where: { link: { ownerId: session.user.id } },
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      consentAt: true,
      link: { select: { slug: true, title: true } },
    },
  })

  const rows: string[] = ['email,consented_at,source_link,source_title']
  for (const lead of leads) {
    rows.push(
      [
        escapeCsvValue(lead.email),
        escapeCsvValue(lead.consentAt.toISOString()),
        escapeCsvValue(`/u/${lead.link.slug}`),
        escapeCsvValue(lead.link.title),
      ].join(','),
    )
  }

  return new NextResponse(rows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="all-leads.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
