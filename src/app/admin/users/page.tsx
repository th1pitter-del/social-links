import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AdminUsersTable } from '@/components/admin/admin-users-table'
import { FilterTabs } from '@/components/admin/filter-tabs'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('users') }
}

const STATUSES = ['all', 'admin', 'banned'] as const
type Status = (typeof STATUSES)[number]

function parseStatus(value?: string): Status {
  return STATUSES.includes(value as Status) ? (value as Status) : 'all'
}

function buildHref(status: Status, query: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  const qs = params.toString()
  return `/admin/users${qs ? `?${qs}` : ''}`
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const session = await requireAdmin()
  const t = await getTranslations('admin')
  const { q, status } = await searchParams
  const query = (q ?? '').trim().slice(0, 100)
  const filter = parseStatus(status)

  const where = {
    ...(query
      ? { OR: [{ email: { contains: query } }, { name: { contains: query } }] }
      : {}),
    ...(filter === 'admin' ? { role: 'ADMIN' as const } : {}),
    ...(filter === 'banned' ? { banned: true } : {}),
  }

  const [users, total, admins, banned] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
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
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { banned: true } }),
  ])

  const exportHref = `/admin/users/export?${new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(filter !== 'all' ? { status: filter } : {}),
  }).toString()}`

  const filterLabels = {
    all: t('users.filterAll'),
    admin: t('users.filterAdmins'),
    banned: t('users.filterBanned'),
  } as const

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
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
              label: filterLabels.admin,
              href: buildHref('admin', query),
              active: filter === 'admin',
              count: admins,
            },
            {
              label: filterLabels.banned,
              href: buildHref('banned', query),
              active: filter === 'banned',
              count: banned,
            },
          ]}
        />

        <form method="get" className="flex w-full gap-2 sm:max-w-md">
          {filter !== 'all' ? <input type="hidden" name="status" value={filter} /> : null}
          <Input name="q" defaultValue={query} placeholder={t('users.searchPlaceholder')} />
          <Button type="submit" variant="outline">
            {t('common.search')}
          </Button>
        </form>
      </div>

      {users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
          {t('users.noUsers')}
        </p>
      ) : (
        <AdminUsersTable
          currentUserId={session.user.id}
          users={users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            banned: user.banned,
            linkCount: user._count.links,
            createdAt: user.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  )
}
