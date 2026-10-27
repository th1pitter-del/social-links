import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AdminLinksTable } from '@/components/admin/admin-links-table'
import { FilterTabs } from '@/components/admin/filter-tabs'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('links') }
}

const STATUSES = ['all', 'active', 'draft', 'disabled'] as const
type StatusFilter = (typeof STATUSES)[number]

function parseStatus(value?: string): StatusFilter {
  return STATUSES.includes(value as StatusFilter) ? (value as StatusFilter) : 'all'
}

const statusMap: Record<Exclude<StatusFilter, 'all'>, 'ACTIVE' | 'DRAFT' | 'DISABLED'> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  disabled: 'DISABLED',
}

function buildHref(status: StatusFilter, query: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  const qs = params.toString()
  return `/admin/links${qs ? `?${qs}` : ''}`
}

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const t = await getTranslations('admin')
  const { q, status } = await searchParams
  const query = (q ?? '').trim().slice(0, 100)
  const filter = parseStatus(status)

  const where = {
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { slug: { contains: query } },
            { owner: { email: { contains: query } } },
          ],
        }
      : {}),
    ...(filter !== 'all' ? { status: statusMap[filter] } : {}),
  }

  const [links, total, active, draft, disabled] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        createdAt: true,
        owner: { select: { email: true } },
        _count: { select: { unlocks: true, events: true } },
      },
    }),
    prisma.link.count(),
    prisma.link.count({ where: { status: 'ACTIVE' } }),
    prisma.link.count({ where: { status: 'DRAFT' } }),
    prisma.link.count({ where: { status: 'DISABLED' } }),
  ])

  const exportHref = `/admin/links/export?${new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(filter !== 'all' ? { status: filter } : {}),
  }).toString()}`

  const filterLabels = {
    all: t('links.filterAll'),
    active: t('links.filterActive'),
    draft: t('links.filterDraft'),
    disabled: t('links.filterDisabled'),
  } as const

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('links.title')}
        description={t('links.description')}
        actions={
          <Button variant="outline" asChild>
            <a href={exportHref}>
              <Download />
              {t('common.exportCsv')}
            </a>
          </Button>
        }
      />

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
              label: filterLabels.draft,
              href: buildHref('draft', query),
              active: filter === 'draft',
              count: draft,
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
          <Input name="q" defaultValue={query} placeholder={t('links.searchPlaceholder')} />
          <Button type="submit" variant="outline">
            {t('common.search')}
          </Button>
        </form>
      </div>

      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
          {t('links.noLinks')}
        </p>
      ) : (
        <AdminLinksTable
          links={links.map((link) => ({
            id: link.id,
            slug: link.slug,
            title: link.title,
            status: link.status,
            ownerEmail: link.owner?.email ?? t('common.guestNoAccount'),
            unlocks: link._count.unlocks,
            events: link._count.events,
          }))}
        />
      )}
    </div>
  )
}
