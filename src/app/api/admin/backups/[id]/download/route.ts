import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { backupFilePath } from '@/lib/system/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { id } = await params
  const backup = await prisma.systemBackup.findUnique({
    where: { id },
    select: { id: true, filename: true, status: true },
  })
  if (!backup || backup.status !== 'READY') {
    return new NextResponse('Not found', { status: 404 })
  }

  const file = backupFilePath(backup.filename)
  if (!file) return new NextResponse('Not found', { status: 404 })
  const exists = await access(file)
    .then(() => true)
    .catch(() => false)
  if (!exists) return new NextResponse('Not found', { status: 404 })

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>
  const name = (backup.filename ?? 'backup').replace(/[^A-Za-z0-9._-]/g, '_')
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
