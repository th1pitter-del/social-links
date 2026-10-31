import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getStoredFile, createStoredFileStream } from '@/lib/file-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  if (!token || token.length > 128) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const session = await prisma.unlockSession.findUnique({
    where: { id: token },
    select: {
      id: true,
      expiresAt: true,
      status: true,
      link: {
        select: {
          id: true,
          contentType: true,
          file: { select: { id: true, filename: true, mimeType: true, size: true } },
          actions: { select: { id: true } },
        },
      },
      completions: { select: { linkActionId: true } },
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Session expired' }, { status: 410 })
  }
  if (session.status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Not verified' }, { status: 403 })
  }

  const completed = new Set(session.completions.map((row) => row.linkActionId))
  const allDone = session.link.actions.every((action) => completed.has(action.id))
  if (!allDone) {
    return NextResponse.json({ error: 'Actions incomplete' }, { status: 403 })
  }

  if (session.link.contentType !== 'FILE' || !session.link.file) {
    return NextResponse.json({ error: 'No file available' }, { status: 404 })
  }

  const asset = await getStoredFile(session.link.file.id)
  if (!asset) {
    return NextResponse.json({ error: 'File missing' }, { status: 404 })
  }

  const filename = session.link.file.filename.replace(/["'\\]/g, '_')
  const stream = createStoredFileStream(session.link.file.id)

  return new Response(stream, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.size),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
