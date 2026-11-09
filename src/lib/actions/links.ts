'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { getActionOptionMap, getEnabledActionOptions, type ActionOption } from '@/lib/action-catalog'
import { createGuestToken, getGuestToken, guestIpKey, setGuestCookie } from '@/lib/guest'
import { prisma } from '@/lib/prisma'
import { consumeBySetting } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'
import { generateSlug, isReservedSlug } from '@/lib/slug'
import {
  makeHttpUrlSchema,
  makeLinkInputSchema,
  type ActionInput,
  type ValidatorMessages,
} from '@/lib/validation'

export type ActionResult =
  | { ok: true; id: string; slug: string }
  | {
      ok: false
      error: string
      fieldErrors?: Record<string, string[]>
      /** True when a guest has used their free link and must sign in. */
      requiresAuth?: boolean
    }

function parseLinkInput(raw: unknown, t: ValidatorMessages) {
  const parsed = makeLinkInputSchema(t).safeParse(raw)
  if (parsed.success) {
    return { success: true as const, data: parsed.data }
  }

  const fieldErrors: Record<string, string[]> = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || 'form'
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return { success: false as const, fieldErrors }
}

/**
 * Validates creator actions against the admin-managed catalogue. A URL action
 * must carry a valid http(s) target; email actions ignore the target. Disabled
 * types are rejected unless they already exist on the link being edited.
 */
function validateActions(
  actions: ActionInput[],
  catalog: Map<string, ActionOption>,
  offeredTypes: Set<string>,
  t: ValidatorMessages,
  allowedExisting: Set<string> = new Set(),
): Record<string, string[]> {
  const issues: Record<string, string[]> = {}
  const httpUrl = makeHttpUrlSchema(t)

  actions.forEach((action, index) => {
    const option = catalog.get(action.type)
    if (!option) {
      issues[`actions.${index}.type`] = [t('unknownActionType')]
      return
    }
    // A link keeps what it already had when a category is retired; anything new
    // must be one of the actions the editor offers.
    if ((!option.enabled || !offeredTypes.has(action.type)) && !allowedExisting.has(action.type)) {
      issues[`actions.${index}.type`] = [t('actionUnavailable')]
    }
    if (option.behavior === 'URL' && !httpUrl.safeParse(action.target).success) {
      issues[`actions.${index}.target`] = [t('actionUrlRequired')]
    }
  })

  return issues
}

function isPlatformAllowed(platform: string | null | undefined, allowed: string[]): boolean {
  if (!platform || allowed.length === 0) return true
  const normalized = platform.toLowerCase()
  return allowed.some((allowedPlatform) => allowedPlatform.toLowerCase() === normalized)
}

/**
 * Shared link creation used by both the authenticated and the guest flows. The
 * caller decides the owner (account or guest token) and the initial status.
 */
async function createLinkRecord({
  raw,
  ownerId,
  guestToken,
  status,
}: {
  raw: unknown
  ownerId: string | null
  guestToken: string | null
  status: 'DRAFT' | 'ACTIVE'
}): Promise<ActionResult> {
  const t = await getTranslations('errors')

  const parsed = parseLinkInput(raw, t)
  if (!parsed.success) {
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors: parsed.fieldErrors }
  }

  const input = parsed.data
  const [catalog, settings, offered] = await Promise.all([
    getActionOptionMap(),
    getSiteSettings(),
    getEnabledActionOptions(),
  ])
  const allowedPlatforms = settings.allowedPlatforms
  if (allowedPlatforms.length > 0) {
    for (let index = 0; index < input.actions.length; index += 1) {
      const action = input.actions[index]
      const option = catalog.get(action.type)
      if (!isPlatformAllowed(option?.platform, allowedPlatforms)) {
        return {
          ok: false,
          error: t('fixHighlightedFields'),
          fieldErrors: { [`actions.${index}.type`]: [t('platformNotAllowed')] },
        }
      }
    }
  }
  const actionIssues = validateActions(
    input.actions,
    catalog,
    new Set(offered.map((option) => option.key)),
    t,
  )
  if (Object.keys(actionIssues).length > 0) {
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors: actionIssues }
  }

  const slug = input.slug && input.slug.length > 0 ? input.slug : generateSlug()

  if (input.slug && isReservedSlug(input.slug)) {
    return {
      ok: false,
      error: t('slugReserved'),
      fieldErrors: { slug: [t('fieldSlugReserved')] },
    }
  }

  const existing = await prisma.link.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    return {
      ok: false,
      error: t('slugTaken'),
      fieldErrors: { slug: [t('fieldSlugInUse')] },
    }
  }

  try {
    const link = await prisma.$transaction(async (tx) => {
      const created = await tx.link.create({
        data: {
          ownerId,
          guestToken,
          slug,
          title: input.title,
          coverImage: input.coverImage || null,
          status,
          contentType: input.contentType,
          targetUrl: input.contentType === 'URL' ? input.targetUrl || null : null,
          textContent: input.contentType === 'TEXT' ? input.textContent || null : null,
          fileId: input.contentType === 'FILE' ? input.fileId || null : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          actions: {
            create: input.actions.map((action, index) => ({
              type: action.type,
              label: action.label || null,
              target: action.target,
              position: index,
            })),
          },
        },
      })

      return created
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/links')
    return { ok: true, id: link.id, slug: link.slug }
  } catch (error) {
    console.error('[links] create failed', error)
    return { ok: false, error: t('createLinkFailed') }
  }
}

/** Authenticated link creation: owned by the account and published immediately. */
export async function createLink(raw: unknown): Promise<ActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const limited = await consumeBySetting(
    `link:create:${session.user.id}`,
    'limits.linkCreatePerHour',
    20,
    60 * 60,
  )
  if (!limited.ok) {
    return { ok: false, error: t('linkCreateRateLimited') }
  }

  return createLinkRecord({ raw, ownerId: session.user.id, guestToken: null, status: 'ACTIVE' })
}

