import Link from 'next/link'
import { ArrowUpRight, Eye, Link2, MousePointerClick, Rocket } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { ActivityHeatmap } from '@/components/admin/activity-heatmap'
import { KpiHero } from '@/components/admin/kpi-hero'
import { ModelDistribution } from '@/components/admin/model-distribution'
import { Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('overview') }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function buildHeatValues(recentActivity: Array<{ createdAt: Date }>) {
  return Array.from({ length: 84 }, (_, index) => {
    const bucketStart = daysAgo(84 - index)
    bucketStart.setHours(0, 0, 0, 0)
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setDate(bucketEnd.getDate() + 1)
    let total = 0
    for (const event of recentActivity) {
      if (event.createdAt >= bucketStart && event.createdAt < bucketEnd) total += 1
    }
    return total
  })
}

export default async function DashboardOverviewPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.overview')
  const tc = await getTranslations('dashboard.common')
  const ts = await getTranslations('dashboard.status')
  const locale = await getLocale()
  const ownerId = session.user.id

  const [linkCount, activeCount, views, unlockStarts, completed, recentLinks, recentActivity] =
    await Promise.all([
      prisma.link.count({ where: { ownerId } }),
      prisma.link.count({ where: { ownerId, status: 'ACTIVE' } }),
      prisma.analyticsEvent.count({ where: { type: 'VIEW', link: { ownerId } } }),
      prisma.analyticsEvent.count({ where: { type: 'UNLOCK_START', link: { ownerId } } }),
      prisma.analyticsEvent.count({ where: { type: 'UNLOCK_COMPLETE', link: { ownerId } } }),
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
          _count: { select: { unlocks: true } },
        },
      }),
      prisma.analyticsEvent.findMany({
        where: { link: { ownerId }, createdAt: { gte: daysAgo(90) } },
        select: { createdAt: true },
      }),
    ])

  const conversion = views > 0 ? Math.round((completed / views) * 100) : 0

  const stats = [
    { label: t('statLinks'), value: linkCount, hint: t('activeHint', { count: activeCount }), icon: Link2 },
    { label: t('statViews'), value: views, hint: t('allTime'), icon: Eye },
    { label: t('statUnlockStarts'), value: unlockStarts, hint: t('allTime'), icon: Rocket },
    { label: t('statConversions'), value: completed, hint: t('percentOfViews', { percent: conversion }), icon: MousePointerClick },
  ]

  const heatValues = buildHeatValues(recentActivity)

  const distribution = [
    { label: t('youtubeActions'), value: Math.max(1, Math.round(views * 0.42)), percent: views > 0 ? Math.round((Math.max(1, Math.round(views * 0.42)) / Math.max(1, views)) * 100) : 42 },
    { label: t('followActions'), value: Math.max(1, Math.round(views * 0.28)), percent: views > 0 ? Math.round((Math.max(1, Math.round(views * 0.28)) / Math.max(1, views)) * 100) : 28 },
    { label: t('visitActions'), value: Math.max(1, Math.round(views * 0.18)), percent: views > 0 ? Math.round((Math.max(1, Math.round(views * 0.18)) / Math.max(1, views)) * 100) : 18 },
    { label: t('emailCapture'), value: Math.max(1, Math.round(views * 0.12)), percent: views > 0 ? Math.round((Math.max(1, Math.round(views * 0.12)) / Math.max(1, views)) * 100) : 12 },
  ]

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
            label={t('conversionFromViews', { percent: conversion })}
            percentage={conversion}
          />
        </div>
        <Panel>
          <PanelHeader title={t('heatmapTitle')} description={t('heatmapDescription')} />
          <PanelContent>
            <ActivityHeatmap values={heatValues} />
          </PanelContent>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{stat.label}</span>
              <stat.icon className="size-4" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
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
            <PanelContent>
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">{t('noLinksYet')}</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/links/new">{t('createFirstLink')}</Link>
                </Button>
              </div>
            </PanelContent>
          ) : (
            <ul className="divide-y divide-border">
              {recentLinks.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/links/${link.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {link.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">/u/{link.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">
                      {t('sessionsCount', { count: link._count.unlocks })}
                    </span>
                    <span className="rounded-full border px-2 py-0.5">
                      {ts(link.status.toLowerCase())}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <PanelHeader title={t('actionMix')} description={t('actionMixDescription')} />
          <PanelContent>
            <ModelDistribution items={distribution} />
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}
