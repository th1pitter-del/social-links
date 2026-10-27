import { NextResponse, type NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function escapeCsvValue(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const statusMap = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  disabled: 'DISABLED',
} as const

/**
 * CSV export of platform links for administrators, honoring the same search and
 * status filters as the links table.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 100)
  const status = url.searchParams.get('status')
  const statusValue =
    status && status in statusMap ? statusMap[status as keyof typeof statusMap] : undefined

  const links = await prisma.link.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { slug: { contains: query } },
              { owner: { email: { contains: query } } },
            ],
          }
        : {}),
      ...(statusValue ? { status: statusValue } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      contentType: true,
      createdAt: true,
      owner: { select: { email: true } },
      _count: { select: { unlocks: true, events: true, emailLeads: true } },
    },
  })

  const rows: string[] = [
    'id,title,slug,status,content_type,owner_email,sessions,events,email_leads,created_at',
  ]
  for (const link of links) {
    rows.push(
      [
        escapeCsvValue(link.id),
        escapeCsvValue(link.title),
        escapeCsvValue(link.slug),
        escapeCsvValue(link.status),
        escapeCsvValue(link.contentType),
        escapeCsvValue(link.owner?.email ?? 'guest'),
        escapeCsvValue(link._count.unlocks),
        escapeCsvValue(link._count.events),
        escapeCsvValue(link._count.emailLeads),
        escapeCsvValue(link.createdAt.toISOString()),
      ].join(','),
    )
  }

  return new NextResponse(rows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="links.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
