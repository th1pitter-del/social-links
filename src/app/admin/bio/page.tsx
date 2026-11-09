import { getLocale, getTranslations } from 'next-intl/server'

import { AdminBioRowActions } from '@/components/admin/admin-bio-row-actions'
import { FilterTabs } from '@/components/admin/filter-tabs'
import { NoResults } from '@/components/admin/no-results'
import { PageHeader } from '@/components/admin/page-header'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BIO_THEMES } from '@/lib/bio-themes'
import { formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('bioPages') }
}

const FILTERS = ['all', 'published', 'draft'] as const
type BioFilter = (typeof FILTERS)[number]

function parseFilter(value?: string): BioFilter {
  return FILTERS.includes(value as BioFilter) ? (value as BioFilter) : 'all'
}

function buildHref(filter: BioFilter, query: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (filter !== 'all') params.set('status', filter)
  const qs = params.toString()
  return `/admin/bio${qs ? `?${qs}` : ''}`
}

const themeLabels = new Map(BIO_THEMES.map((theme) => [theme.id, theme.label]))

export default async function AdminBioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const [t, locale] = await Promise.all([getTranslations('admin'), getLocale()])
  const { q, status } = await searchParams
  const query = (q ?? '').trim().slice(0, 100)
  const filter = parseFilter(status)
  const filtered = query !== '' || filter !== 'all'

  const where = {
    ...(query
      ? {
          OR: [
            { handle: { contains: query } },
            { displayName: { contains: query } },
            { user: { email: { contains: query } } },
          ],
        }
      : {}),
    ...(filter === 'published' ? { published: true } : {}),
    ...(filter === 'draft' ? { published: false } : {}),
  }

  const [profiles, total, published, drafts] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        handle: true,
        displayName: true,
        theme: true,
        published: true,
        createdAt: true,
        _count: { select: { links: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.profile.count(),
    prisma.profile.count({ where: { published: true } }),
    prisma.profile.count({ where: { published: false } }),
  ])

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  return (
    <div className="space-y-6">
      <PageHeader title={t('bioPages.title')} description={t('bioPages.description')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          items={[
            {
              label: t('bioPages.filterAll'),
              href: buildHref('all', query),
              active: filter === 'all',
              count: total,
            },
            {
              label: t('bioPages.filterPublished'),
              href: buildHref('published', query),
              active: filter === 'published',
              count: published,
            },
            {
              label: t('bioPages.filterDraft'),
              href: buildHref('draft', query),
              active: filter === 'draft',
              count: drafts,
            },
          ]}
        />

        <form method="get" className="flex w-full gap-2 sm:max-w-md">
          {filter !== 'all' ? <input type="hidden" name="status" value={filter} /> : null}
          <Input
            name="q"
            defaultValue={query}
            placeholder={t('bioPages.searchPlaceholder')}
            aria-label={t('bioPages.searchPlaceholder')}
          />
          <Button type="submit" variant="outline">
            {t('common.search')}
          </Button>
        </form>
      </div>

      {profiles.length === 0 ? (
        <NoResults
          filtered={filtered}
          message={filtered ? t('bioPages.noProfiles') : t('bioPages.emptyList')}
          clearLabel={t('common.clearFilters')}
          clearHref="/admin/bio"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-start text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('bioPages.colHandle')}</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">
                  {t('bioPages.colOwner')}
                </th>
                <th className="hidden px-5 py-3 text-end font-medium md:table-cell">
                  {t('bioPages.colLinks')}
                </th>
                <th className="hidden px-5 py-3 font-medium xl:table-cell">
                  {t('bioPages.colTheme')}
                </th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">
                  {t('bioPages.colStatus')}
                </th>
                <th className="hidden px-5 py-3 font-medium xl:table-cell">
                  {t('bioPages.colCreated')}
                </th>
                <th className="px-5 py-3 text-end font-medium">{t('bioPages.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4">
                    <a
                      href={`/bio/${profile.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      /bio/{profile.handle}
                    </a>
                    {profile.displayName ? (
                      <p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">
                        {profile.displayName}
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell">
                    {profile.user.email}
                  </td>
                  <td className="hidden px-5 py-4 text-end text-muted-foreground tabular-nums md:table-cell">
                    {formatNumber(locale, profile._count.links)}
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground xl:table-cell">
                    {themeLabels.get(profile.theme) ?? profile.theme}
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <StatusPill
                      status={profile.published ? 'ACTIVE' : 'DRAFT'}
                      label={
                        profile.published ? t('bioPages.published') : t('bioPages.draft')
                      }
                    />
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground xl:table-cell">
                    {dateFormatter.format(profile.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-end">
                    <AdminBioRowActions
                      profileId={profile.id}
                      handle={profile.handle}
                      published={profile.published}
                    />
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
