'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { consumeBySetting } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import { generateSlug } from '@/lib/slug'
import { makeShortLinkInputSchema } from '@/lib/validation'

export type ShortLinkActionResult =
  | { ok: true; id: string; code: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

function fieldErrorsFrom(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = issue.path.join('.') || 'form'
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return fieldErrors
}

/** A short link may not point at another short link on this same site. */
function isSelfTarget(targetUrl: string, host: string | null): boolean {
  if (!host) return false
  try {
    const url = new URL(targetUrl)
    return url.host === host && url.pathname.startsWith('/s/')
  } catch {
    return false
  }
}

async function allocateCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSlug(6)
    const clash = await prisma.shortLink.findUnique({ where: { code }, select: { id: true } })
    if (!clash) return code
  }
  throw new Error('could not allocate a short code')
}

export async function createShortLink(raw: unknown): Promise<ShortLinkActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const limited = await consumeBySetting(
    `short-link:create:${session.user.id}`,
    'limits.shortLinkCreatePerHour',
    60,
    60 * 60,
  )
  if (!limited.ok) {
    return { ok: false, error: t('shortLinkRateLimited') }
  }

  const parsed = makeShortLinkInputSchema(t).safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: t('fixHighlightedFields'),
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    }
  }

  const { targetUrl } = parsed.data
  if (isSelfTarget(targetUrl, (await headers()).get('host'))) {
    return {
      ok: false,
      error: t('shortLinkSelfTarget'),
      fieldErrors: { targetUrl: [t('shortLinkSelfTarget')] },
    }
  }

  const requested = parsed.data.code ?? ''
  if (requested) {
    const clash = await prisma.shortLink.findUnique({
      where: { code: requested },
      select: { id: true },
    })
    if (clash) {
      return {
        ok: false,
        error: t('shortCodeTaken'),
        fieldErrors: { code: [t('fieldShortCodeInUse')] },
      }
    }
  }

  try {
    const link = await prisma.shortLink.create({
      data: {
        ownerId: session.user.id,
        code: requested || (await allocateCode()),
        targetUrl,
      },
      select: { id: true, code: true },
    })

    revalidatePath('/dashboard/short-links')
    revalidatePath('/admin/short-links')
    return { ok: true, id: link.id, code: link.code }
  } catch (error) {
    console.error('[short-links] create failed', error)
    return { ok: false, error: t('shortLinkCreateFailed') }
  }
}

export async function setShortLinkStatus(
  id: string,
  status: 'ACTIVE' | 'DISABLED',
): Promise<ShortLinkActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const link = await prisma.shortLink.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, code: true },
  })
  if (!link) {
    return { ok: false, error: t('shortLinkNotFound') }
  }

  await prisma.shortLink.update({ where: { id }, data: { status } })
  revalidatePath('/dashboard/short-links')
  revalidatePath('/admin/short-links')
  return { ok: true, id: link.id, code: link.code }
}

export async function deleteShortLink(id: string): Promise<ShortLinkActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const link = await prisma.shortLink.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, code: true },
  })
  if (!link) {
    return { ok: false, error: t('shortLinkNotFound') }
  }

  await prisma.shortLink.delete({ where: { id } })
  revalidatePath('/dashboard/short-links')
  revalidatePath('/admin/short-links')
  return { ok: true, id: link.id, code: link.code }
}
