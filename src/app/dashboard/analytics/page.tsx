import Link from 'next/link'
import { Eye, MousePointerClick, Rocket } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BarChart, type BarChartPoint } from '@/components/admin/bar-chart'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { buildDayBuckets, windowStart } from '@/lib/activity-buckets'
import { formatNumber, formatPercent } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('analytics') }
}

const DAYS = 14

export default async function AnalyticsPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.analytics')
  const tc = await getTranslations('dashboard.common')
  const ts = await getTranslations('dashboard.status')
  const locale = await getLocale()
  const ownerId = session.user.id

  const links = await prisma.link.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, title: true, status: true },
  })

  if (links.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <div className="rounded-2xl border bg-card px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/links/new">{tc('createLink')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const linkIds = links.map((link) => link.id)

  const start = windowStart(DAYS)

  const [totalsByType, perLink, recentEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['type'],
      where: { linkId: { in: linkIds } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['linkId', 'type'],
      where: { linkId: { in: linkIds } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        linkId: { in: linkIds },
        type: { in: ['VIEW', 'UNLOCK_COMPLETE'] },
        createdAt: { gte: start },
      },
      select: { linkId: true, type: true, createdAt: true },
    }),
  ])

  const totals = new Map(totalsByType.map((row) => [row.type, row._count._all]))
  const views = totals.get('VIEW') ?? 0
  const starts = totals.get('UNLOCK_START') ?? 0
  const completed = totals.get('UNLOCK_COMPLETE') ?? 0
  const conversion = views > 0 ? Math.round((completed / views) * 100) : 0

  // Per-link counts
  const linkCounts = new Map<string, Map<string, number>>()
  for (const row of perLink) {
    const inner = linkCounts.get(row.linkId) ?? new Map<string, number>()
    inner.set(row.type, row._count._all)
    linkCounts.set(row.linkId, inner)
  }

  const series = buildDayBuckets(recentEvents, DAYS)
  const buckets: BarChartPoint[] = series.buckets.map((bucket) => ({
    label: `${bucket.date.getDate()}`,
    primary: bucket.primary,
    secondary: bucket.secondary,
  }))

  const stats = [
    { label: t('statViews'), value: views, hint: t('allTime'), icon: Eye },
    { label: t('statUnlockStarts'), value: starts, hint: t('allTime'), icon: Rocket },
    { label: t('statCompleted'), value: completed, hint: t('percentOfViews', { percent: formatPercent(locale, conversion) }), icon: MousePointerClick },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links/new">{tc('createLink')}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{stat.label}</span>
              <stat.icon className="size-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {formatNumber(locale, stat.value)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">{t('lastDays', { days: DAYS })}</h2>
          <span className="text-xs text-muted-foreground">{t('viewsVsUnlocks')}</span>
        </div>
        <BarChart
          points={buckets}
          startDate={series.startDate}
          primaryLabel={t('chartViews')}
          secondaryLabel={t('chartUnlocks')}
        />
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">{t('perLink')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('colLink')}</th>
                <th className="px-5 py-3 font-medium">{t('colStatus')}</th>
                <th className="px-5 py-3 font-medium">{t('colViews')}</th>
                <th className="px-5 py-3 font-medium">{t('colStarts')}</th>
                <th className="px-5 py-3 font-medium">{t('colCompleted')}</th>
                <th className="px-5 py-3 font-medium">{t('colConversion')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.map((link) => {
                const counts = linkCounts.get(link.id)
                const linkViews = counts?.get('VIEW') ?? 0
                const linkCompleted = counts?.get('UNLOCK_COMPLETE') ?? 0
                const linkConversion =
                  linkViews > 0 ? Math.round((linkCompleted / linkViews) * 100) : 0
                return (
                  <tr key={link.id}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="font-medium hover:underline"
                      >
                        {link.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">/u/{link.slug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={link.status} label={ts(link.status.toLowerCase())} />
                    </td>
                    <td className="px-5 py-3">{formatNumber(locale, linkViews)}</td>
                    <td className="px-5 py-3">
                      {formatNumber(locale, counts?.get('UNLOCK_START') ?? 0)}
                    </td>
                    <td className="px-5 py-3">{formatNumber(locale, linkCompleted)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatPercent(locale, linkConversion)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
