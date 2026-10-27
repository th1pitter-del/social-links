'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { deleteStoredFile } from '@/lib/file-storage'
import { requireUser } from '@/lib/session'

export async function deleteStoredFileAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireUser()
  const t = await getTranslations('errors')
  if (!id) return { ok: false, error: t('missingFileId') }

  const { prisma } = await import('@/lib/prisma')
  const file = await prisma.storedFile.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true },
  })
  if (!file) return { ok: false, error: t('fileNotFound') }

  const ok = await deleteStoredFile(id)
  if (!ok) return { ok: false, error: t('deleteFileFailed') }

  revalidatePath('/dashboard/files')
  return { ok: true }
}
