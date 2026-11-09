'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { isReservedSlug } from '@/lib/slug'
import { makeProfileInputSchema } from '@/lib/validation'

export type ProfileResult =
  | { ok: true; handle: string; published: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function saveProfile(raw: unknown): Promise<ProfileResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')
  const userId = session.user.id

  const parsed = makeProfileInputSchema(t).safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form'
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors }
  }

  const input = parsed.data
  const handle = input.handle.toLowerCase()

  if (isReservedSlug(handle)) {
    return {
      ok: false,
      error: t('handleReserved'),
      fieldErrors: { handle: [t('fieldHandleReserved')] },
    }
  }

  const existing = await prisma.profile.findFirst({
    where: { handle, NOT: { userId } },
    select: { id: true },
  })
  if (existing) {
    return {
      ok: false,
      error: t('handleTaken'),
      fieldErrors: { handle: [t('fieldHandleInUse')] },
    }
  }

  try {
    let savedPublished = false
    await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          handle,
          displayName: input.displayName || null,
          bio: input.bio || null,
          avatarUrl: input.avatarUrl || null,
          theme: input.theme,
          accent: input.accent ? input.accent.toLowerCase() : null,
          // A new bio is live straight away; unpublishing stays a deliberate
          // action from the editor.
          published: true,
        },
        update: {
          handle,
          displayName: input.displayName || null,
          bio: input.bio || null,
          avatarUrl: input.avatarUrl || null,
          theme: input.theme,
          accent: input.accent ? input.accent.toLowerCase() : null,
        },
        select: { id: true, published: true },
      })
      savedPublished = profile.published

      await tx.bioLink.deleteMany({ where: { profileId: profile.id } })
      if (input.links.length > 0) {
        await tx.bioLink.createMany({
          data: input.links.map((link, index) => ({
            profileId: profile.id,
            label: link.label,
            url: link.url,
            platform: link.platform || null,
            position: index,
          })),
        })
      }
    })

    revalidatePath('/dashboard/profile')
    revalidatePath(`/bio/${handle}`)
    return { ok: true, handle, published: savedPublished }
  } catch (error) {
    console.error('[profile] save failed', error)
    return { ok: false, error: t('saveProfileFailed') }
  }
}

export async function setProfilePublished(published: boolean): Promise<{ ok: boolean; error?: string }> {
  const session = await requireUser()
  const t = await getTranslations('errors')
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, handle: true },
  })
  if (!profile) {
    return { ok: false, error: t('saveBeforePublish') }
  }

  await prisma.profile.update({ where: { id: profile.id }, data: { published } })
  revalidatePath('/dashboard/profile')
  revalidatePath(`/bio/${profile.handle}`)
  return { ok: true }
}
