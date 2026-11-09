import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import {
  AtSign,
  CheckCircle2,
  Eye,
  Flag,
  Link2,
  MousePointerClick,
  Users,
} from 'lucide-react'

import { ActivityHeatmap } from '@/components/admin/activity-heatmap'
import { BarChart, type BarChartPoint } from '@/components/admin/bar-chart'
import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { KpiHero } from '@/components/admin/kpi-hero'
import { ModelDistribution } from '@/components/admin/model-distribution'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { StatusPill } from '@/components/status-pill'
import { Timestamp } from '@/components/timestamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getActionMix } from '@/lib/action-mix'
import { buildHeatBuckets, windowStart, HEAT_DAYS } from '@/lib/activity-buckets'
import { formatNumber, formatPercent } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('overview') }
}

function dayLabel(iso: string, locale: string) {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export default async function AdminOverviewPage() {
  const [t, tr, locale] = await Promise.all([
    getTranslations('admin'),
    getTranslations('report'),
    getLocale(),
  ])
  const since = windowStart(14)

  const [
    users,
    links,
    activeLinks,
    views,
    starts,
    completed,
    openReports,
    seriesRows,
    recentUsers,
    recentReports,
    topViewGroups,
    recentActivity,
    shortLinkCount,
    shortLinkClicks,
    topShortLinks,
    bioCount,
    bioPublished,
    recentBios,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.link.count(),
    prisma.link.count({ where: { status: 'ACTIVE' } }),
    prisma.analyticsEvent.count({ where: { type: 'VIEW' } }),
    prisma.analyticsEvent.count({ where: { type: 'UNLOCK_START' } }),
    prisma.analyticsEvent.count({ where: { type: 'UNLOCK_COMPLETE' } }),
    prisma.abuseReport.count({ where: { status: 'OPEN' } }),
    prisma.$queryRaw<Array<{ day: string; type: string; count: bigint | number }>>`
      SELECT DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS day, \`type\` AS type, COUNT(*) AS count
      FROM \`AnalyticsEvent\`
      WHERE \`createdAt\` >= ${since}
      GROUP BY DATE_FORMAT(\`createdAt\`, '%Y-%m-%d'), \`type\`
    `,
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
        _count: { select: { links: true } },
      },
    }),
    prisma.abuseReport.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, slug: true, reason: true, createdAt: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['linkId'],
      where: { type: 'VIEW' },
      _count: { linkId: true },
      orderBy: { _count: { linkId: 'desc' } },
      take: 5,
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: windowStart(HEAT_DAYS) } },
      select: { createdAt: true },
    }),
    prisma.shortLink.count(),
    prisma.shortLink.aggregate({ _sum: { clicks: true } }),
    prisma.shortLink.findMany({
      orderBy: { clicks: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        targetUrl: true,
        status: true,
        clicks: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.profile.count(),
    prisma.profile.count({ where: { published: true } }),
    prisma.profile.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        handle: true,
        displayName: true,
        published: true,
        _count: { select: { links: true } },
        user: { select: { email: true } },
      },
    }),
  ])

  const topLinkIds = topViewGroups.map((group) => group.linkId)
  const topLinks = topLinkIds.length
    ? await prisma.link.findMany({
        where: { id: { in: topLinkIds } },
        select: { id: true, title: true, slug: true, status: true, owner: { select: { email: true } } },
      })
    : []
  const topLinksById = new Map(topLinks.map((link) => [link.id, link]))

  const counts = new Map<string, number>()
  for (const row of seriesRows) {
    counts.set(`${row.day}:${row.type}`, Number(row.count))
  }
  const points: BarChartPoint[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(since)
    date.setDate(since.getDate() + index)
    const iso = date.toISOString().slice(0, 10)
    return {
      label: dayLabel(iso, locale),
      primary: counts.get(`${iso}:VIEW`) ?? 0,
      secondary: counts.get(`${iso}:UNLOCK_COMPLETE`) ?? 0,
    }
  })

  const conversion = views > 0 ? Math.round((completed / views) * 100) : 0

  const stats = [
    { label: t('overview.registeredUsers'), value: users, icon: Users, tone: 'indigo' as const },
    {
      label: t('overview.links'),
      value: links,
      hint: t('overview.activeHint', { count: activeLinks }),
      icon: Link2,
      tone: 'violet' as const,
    },
    { label: t('overview.views'), value: views, icon: Eye, tone: 'sky' as const },
    { label: t('overview.unlockStarts'), value: starts, icon: MousePointerClick, tone: 'amber' as const },
    {
      label: t('overview.completedUnlocks'),
      value: completed,
      hint: t('overview.completedHint', { percent: formatPercent(locale, conversion) }),
      icon: CheckCircle2,
      tone: 'emerald' as const,
    },
    { label: t('overview.openReports'), value: openReports, icon: Flag, tone: 'rose' as const },
  ]

  const heat = buildHeatBuckets(recentActivity)

  const actionMix = await getActionMix()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('overview.title')}
        description={t('overview.description', { percent: formatPercent(locale, conversion) })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <KpiHero
            title={t('overview.completedUnlocks')}
            value={completed.toLocaleString(locale)}
            label={t('overview.kpiLabel')}
            percentage={conversion}
            locale={locale}
          />
        </div>
        <StatCard
          label={t('overview.openReports')}
          value={openReports}
          icon={Flag}
          tone="rose"
          hint={t('overview.needsModeration')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.slice(0, 4).map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={t('overview.activityTitle')}
            description={t('overview.activityDescription')}
          />
          <PanelContent>
            <BarChart
              points={points}
              startDate={since}
              primaryLabel={t('overview.chartViews')}
              secondaryLabel={t('overview.chartUnlocks')}
            />
          </PanelContent>
        </Panel>
        <Panel>
          <PanelHeader
            title={t('overview.executionTitle')}
            description={t('overview.executionDescription')}
          />
          <PanelContent>
            <ActivityHeatmap values={heat.values} startDate={heat.startDate} />
          </PanelContent>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader
            title={t('overview.openReports')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/reports">{t('common.viewAll')}</Link>
              </Button>
            }
          />
          {recentReports.length === 0 ? (
            <PanelContent>
              <p className="text-sm text-muted-foreground">{t('overview.noOpenReports')}</p>
            </PanelContent>
          ) : (
            <ul className="divide-y divide-border">
              {recentReports.map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{tr(`reasons.${report.reason}`)}</Badge>
                      <Link
                        href={`/link/${report.slug}`}
                        target="_blank"
                        className="truncate font-mono text-xs hover:underline"
                      >
                        /link/{report.slug}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Timestamp value={report.createdAt} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title={t('overview.newestUsers')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">{t('common.viewAll')}</Link>
              </Button>
            }
          />
          {recentUsers.length === 0 ? (
            <PanelContent>
              <p className="text-sm text-muted-foreground">{t('overview.noUsers')}</p>
            </PanelContent>
          ) : (
            <ul className="divide-y divide-border">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {user.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {user.role === 'ADMIN' ? (
                      <Badge variant="default">{t('status.admin')}</Badge>
                    ) : null}
                    {user.banned ? <Badge variant="destructive">{t('status.banned')}</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {t('overview.linksCount', { count: user._count.links })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={t('overview.topLinksTitle')}
            description={t('overview.topLinksDescription')}
          />
          {topViewGroups.length === 0 ? (
            <PanelContent>
              <EmptyState>{t('overview.noViews')}</EmptyState>
            </PanelContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-start text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('overview.colLink')}</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('overview.colOwner')}</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">{t('overview.colStatus')}</th>
                    <th className="px-5 py-3 text-end font-medium">{t('overview.colViews')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topViewGroups.map((group) => {
                    const link = topLinksById.get(group.linkId)
                    if (!link) return null
                    return (
                      <tr key={group.linkId} className="hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/links/${link.id}`}
                            className="font-medium hover:underline"
                          >
                            {link.title}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">/link/{link.slug}</p>
                        </td>
                        <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                          {link.owner?.email ?? t('common.guest')}
                        </td>
                        <td className="hidden px-5 py-3 md:table-cell">
                          <StatusPill
                            status={link.status}
                            label={t(`status.${link.status.toLowerCase()}`)}
                          />
                        </td>
                        <td className="px-5 py-3 text-end font-medium tabular-nums">
                          {formatNumber(locale, group._count.linkId)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel>
          <PanelHeader
            title={t('overview.actionDistribution')}
            description={t('overview.actionDistributionDescription')}
          />
          <PanelContent>
            {actionMix.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('overview.actionMixEmpty')}</p>
            ) : (
              <ModelDistribution
                items={actionMix.items}
                valueLabel={t('overview.completedSteps', { count: actionMix.total })}
                locale={locale}
              />
            )}
          </PanelContent>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t('overview.shortLinksTitle')}
          description={t('overview.shortLinksDescription', {
            count: shortLinkCount,
            clicks: shortLinkClicks._sum.clicks ?? 0,
          })}
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/short-links">{t('common.viewAll')}</Link>
            </Button>
          }
        />
        {topShortLinks.length === 0 ? (
          <PanelContent>
            <p className="text-sm text-muted-foreground">{t('overview.noShortLinks')}</p>
          </PanelContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('overview.colShortLink')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">
                    {t('overview.colOwner')}
                  </th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">
                    {t('overview.colStatus')}
                  </th>
                  <th className="px-5 py-3 text-end font-medium">{t('overview.colClicks')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topShortLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <a
                        href={`/s/${link.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        /s/{link.code}
                      </a>
                      <p
                        className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground"
                        title={link.targetUrl}
                      >
                        {link.targetUrl}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {link.owner.email}
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <StatusPill
                        status={link.status}
                        label={t(`status.${link.status.toLowerCase()}`)}
                      />
                    </td>
                    <td className="px-5 py-3 text-end font-medium tabular-nums">
                      {formatNumber(locale, link.clicks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={t('overview.bioTitle')}
          description={t('overview.bioDescription', {
            count: bioCount,
            published: bioPublished,
          })}
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/bio">{t('common.viewAll')}</Link>
            </Button>
          }
        />
        {recentBios.length === 0 ? (
          <PanelContent>
            <p className="text-sm text-muted-foreground">{t('overview.noBios')}</p>
          </PanelContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('overview.colBio')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">
                    {t('overview.colOwner')}
                  </th>
                  <th className="hidden px-5 py-3 text-end font-medium md:table-cell">
                    {t('overview.colBioLinks')}
                  </th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">
                    {t('overview.colStatus')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentBios.map((bio) => (
                  <tr key={bio.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <a
                        href={`/bio/${bio.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        /bio/{bio.handle}
                      </a>
                      {bio.displayName ? (
                        <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground">
                          {bio.displayName}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {bio.user.email}
                    </td>
                    <td className="hidden px-5 py-3 text-end text-muted-foreground tabular-nums md:table-cell">
                      {formatNumber(locale, bio._count.links)}
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <StatusPill
                        status={bio.published ? 'ACTIVE' : 'DRAFT'}
                        label={bio.published ? t('bioPages.published') : t('bioPages.draft')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
