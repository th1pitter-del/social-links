import { NextResponse, type NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function escapeCsvValue(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * CSV export of the email addresses collected through one link. Ownership is
 * enforced server-side, so an owner can never export another owner's leads.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const link = await prisma.link.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, slug: true, title: true },
  })
  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const leads = await prisma.emailLead.findMany({
    where: { linkId: link.id },
    orderBy: { createdAt: 'asc' },
    select: { email: true, consentAt: true },
  })

  const rows: string[] = ['email,consented_at,source_link']
  for (const lead of leads) {
    rows.push(
      [
        escapeCsvValue(lead.email),
        escapeCsvValue(lead.consentAt.toISOString()),
        escapeCsvValue(`/u/${link.slug}`),
      ].join(','),
    )
  }

  const filename = `leads-${link.slug}.csv`
  return new NextResponse(rows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
