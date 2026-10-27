import 'server-only'

import { getActionOptionMap } from '@/lib/action-catalog'
import { prisma } from '@/lib/prisma'

export type PublicAction = {
  id: string
  type: string
  label: string | null
  target: string
  position: number
  behavior: 'URL' | 'EMAIL'
  icon: string
  platform: string | null
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
  expiresAt: Date | null
  ownerName: string
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
      expiresAt: true,
      owner: { select: { name: true } },
      file: { select: { id: true, filename: true, size: true } },
      actions: {
        orderBy: { position: 'asc' },
        select: { id: true, type: true, label: true, target: true, position: true },
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
    expiresAt: link.expiresAt,
    ownerName: link.owner?.name ?? 'Guest',
    actions: link.actions.map((action) => {
      const option = catalog.get(action.type)
      return {
        ...action,
        behavior: option?.behavior ?? 'URL',
        icon: option?.icon ?? 'link',
        platform: option?.platform ?? null,
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
