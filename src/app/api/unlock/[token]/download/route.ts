import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { isUnlockLinkAvailable, settledActionIds } from '@/lib/unlock-confirm'
import { getStoredFile, createStoredFileStream } from '@/lib/file-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const t = await getTranslations('errors')
  if (!token || token.length > 128) {
    return NextResponse.json({ error: t('linkNotFound') }, { status: 400 })
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
          status: true,
          expiresAt: true,
          ownerId: true,
          contentType: true,
          file: { select: { id: true, filename: true, mimeType: true, size: true } },
          actions: { select: { id: true, type: true, label: true, target: true } },
        },
      },
      completions: { select: { linkActionId: true } },
    },
  })

  if (!session) {
    return NextResponse.json({ error: t('linkNotFound') }, { status: 404 })
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: t('sessionExpired') }, { status: 410 })
  }
  if (session.status !== 'VERIFIED') {
    return NextResponse.json({ error: t('linkNotAvailable') }, { status: 403 })
  }

  const completed = new Set(session.completions.map((row) => row.linkActionId))
  const allDone = session.link.actions.every((action) => completed.has(action.id))
  if (!allDone) {
    return NextResponse.json({ error: t('completeAllSteps') }, { status: 403 })
  }

  if (session.link.contentType !== 'FILE' || !session.link.file) {
    return NextResponse.json({ error: t('fileNotFound') }, { status: 404 })
  }

  const asset = await getStoredFile(session.link.file.id)
  if (!asset) {
    return NextResponse.json({ error: t('fileNotFound') }, { status: 404 })
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
