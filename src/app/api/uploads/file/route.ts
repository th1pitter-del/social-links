import { NextResponse } from 'next/server'

import { getFileMaxBytes, isAllowedLockedFileType, saveStoredFile } from '@/lib/file-storage'
import { consumeBySetting } from '@/lib/rate-limit'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILENAME_FIELD = 200

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Sign in to upload files.' }, { status: 401 })
  }

  const limited = await consumeBySetting(
    `upload:file:${session.user.id}`,
    'limits.uploadPerHour',
    60,
    60 * 60,
  )
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload body.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (!isAllowedLockedFileType(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 })
  }

  const maxBytes = await getFileMaxBytes()
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${Math.floor(maxBytes / (1024 * 1024))} MB.` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const id = await saveStoredFile({
    ownerId: session.user.id,
    filename: (file.name || 'upload').slice(0, MAX_FILENAME_FIELD),
    mimeType: file.type,
    bytes,
  })

  return NextResponse.json({ id, url: `/api/files/${id}` }, { status: 201 })
}
