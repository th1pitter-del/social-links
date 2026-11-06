import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { ActivityHeatmap } from '@/components/admin/activity-heatmap'
import { KpiHero } from '@/components/admin/kpi-hero'
import { ModelDistribution } from '@/components/admin/model-distribution'
import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { FunnelStages } from '@/components/dashboard/funnel-stages'
import { StatusPill, statusTone } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { getActionMix } from '@/lib/action-mix'
import { buildHeatBuckets } from '@/lib/activity-buckets'
import { formatNumber, formatPercent } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { cn } from 'cn'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('overview') }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export default async function DashboardOverviewPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.overview')
  const tc = await getTranslations('dashboard.common')
  const ts = await getTranslations('dashboard.status')
  const locale = await getLocale()
  const ownerId = session.user.id

  const [linkCount, views, unlockStarts, completed, statusByLink, recentLinks, recentActivity] =
    await Promise.all([
      prisma.link.count({ where: { ownerId } }),
      prisma.analyticsEvent.count({ where: { type: 'VIEW', link: { ownerId } } }),
      prisma.analyticsEvent.count({ where: { type: 'UNLOCK_START', link: { ownerId } } }),
      prisma.analyticsEvent.count({ where: { type: 'UNLOCK_COMPLETE', link: { ownerId } } }),
      prisma.link.groupBy({
        by: ['status'],
        where: { ownerId },
        _count: { _all: true },
      }),
      prisma.link.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          _count: { select: { unlocks: true, events: true } },
        },
      }),
      prisma.analyticsEvent.findMany({
        where: { link: { ownerId }, createdAt: { gte: daysAgo(90) } },
        select: { createdAt: true },
      }),
    ])

  const actionMix = await getActionMix(ownerId)
  const heat = buildHeatBuckets(recentActivity)

  const conversion = views > 0 ? Math.round((completed / views) * 100) : 0
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const startsShare = views > 0 ? Math.round((unlockStarts / views) * 100) : 0
  const completedShare = views > 0 ? Math.round((completed / views) * 100) : 0

  const stages = [
    { label: t('statViews'), value: views, share: 100, note: t('allTime') },
    {
      label: t('statUnlockStarts'),
      value: unlockStarts,
      share: startsShare,
      note: t('continuedFrom', {
        percent: formatPercent(locale, startsShare),
        from: t('statViews').toLowerCase(),
      }),
    },
    {
      label: t('completedUnlocks'),
      value: completed,
      share: completedShare,
      note: t('continuedFrom', {
        percent: formatPercent(
          locale,
          unlockStarts > 0 ? Math.round((completed / unlockStarts) * 100) : 0,
        ),
        from: t('statUnlockStarts').toLowerCase(),
      }),
    },
  ]

  const statusRows = statusByLink
    .slice()
    .sort((a, b) => b._count._all - a._count._all)
    .map((row) => ({
      status: row.status,
      label: ts(row.status.toLowerCase()),
      count: row._count._all,
    }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('welcome', { name: session.user.name.split(' ')[0] })}
          </h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links/new">{tc('createLink')}</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <KpiHero
            title={t('completedUnlocks')}
            value={completed.toLocaleString(locale)}
            label={t('conversionFromViews', { percent: formatPercent(locale, conversion) })}
            percentage={conversion}
            locale={locale}
          />
        </div>
        <Panel>
          <PanelHeader title={t('heatmapTitle')} description={t('heatmapDescription')} />
          <PanelContent>
            <ActivityHeatmap values={heat.values} startDate={heat.startDate} />
          </PanelContent>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title={t('statLinks')} description={t('allTime')} />
          <PanelContent>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {linkCount.toLocaleString(locale)}
            </p>
            {statusRows.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">{t('noLinksYet')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {statusRows.map((row) => (
                  <li key={row.status} className="flex items-center gap-2 text-xs">
                    <span
                      aria-hidden
                      className={cn('size-2 shrink-0 rounded-full', statusTone(row.status))}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatNumber(locale, row.count)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelContent>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title={t('funnelTitle')} description={t('funnelDescription')} />
          <PanelContent>
            {views > 0 ? (
              <FunnelStages stages={stages} locale={locale} />
            ) : (
              <EmptyState>{t('funnelEmpty')}</EmptyState>
            )}
          </PanelContent>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={t('recentLinks')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/links">
                  {tc('viewAll')}
                  <ArrowUpRight />
                </Link>
              </Button>
            }
          />
          {recentLinks.length === 0 ? (
            <PanelContent className="text-center">
              <EmptyState>{t('noLinksYet')}</EmptyState>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/dashboard/links/new">{t('createFirstLink')}</Link>
              </Button>
            </PanelContent>
          ) : (
            <ul className="divide-y divide-border">
              {recentLinks.map((link, index) => (
                <li
                  key={link.id}
                  style={index ? { animationDelay: `${index * 50}ms` } : undefined}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-backwards"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/links/${link.id}`}
                      className="flex items-center gap-1.5 truncate font-medium hover:underline"
                    >
                      <span className="truncate">{link.title}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      /u/{link.slug}
                      {' · '}
                      {t('createdOn', { date: dateFormatter.format(link.createdAt) })}
                      {link.expiresAt
                        ? ` · ${t('expiresOn', { date: dateFormatter.format(link.expiresAt) })}`
                        : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="hidden text-right sm:inline">
                      {t('sessionsCount', { count: link._count.unlocks })}
                      <span className="block">
                        {t('eventsCount', { count: link._count.events })}
                      </span>
                    </span>
                    <StatusPill status={link.status} label={ts(link.status.toLowerCase())} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader
            title={t('actionMix')}
            description={t('actionMixDescription')}
          />
          <PanelContent>
            {actionMix.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('actionMixEmpty')}</p>
            ) : (
              <ModelDistribution
                items={actionMix.items}
                valueLabel={t('completedSteps', { count: actionMix.total })}
                locale={locale}
              />
            )}
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}
