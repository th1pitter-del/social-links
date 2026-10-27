import 'server-only'

import { createReadStream } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '@/lib/prisma'

export const MEDIA_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const

export const DEFAULT_UPLOAD_MAX_MB = 10

function mediaDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.MEDIA_STORAGE_DIR ?? '.uploads')
}

async function ensureDir() {
  const dir = mediaDir()
  await mkdir(dir, { recursive: true })
  return dir
}

function filePathFor(id: string) {
  return path.join(mediaDir(), id)
}

export async function getUploadMaxBytes(): Promise<number> {
  const row = await prisma.setting
    .findUnique({ where: { key: 'limits.uploadMaxMb' }, select: { value: true } })
    .catch(() => null)
  const parsed = row ? Number.parseInt(row.value.trim(), 10) : Number.NaN
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_UPLOAD_MAX_MB
  return mb * 1024 * 1024
}

export function isAllowedMediaType(mimeType: string): boolean {
  return (MEDIA_MIME_TYPES as readonly string[]).includes(mimeType)
}

export async function saveMedia(input: {
  ownerId: string
  filename: string
  mimeType: string
  bytes: Uint8Array
}) {
  const dir = await ensureDir()
  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: input.ownerId,
      filename: input.filename.slice(0, 200),
      mimeType: input.mimeType,
      size: input.bytes.byteLength,
    },
    select: { id: true },
  })
  await writeFile(path.join(dir, asset.id), input.bytes)
  return asset.id
}

export async function getMediaAsset(id: string) {
  return prisma.mediaAsset.findUnique({
    where: { id },
    select: { id: true, mimeType: true, size: true, filename: true },
  })
}

export async function readMediaBytes(id: string): Promise<Uint8Array> {
  return readFile(filePathFor(id))
}

export function createMediaStream(id: string) {
  return createReadStream(filePathFor(id))
}

export async function deleteMedia(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } })
  if (!asset) return false

  await prisma.$transaction([
    prisma.link.updateMany({
      where: { coverImage: `/api/media/${id}` },
      data: { coverImage: null },
    }),
    prisma.mediaAsset.delete({ where: { id } }),
  ])

  await unlink(filePathFor(id)).catch(() => undefined)
  return true
}
