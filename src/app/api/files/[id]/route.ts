import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

import { getStoredFile, readStoredFileBytes } from '@/lib/file-storage'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stored files are locked content: this route only lets the owner download
// their own file from the dashboard. Visitors get protected content solely via
// /api/unlock/[token]/download, which requires a verified unlock session.
async function getOwnedFile(id: string) {
  const session = await getSession()
  if (!session) return null
  const asset = await getStoredFile(id)
  if (!asset || asset.ownerId !== session.user.id) return null
  return asset
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const asset = await getOwnedFile(id)
  const t = await getTranslations('errors')
  if (!asset) {
    return NextResponse.json({ error: t('fileNotFound') }, { status: 404 })
  }

  const data = await readStoredFileBytes(id).catch(() => null)
  if (!data) {
    return NextResponse.json({ error: t('fileNotFound') }, { status: 404 })
  }

  const filename = asset.filename.replace(/["'\\]/g, '_')
  return new Response(new Blob([data as unknown as BlobPart], { type: asset.mimeType }), {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.size),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const asset = await getOwnedFile(id)
  if (!asset) {
    return new Response(null, { status: 404 })
  }
  return new Response(null, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.size),
      'Cache-Control': 'no-store, no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
