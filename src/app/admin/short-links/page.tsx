import { getLocale, getTranslations } from 'next-intl/server'

import { AdminShortLinkRowActions } from '@/components/admin/admin-short-link-row-actions'
import { FilterTabs } from '@/components/admin/filter-tabs'
import { NoResults } from '@/components/admin/no-results'
import { PageHeader } from '@/components/admin/page-header'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('shortLinks') }
}

const STATUSES = ['all', 'active', 'disabled'] as const
type StatusFilter = (typeof STATUSES)[number]

function parseStatus(value?: string): StatusFilter {
  return STATUSES.includes(value as StatusFilter) ? (value as StatusFilter) : 'all'
}

const statusMap: Record<Exclude<StatusFilter, 'all'>, 'ACTIVE' | 'DISABLED'> = {
  active: 'ACTIVE',
  disabled: 'DISABLED',
}

function buildHref(status: StatusFilter, query: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  const qs = params.toString()
  return `/admin/short-links${qs ? `?${qs}` : ''}`
}

export default async function AdminShortLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const [t, locale] = await Promise.all([getTranslations('admin'), getLocale()])
  const { q, status } = await searchParams
  const query = (q ?? '').trim().slice(0, 100)
  const filter = parseStatus(status)
  const filtered = query !== '' || filter !== 'all'

  const where = {
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { targetUrl: { contains: query } },
            { owner: { email: { contains: query } } },
          ],
        }
      : {}),
    ...(filter !== 'all' ? { status: statusMap[filter] } : {}),
  }

  const [shortLinks, total, active, disabled] = await Promise.all([
    prisma.shortLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        code: true,
        targetUrl: true,
        status: true,
        clicks: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.shortLink.count(),
    prisma.shortLink.count({ where: { status: 'ACTIVE' } }),
    prisma.shortLink.count({ where: { status: 'DISABLED' } }),
  ])

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  const filterLabels = {
    all: t('shortLinks.filterAll'),
    active: t('shortLinks.filterActive'),
    disabled: t('shortLinks.filterDisabled'),
  } as const

  return (
    <div className="space-y-6">
      <PageHeader title={t('shortLinks.title')} description={t('shortLinks.description')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          items={[
            { label: filterLabels.all, href: buildHref('all', query), active: filter === 'all', count: total },
            {
              label: filterLabels.active,
              href: buildHref('active', query),
              active: filter === 'active',
              count: active,
            },
            {
              label: filterLabels.disabled,
              href: buildHref('disabled', query),
              active: filter === 'disabled',
              count: disabled,
            },
          ]}
        />

        <form method="get" className="flex w-full gap-2 sm:max-w-md">
          {filter !== 'all' ? <input type="hidden" name="status" value={filter} /> : null}
          <Input
            name="q"
            defaultValue={query}
            placeholder={t('shortLinks.searchPlaceholder')}
            aria-label={t('shortLinks.searchPlaceholder')}
          />
          <Button type="submit" variant="outline">
            {t('common.search')}
          </Button>
        </form>
      </div>

      {shortLinks.length === 0 ? (
        <NoResults
          filtered={filtered}
          message={filtered ? t('shortLinks.noLinks') : t('shortLinks.emptyList')}
          clearLabel={t('common.clearFilters')}
          clearHref="/admin/short-links"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-start text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('shortLinks.colLink')}</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">
                  {t('shortLinks.colDestination')}
                </th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">
                  {t('shortLinks.colOwner')}
                </th>
                <th className="hidden px-5 py-3 text-end font-medium md:table-cell">
                  {t('shortLinks.colClicks')}
                </th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">
                  {t('shortLinks.colStatus')}
                </th>
                <th className="hidden px-5 py-3 font-medium xl:table-cell">
                  {t('shortLinks.colCreated')}
                </th>
                <th className="px-5 py-3 text-end font-medium">{t('shortLinks.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shortLinks.map((link) => (
                <tr key={link.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4">
                    <a
                      href={`/s/${link.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-medium hover:underline"
                    >
                      /s/{link.code}
                    </a>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span
                      className="block max-w-64 truncate text-muted-foreground"
                      title={link.targetUrl}
                    >
                      {link.targetUrl}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell">
                    {link.owner.email}
                  </td>
                  <td className="hidden px-5 py-4 text-end text-muted-foreground tabular-nums md:table-cell">
                    {formatNumber(locale, link.clicks)}
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <StatusPill
                      status={link.status}
                      label={t(`status.${link.status.toLowerCase()}`)}
                    />
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground xl:table-cell">
                    {dateFormatter.format(link.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-end">
                    <AdminShortLinkRowActions shortLinkId={link.id} status={link.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
