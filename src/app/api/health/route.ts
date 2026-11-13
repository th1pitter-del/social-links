import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness for the reverse proxy and the update runner. It answers whether the
 * process is serving and can reach the database; it never exposes details.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: 'up', uptime: Math.round(process.uptime()) }, { headers })
  } catch {
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503, headers })
  }
}
