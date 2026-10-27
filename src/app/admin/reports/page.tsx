import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { FilterTabs } from '@/components/admin/filter-tabs'
import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { ReportRowActions } from '@/components/admin/report-row-actions'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('reports') }
}

const FILTERS = ['open', 'resolved', 'dismissed', 'all'] as const
type ReportFilter = (typeof FILTERS)[number]

function parseFilter(value?: string): ReportFilter {
  return FILTERS.includes(value as ReportFilter) ? (value as ReportFilter) : 'open'
}

function buildHref(filter: ReportFilter) {
  return filter === 'open' ? '/admin/reports' : `/admin/reports?filter=${filter}`
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const [t, tr] = await Promise.all([getTranslations('admin'), getTranslations('report')])
  const { filter: rawFilter } = await searchParams
  const filter = parseFilter(rawFilter)

  const [openCount, resolvedCount, dismissedCount, openReports, closedReports] = await Promise.all([
    prisma.abuseReport.count({ where: { status: 'OPEN' } }),
    prisma.abuseReport.count({ where: { status: 'RESOLVED' } }),
    prisma.abuseReport.count({ where: { status: 'DISMISSED' } }),
    filter === 'open'
      ? prisma.abuseReport.findMany({
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            slug: true,
            reason: true,
            details: true,
            reporterEmail: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    filter === 'open'
      ? Promise.resolve([])
      : prisma.abuseReport.findMany({
          where: {
            status:
              filter === 'all' ? { not: 'OPEN' } : filter === 'resolved' ? 'RESOLVED' : 'DISMISSED',
          },
          orderBy: { resolvedAt: 'desc' },
          take: 100,
          select: {
            id: true,
            slug: true,
            reason: true,
            status: true,
            resolutionNote: true,
            resolvedAt: true,
          },
        }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
      />

      <FilterTabs
        items={[
          { label: t('reports.filterOpen'), href: buildHref('open'), active: filter === 'open', count: openCount },
          {
            label: t('reports.filterResolved'),
            href: buildHref('resolved'),
            active: filter === 'resolved',
            count: resolvedCount,
          },
          {
            label: t('reports.filterDismissed'),
            href: buildHref('dismissed'),
            active: filter === 'dismissed',
            count: dismissedCount,
          },
          { label: t('reports.filterAll'), href: buildHref('all'), active: filter === 'all' },
        ]}
      />

      {filter === 'open' ? (
        openReports.length === 0 ? (
          <EmptyState>{t('reports.noOpenReports')}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {openReports.map((report) => (
              <li key={report.id}>
                <Panel>
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive">{tr(`reasons.${report.reason}`)}</Badge>
                        <Link
                          href={`/u/${report.slug}`}
                          target="_blank"
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          /u/{report.slug}
                        </Link>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm whitespace-pre-line">{report.details}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {report.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                        {report.reporterEmail
                          ? ` · ${report.reporterEmail}`
                          : ` · ${t('common.anonymous')}`}
                      </p>
                    </div>
                    <ReportRowActions reportId={report.id} />
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        )
      ) : (
        <Panel>
          <PanelHeader title={t('reports.closedTitle')} />
          {closedReports.length === 0 ? (
            <PanelContent>
              <p className="text-sm text-muted-foreground">{t('reports.noReports')}</p>
            </PanelContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('reports.colLink')}</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('reports.colReason')}</th>
                    <th className="px-5 py-3 font-medium">{t('reports.colOutcome')}</th>
                    <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('reports.colNote')}</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">{t('reports.colClosed')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {closedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-mono text-xs">/u/{report.slug}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                        {tr(`reasons.${report.reason}`)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={report.status === 'DISMISSED' ? 'secondary' : 'default'}>
                          {t(`status.${report.status.toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="hidden max-w-xs truncate px-5 py-3 text-muted-foreground lg:table-cell">
                        {report.resolutionNote ?? '—'}
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                        {report.resolvedAt?.toISOString().replace('T', ' ').slice(0, 16) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}
