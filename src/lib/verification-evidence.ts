import 'server-only'

import { cache } from 'react'
import { getTranslations } from 'next-intl/server'

import { getActionOptionMap } from '@/lib/action-catalog'
import { actionLabel } from '@/lib/action-label'
import { prisma } from '@/lib/prisma'
import { stepChecks } from '@/lib/unlock-confirm'

export type StepEvidenceRow = {
  actionId: string
  label: string
  /** Whether this install can ask the platform about the step at all. */
  checkable: boolean
  opened: number
  verified: number
  /** The platform was asked and could not answer; never counted as a refusal. */
  unchecked: number
}

/**
 * What the platforms actually confirmed for one link, per step. The stored
 * proof strings stay in the database for support: they name account ids, which
 * are evidence for the owner's records rather than a panel to read.
 */
export const stepEvidence = cache(async (linkId: string): Promise<StepEvidenceRow[]> => {
  const actions = await prisma.linkAction.findMany({
    where: { linkId },
    orderBy: { position: 'asc' },
    select: { id: true, type: true, label: true, target: true },
  })
  if (actions.length === 0) return []

  const [checks, catalog, actionCopy, opened, verified, unchecked] = await Promise.all([
    stepChecks(actions),
    getActionOptionMap(),
    getTranslations('actions'),
    prisma.unlockActionCompletion.groupBy({
      by: ['linkActionId'],
      where: { linkAction: { linkId } },
      _count: { _all: true },
    }),
    prisma.unlockActionCompletion.groupBy({
      by: ['linkActionId'],
      where: { linkAction: { linkId }, verified: true },
      _count: { _all: true },
    }),
    prisma.unlockActionCompletion.groupBy({
      by: ['linkActionId'],
      where: { linkAction: { linkId }, verified: false, proof: { not: null } },
      _count: { _all: true },
    }),
  ])

  const count = (rows: { linkActionId: string; _count: { _all: number } }[], id: string) =>
    rows.find((row) => row.linkActionId === id)?._count._all ?? 0

  return actions.map((action) => {
    const option = catalog.get(action.type)
    return {
      actionId: action.id,
      label:
        action.label?.trim() || (option ? actionLabel(option, actionCopy) : action.type),
      checkable: checks.has(action.id),
      opened: count(opened, action.id),
      verified: count(verified, action.id),
      unchecked: count(unchecked, action.id),
    }
  })
})