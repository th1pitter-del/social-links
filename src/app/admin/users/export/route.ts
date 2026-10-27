import { NextResponse, type NextRequest } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function escapeCsvValue(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * CSV export of platform users for administrators. Honors the same search and
 * status filters as the users table. Authorization is enforced server-side.
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

  const users = await prisma.user.findMany({
    where: {
      ...(query
        ? { OR: [{ email: { contains: query } }, { name: { contains: query } }] }
        : {}),
      ...(status === 'admin' ? { role: 'ADMIN' as const } : {}),
      ...(status === 'banned' ? { banned: true } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { links: true } },
    },
  })

  const rows: string[] = ['id,name,email,role,status,email_verified,links,created_at']
  for (const user of users) {
    rows.push(
      [
        escapeCsvValue(user.id),
        escapeCsvValue(user.name),
        escapeCsvValue(user.email),
        escapeCsvValue(user.role),
        escapeCsvValue(user.banned ? 'banned' : 'active'),
        escapeCsvValue(user.emailVerified),
        escapeCsvValue(user._count.links),
        escapeCsvValue(user.createdAt.toISOString()),
      ].join(','),
    )
  }

  return new NextResponse(rows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
