import { NextResponse } from 'next/server'

import { getMediaAsset, readMediaBytes } from '@/lib/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const asset = await getMediaAsset(id)
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await readMediaBytes(id).catch(() => null)
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new Response(new Blob([data as unknown as BlobPart], { type: asset.mimeType }), {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  })
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const asset = await getMediaAsset(id)
  if (!asset) {
    return new Response(null, { status: 404 })
  }
  return new Response(null, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
