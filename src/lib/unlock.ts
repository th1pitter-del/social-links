import 'server-only'

import { getActionOptionMap } from '@/lib/action-catalog'
import { defaultWaitSeconds } from '@/lib/action-defaults'
import { prisma } from '@/lib/prisma'

export type PublicAction = {
  id: string
  type: string
  label: string | null
  /** Catalog name for the action, used when the creator left `label` empty. */
  optionLabel: string | null
  target: string
  position: number
  behavior: 'URL' | 'EMAIL'
  icon: string
  platform: string | null
  waitSeconds: number
}

export type PublicUnlockLink = {
  id: string
  ownerId: string | null
  slug: string
  title: string
  description: string | null
  coverImage: string | null
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED'
  contentType: 'URL' | 'TEXT' | 'FILE'
  targetUrl: string | null
  expiresAt: Date | null
  ownerName: string | null
  actions: PublicAction[]
  viewCount: number
  unlockCount: number
  file?: { id: string; filename: string; size: number } | null
}

export async function getPublicUnlockLink(slug: string): Promise<PublicUnlockLink | null> {
  const link = await prisma.link.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      slug: true,
      title: true,
      description: true,
      coverImage: true,
      status: true,
      contentType: true,
      targetUrl: true,
      expiresAt: true,
      owner: { select: { name: true } },
      file: { select: { id: true, filename: true, size: true } },
      actions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          label: true,
          target: true,
          waitSeconds: true,
          position: true,
        },
      },
    },
  })

  if (!link) return null

  const [viewCount, unlockCount] = await Promise.all([
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'VIEW' } }),
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'UNLOCK_COMPLETE' } }),
  ])

  const catalog = await getActionOptionMap()

  return {
    id: link.id,
    ownerId: link.ownerId,
    slug: link.slug,
    title: link.title,
    description: link.description,
    coverImage: link.coverImage,
    status: link.status,
    contentType: link.contentType,
    targetUrl: link.targetUrl,
    expiresAt: link.expiresAt,
    ownerName: link.owner?.name ?? null,
    actions: link.actions.map((action) => {
      const option = catalog.get(action.type)
      return {
        ...action,
        optionLabel: option?.label ?? null,
        behavior: option?.behavior ?? 'URL',
        icon: option?.icon ?? 'link',
        platform: option?.platform ?? null,
        waitSeconds: action.waitSeconds ?? defaultWaitSeconds(action.type),
      }
    }),
    viewCount,
    unlockCount,
    file: link.file ?? null,
  }
}

export function isExpired(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now())
}

/**
 * Logs an instant visit for a zero-action short link. The page redirects
 * straight to the destination, so no unlock session exists; a completed unlock
 * is recorded because the content was delivered immediately.
 */
export async function recordShortLinkVisit(linkId: string): Promise<void> {
  await prisma.analyticsEvent.createMany({
    data: [
      { linkId, type: 'VIEW' },
      { linkId, type: 'UNLOCK_COMPLETE' },
    ],
  })
}
