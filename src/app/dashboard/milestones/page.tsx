import Link from 'next/link'
import { Award, Check, Lock } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatPercent } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('milestones') }
}

type Milestone = {
  key: string
  label: string
  description: string
  target: number
  value: number
}

export default async function MilestonesPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.milestones')
  const tc = await getTranslations('dashboard.common')
  const locale = await getLocale()
  const ownerId = session.user.id

  const [linkCount, views, unlocks, leadCount, activeCount] = await Promise.all([
    prisma.link.count({ where: { ownerId } }),
    prisma.analyticsEvent.count({ where: { type: 'VIEW', link: { ownerId } } }),
    prisma.analyticsEvent.count({ where: { type: 'UNLOCK_COMPLETE', link: { ownerId } } }),
    prisma.emailLead.count({ where: { link: { ownerId } } }),
    prisma.link.count({ where: { ownerId, status: 'ACTIVE' } }),
  ])

  const milestones: Milestone[] = [
    { key: 'first-link', label: t('firstLink'), description: t('firstLinkDescription'), target: 1, value: linkCount },
    { key: 'links-5', label: t('gettingGoing'), description: t('gettingGoingDescription'), target: 5, value: linkCount },
    { key: 'links-10', label: t('linkBuilder'), description: t('linkBuilderDescription'), target: 10, value: linkCount },
    { key: 'first-view', label: t('firstView'), description: t('firstViewDescription'), target: 1, value: views },
    { key: 'views-100', label: t('views100'), description: t('views100Description'), target: 100, value: views },
    { key: 'views-1000', label: t('views1k'), description: t('views1kDescription'), target: 1000, value: views },
    { key: 'views-10000', label: t('views10k'), description: t('views10kDescription'), target: 10000, value: views },
    { key: 'first-unlock', label: t('firstUnlock'), description: t('firstUnlockDescription'), target: 1, value: unlocks },
    { key: 'unlocks-100', label: t('unlocks100'), description: t('unlocks100Description'), target: 100, value: unlocks },
    { key: 'unlocks-1000', label: t('unlocks1k'), description: t('unlocks1kDescription'), target: 1000, value: unlocks },
    { key: 'first-lead', label: t('firstLead'), description: t('firstLeadDescription'), target: 1, value: leadCount },
    { key: 'leads-50', label: t('leadMagnet'), description: t('leadMagnetDescription'), target: 50, value: leadCount },
  ]

  const achieved = milestones.filter((m) => m.value >= m.target).length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('progress', { achieved, total: milestones.length })}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links/new">{tc('createLink')}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {milestones.map((milestone) => {
          const done = milestone.value >= milestone.target
          const percent = Math.min(100, Math.round((milestone.value / milestone.target) * 100))
          return (
            <div
              key={milestone.key}
              className={
                done
                  ? 'rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5'
                  : 'rounded-2xl border bg-card p-5'
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    done
                      ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white'
                      : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
                  }
                >
                  {done ? <Check className="size-4" /> : <Lock className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{milestone.label}</p>
                  <p className="text-xs text-muted-foreground">{milestone.description}</p>
                </div>
                <Award
                  className={done ? 'size-4 text-emerald-500' : 'size-4 text-muted-foreground/40'}
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span dir="ltr">
                    {Math.min(milestone.value, milestone.target).toLocaleString(locale)} /{' '}
                    {milestone.target.toLocaleString(locale)}
                  </span>
                  <span>{formatPercent(locale, percent)}</span>
                </div>
                <Progress value={percent} />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t('activeLinksNote', { count: activeCount })}
      </p>
    </div>
  )
}
