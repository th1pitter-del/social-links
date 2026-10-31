import 'server-only'

import { createReadStream } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { prisma } from '@/lib/prisma'

export const DEFAULT_FILE_MAX_MB = 50

export const LOCKED_FILE_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream',
] as const

function storageDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.MEDIA_STORAGE_DIR ?? '.uploads', 'files')
}

async function ensureDir() {
  const dir = storageDir()
  await mkdir(dir, { recursive: true })
  return dir
}

function filePathFor(id: string) {
  return path.join(storageDir(), id)
}

export async function getFileMaxBytes(): Promise<number> {
  const row = await prisma.setting
    .findUnique({ where: { key: 'limits.fileMaxMb' }, select: { value: true } })
    .catch(() => null)
  const parsed = row ? Number.parseInt(row.value.trim(), 10) : Number.NaN
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FILE_MAX_MB
  return mb * 1024 * 1024
}

export function isAllowedLockedFileType(mimeType: string): boolean {
  return (LOCKED_FILE_MIME_TYPES as readonly string[]).includes(mimeType)
}

export async function saveStoredFile(input: {
  ownerId: string
  filename: string
  mimeType: string
  bytes: Uint8Array
}) {
  await ensureDir()
  const asset = await prisma.storedFile.create({
    data: {
      ownerId: input.ownerId,
      filename: input.filename.slice(0, 200),
      mimeType: input.mimeType,
      size: input.bytes.byteLength,
    },
    select: { id: true },
  })
  await writeFile(filePathFor(asset.id), input.bytes)
  return asset.id
}

export async function getStoredFile(id: string) {
  return prisma.storedFile.findUnique({
    where: { id },
    select: { id: true, mimeType: true, size: true, filename: true, ownerId: true },
  })
}

export async function readStoredFileBytes(id: string): Promise<Uint8Array> {
  return readFile(filePathFor(id))
}

export function createStoredFileStream(id: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(filePathFor(id))
  // Swallow fs errors (missing file, fd failures) so they surface as a stream
  // error instead of an unhandled 'error' event crashing the process.
  nodeStream.on('error', () => nodeStream.destroy())
  return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>
}

export async function deleteStoredFile(id: string) {
  const asset = await prisma.storedFile.findUnique({ where: { id }, select: { id: true } })
  if (!asset) return false

  // Disable links that reference this file
  await prisma.$transaction(async (tx) => {
    await tx.link.updateMany({
      where: { fileId: id },
      data: { status: 'DISABLED', fileId: null },
    })
    await tx.storedFile.delete({ where: { id } })
  })

  await unlink(filePathFor(id)).catch(() => undefined)
  return true
}
