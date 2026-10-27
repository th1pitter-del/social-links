import Link from 'next/link'
import { Eye, MousePointerClick, Rocket } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { BarChart } from '@/components/admin/bar-chart'
import { Button } from '@/components/ui/button'
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

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (DAYS - 1))

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

  // 14-day series
  const buckets: { label: string; primary: number; secondary: number }[] = []
  for (let i = 0; i < DAYS; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    buckets.push({ label: `${day.getDate()}`, primary: 0, secondary: 0 })
  }
  for (const event of recentEvents) {
    const index = Math.floor(
      (event.createdAt.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    )
    if (index < 0 || index >= DAYS) continue
    if (event.type === 'VIEW') buckets[index].primary += 1
    else buckets[index].secondary += 1
  }

  const stats = [
    { label: t('statViews'), value: views, hint: t('allTime'), icon: Eye },
    { label: t('statUnlockStarts'), value: starts, hint: t('allTime'), icon: Rocket },
    { label: t('statCompleted'), value: completed, hint: t('percentOfViews', { percent: conversion }), icon: MousePointerClick },
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
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">{t('lastDays', { days: DAYS })}</h2>
          <span className="text-xs text-muted-foreground">{t('viewsVsUnlocks')}</span>
        </div>
        <BarChart points={buckets} primaryLabel={t('chartViews')} secondaryLabel={t('chartUnlocks')} />
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
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {ts(link.status.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-5 py-3">{linkViews}</td>
                    <td className="px-5 py-3">{counts?.get('UNLOCK_START') ?? 0}</td>
                    <td className="px-5 py-3">{linkCompleted}</td>
                    <td className="px-5 py-3 text-muted-foreground">{linkConversion}%</td>
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