/**
 * Guest link creation: no account required, published immediately, and limited
 * to one free link per browser (signed cookie). Further links require sign-in.
 */
export async function createGuestLink(raw: unknown): Promise<ActionResult> {
  const ipKey = await guestIpKey()
  const limited = await consumeBySetting(
    `link:create:guest:${ipKey}`,
    'limits.guestLinkCreatePerHour',
    5,
    60 * 60,
  )
  if (!limited.ok) {
    const t = await getTranslations('errors')
    return { ok: false, error: t('linkCreateRateLimited') }
  }

  const existingToken = await getGuestToken()
  if (existingToken) {
    const count = await prisma.link.count({
      where: { guestToken: existingToken, ownerId: null },
    })
    if (count >= 1) {
      const t = await getTranslations('errors')
      return {
        ok: false,
        error: t('freeLinkUsed'),
        requiresAuth: true,
      }
    }
  }

  const token = existingToken ?? createGuestToken()
  const result = await createLinkRecord({
    raw,
    ownerId: null,
    guestToken: token,
    status: 'ACTIVE',
  })

  if (result.ok) {
    await setGuestCookie(token)
  }

  return result
}

export async function updateLink(id: string, raw: unknown): Promise<ActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const link = await prisma.link.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, slug: true, actions: { select: { type: true } } },
  })
  if (!link) {
    return { ok: false, error: t('linkNotFound') }
  }

  const parsed = parseLinkInput(raw, t)
  if (!parsed.success) {
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors: parsed.fieldErrors }
  }

  const input = parsed.data
  const [catalog, settings, offered] = await Promise.all([
    getActionOptionMap(),
    getSiteSettings(),
    getEnabledActionOptions(),
  ])
  const allowedPlatforms = settings.allowedPlatforms
  if (allowedPlatforms.length > 0) {
    for (let index = 0; index < input.actions.length; index += 1) {
      const action = input.actions[index]
      const option = catalog.get(action.type)
      if (!isPlatformAllowed(option?.platform, allowedPlatforms)) {
        return {
          ok: false,
          error: t('fixHighlightedFields'),
          fieldErrors: { [`actions.${index}.type`]: [t('platformNotAllowed')] },
        }
      }
    }
  }
  const allowedDisabled = new Set(link.actions.map((action) => action.type))
  const actionIssues = validateActions(
    input.actions,
    catalog,
    new Set(offered.map((option) => option.key)),
    t,
    allowedDisabled,
  )
  if (Object.keys(actionIssues).length > 0) {
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors: actionIssues }
  }

  let slug = link.slug

  if (input.slug && input.slug !== link.slug) {
    if (isReservedSlug(input.slug)) {
      return {
        ok: false,
        error: t('slugReserved'),
        fieldErrors: { slug: [t('fieldSlugReserved')] },
      }
    }
    const clash = await prisma.link.findUnique({ where: { slug: input.slug }, select: { id: true } })
    if (clash) {
      return {
        ok: false,
        error: t('slugTaken'),
        fieldErrors: { slug: [t('fieldSlugInUse')] },
      }
    }
    slug = input.slug
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.link.update({
        where: { id },
        data: {
          slug,
          title: input.title,
          coverImage: input.coverImage || null,
          contentType: input.contentType,
          targetUrl: input.contentType === 'URL' ? input.targetUrl || null : null,
          textContent: input.contentType === 'TEXT' ? input.textContent || null : null,
          fileId: input.contentType === 'FILE' ? input.fileId || null : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      })

      // Creator actions are fully replaced.
      await tx.linkAction.deleteMany({ where: { linkId: id } })
      if (input.actions.length > 0) {
        await tx.linkAction.createMany({
          data: input.actions.map((action, index) => ({
            linkId: id,
            type: action.type,
            label: action.label || null,
            target: action.target,
            position: index,
          })),
        })
      }
    })

    revalidatePath('/dashboard/links')
    revalidatePath(`/dashboard/links/${id}`)
    return { ok: true, id, slug }
  } catch (error) {
    console.error('[links] update failed', error)
    return { ok: false, error: t('saveLinkFailed') }
  }
}

export async function setLinkStatus(
  id: string,
  status: 'ACTIVE' | 'DISABLED' | 'DRAFT',
): Promise<ActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const link = await prisma.link.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, slug: true },
  })
  if (!link) {
    return { ok: false, error: t('linkNotFound') }
  }

  await prisma.link.update({ where: { id }, data: { status } })
  revalidatePath('/dashboard/links')
  revalidatePath(`/dashboard/links/${id}`)
  return { ok: true, id, slug: link.slug }
}

export async function deleteLink(id: string): Promise<ActionResult> {
  const session = await requireUser()
  const t = await getTranslations('errors')

  const link = await prisma.link.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, slug: true },
  })
  if (!link) {
    return { ok: false, error: t('linkNotFound') }
  }

  await prisma.link.delete({ where: { id } })
  revalidatePath('/dashboard/links')
  return { ok: true, id, slug: link.slug }
}
