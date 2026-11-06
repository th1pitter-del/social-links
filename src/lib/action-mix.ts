import { getTranslations } from 'next-intl/server'

import { actionLabel, platformLabel } from '@/lib/action-label'
import { prisma } from '@/lib/prisma'

export type ActionMixItem = { label: string; value: number; percent: number }

/**
 * Counts the action steps visitors actually completed, grouped by the platform
 * that owns each action. Both overview panels drew fixed fractions of the view
 * count (42 / 28 / 18 / 12 percent) instead, which read as measurement but was
 * arithmetic on a number that has nothing to do with actions.
 */
export async function getActionMix(
  ownerId?: string,
): Promise<{ items: ActionMixItem[]; total: number }> {
  const grouped = await prisma.unlockActionCompletion.groupBy({
    by: ['linkActionId'],
    ...(ownerId ? { where: { linkAction: { link: { ownerId } } } } : {}),
    _count: { _all: true },
  })
  if (grouped.length === 0) return { items: [], total: 0 }

  const actions = await prisma.linkAction.findMany({
    where: { id: { in: grouped.map((row) => row.linkActionId) } },
    select: {
      id: true,
      label: true,
      option: {
        select: {
          key: true,
          label: true,
          platform: { select: { key: true, label: true } },
        },
      },
    },
  })
  const [actionCopy, platformCopy] = await Promise.all([
    getTranslations('actions'),
    getTranslations('platforms'),
  ])
  const labels = new Map(
    actions.map((action) => {
      if (action.option?.platform) {
        return [action.id, platformLabel(action.option.platform, platformCopy)]
      }
      if (action.option) {
        return [action.id, actionLabel(action.option, actionCopy)]
      }
      return [action.id, action.label?.trim() ?? '']
    }),
  )

  const totals = new Map<string, number>()
  for (const row of grouped) {
    const label = labels.get(row.linkActionId)
    if (!label) continue
    totals.set(label, (totals.get(label) ?? 0) + row._count._all)
  }

  const total = grouped.reduce((sum, row) => sum + row._count._all, 0)
  const items = [...totals.entries()]
    .map(([label, value]) => ({ label, value, percent: Math.round((value / total) * 100) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 5)

  return { items, total }
}
