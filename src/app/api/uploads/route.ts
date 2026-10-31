import { NextResponse } from 'next/server'

import { getUploadMaxBytes, isAllowedMediaType, saveMedia } from '@/lib/media'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILENAME_FIELD = 200

/**
 * Errors carry both a stable `code` (translated by each client) and the legacy
 * English `error` text, which other uploaders still display as-is.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { code: 'unauthorized', error: 'Sign in to upload files.' },
      { status: 401 },
    )
  }

  const limited = await consumeBySetting(
    `upload:${session.user.id}`,
    'limits.uploadPerHour',
    30,
    60 * 60,
  )
  if (!limited.ok) {
    return NextResponse.json(
      { code: 'rateLimited', error: 'Too many uploads. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ code: 'invalidBody', error: 'Invalid upload body.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ code: 'noFile', error: 'No file provided.' }, { status: 400 })
  }

  if (!isAllowedMediaType(file.type)) {
    return NextResponse.json(
      {
        code: 'unsupportedType',
        error: 'Unsupported file type. Allowed: PNG, JPEG, WEBP, GIF.',
      },
      { status: 415 },
    )
  }

  const maxBytes = await getUploadMaxBytes()
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024))
    return NextResponse.json(
      { code: 'tooLarge', maxMb, error: `File is too large. Maximum size is ${maxMb} MB.` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const id = await saveMedia({
    ownerId: session.user.id,
    filename: (file.name || 'upload').slice(0, MAX_FILENAME_FIELD),
    mimeType: file.type,
    bytes,
  })

  return NextResponse.json({ id, url: `/api/media/${id}` }, { status: 201 })
}
