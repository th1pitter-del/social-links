import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { ChevronLeft, ChevronRight, FilePlus2, Search } from 'lucide-react'

import { BlogPostRowActions } from '@/components/admin/blog-post-row-actions'
import { BlogSubnav } from '@/components/admin/blog-subnav'
import { FilterTabs } from '@/components/admin/filter-tabs'
import { NoResults } from '@/components/admin/no-results'
import { PageHeader } from '@/components/admin/page-header'
import { Panel } from '@/components/admin/panel'
import { StatusPill } from '@/components/status-pill'
import { Timestamp } from '@/components/timestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  effectiveBlogPostStatus,
  type BlogStatusFilter,
} from '@/lib/blog'
import {
  getAdminBlogPosts,
  getBlogCategoryOptions,
  type AdminBlogSort,
} from '@/lib/blog-data'
import { formatNumber } from '@/lib/format'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blogArticles') }
}

const STATUSES: BlogStatusFilter[] = ['all', 'published', 'draft', 'scheduled']
const SORTS: AdminBlogSort[] = ['updated', 'published', 'title', 'views']

function parseStatus(value?: string): BlogStatusFilter {
  return STATUSES.includes(value as BlogStatusFilter) ? (value as BlogStatusFilter) : 'all'
}

function parseSort(value?: string): AdminBlogSort {
  return SORTS.includes(value as AdminBlogSort) ? (value as AdminBlogSort) : 'updated'
}

function parsePage(value?: string): number {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export default async function AdminBlogArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    category?: string
    page?: string
    sort?: string
  }>
}) {
  await requireAdmin()
  const params = await searchParams
  const query = (params.q ?? '').trim().slice(0, 100)
  const status = parseStatus(params.status)
  const categoryId = (params.category ?? '').trim()
  const sort = parseSort(params.sort)
  const page = parsePage(params.page)

  const [t, locale, categoryOptions, data] = await Promise.all([
    getTranslations('admin.blog'),
    getLocale(),
    getBlogCategoryOptions(),
    getAdminBlogPosts({ query, status, categoryId, page, sort }),
  ])

  const buildHref = (patch: {
    q?: string
    status?: BlogStatusFilter
    category?: string
    sort?: AdminBlogSort
    page?: number
  }) => {
    const next = new URLSearchParams()
    const q = patch.q ?? query
    const nextStatus = patch.status ?? status
    const category = patch.category ?? categoryId
    const nextSort = patch.sort ?? sort
    const nextPage = patch.page ?? 1
    if (q) next.set('q', q)
    if (nextStatus !== 'all') next.set('status', nextStatus)
    if (category) next.set('category', category)
    if (nextSort !== 'updated') next.set('sort', nextSort)
    if (nextPage > 1) next.set('page', String(nextPage))
    const qs = next.toString()
    return `/admin/blog/articles${qs ? `?${qs}` : ''}`
  }

  const filtered = query !== '' || status !== 'all' || categoryId !== ''

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('articlesTitle')}
        description={t('articlesDescription')}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/blog/articles/new">
              <FilePlus2 />
              {t('newArticle')}
            </Link>
          </Button>
        }
      />

      <BlogSubnav active="articles" />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterTabs
          items={[
            { label: t('filters.all'), href: buildHref({ status: 'all' }), active: status === 'all', count: data.counts.all },
            {
              label: t('status.published'),
              href: buildHref({ status: 'published' }),
              active: status === 'published',
              count: data.counts.published,
            },
            { label: t('status.draft'), href: buildHref({ status: 'draft' }), active: status === 'draft', count: data.counts.draft },
            {
              label: t('status.scheduled'),
              href: buildHref({ status: 'scheduled' }),
              active: status === 'scheduled',
              count: data.counts.scheduled,
            },
          ]}
        />

        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="w-56 ps-8"
            />
          </div>
          <label className="sr-only" htmlFor="blog-category-filter">
            {t('categoryFilter')}
          </label>
          <select
            id="blog-category-filter"
            name="category"
            defaultValue={categoryId}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm dark:bg-input/30"
          >
            <option value="">{t('allCategories')}</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="blog-sort">
            {t('sortLabel')}
          </label>
          <select
            id="blog-sort"
            name="sort"
            defaultValue={sort}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm dark:bg-input/30"
          >
            <option value="updated">{t('sorts.updated')}</option>
            <option value="published">{t('sorts.published')}</option>
            <option value="title">{t('sorts.title')}</option>
            <option value="views">{t('sorts.views')}</option>
          </select>
          {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
          <Button type="submit" variant="outline" size="sm" className="h-8">
            {t('applyFilters')}
          </Button>
        </form>
      </div>

      {data.total === 0 ? (
        filtered ? (
          <NoResults
            message={t('noResults')}
            clearLabel={t('clearFilters')}
            clearHref="/admin/blog/articles"
            filtered
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/admin/blog/articles/new">
                <FilePlus2 />
                {t('newArticle')}
              </Link>
            </Button>
          </div>
        )
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('columns.article')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.author')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.category')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.dates')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('columns.views')}</th>
                  <th className="px-5 py-3 text-end font-medium">{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.posts.map((post) => {
                  const effective = effectiveBlogPostStatus(post)
                  return (
                    <tr key={post.id} className="align-middle hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {post.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.coverImage}
                              alt=""
                              className="h-10 w-16 shrink-0 rounded border border-border object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground"
                            >
                              {t('noImage')}
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/admin/blog/articles/${post.id}`}
                              className="line-clamp-1 max-w-xs font-medium hover:underline"
                            >
                              {post.title}
                            </Link>
                            <p className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                              /blog/{post.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={effective}
                          label={t(`status.${effective.toLowerCase()}`)}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {post.author?.name ?? t('noAuthor')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {post.category?.name ?? t('uncategorized')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p>
                          {t('updatedLabel')} <Timestamp value={new Date(post.updatedAt)} withTime={false} />
                        </p>
                        {post.publishedAt ? (
                          <p>
                            {effective === 'SCHEDULED' ? t('scheduledLabel') : t('publishedLabel')}{' '}
                            <Timestamp value={new Date(post.publishedAt)} withTime={false} />
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                        {formatNumber(locale, post.viewCount)}
                      </td>
                      <td className="px-5 py-3">
                        <BlogPostRowActions post={post} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {t('pagination', { page: data.page, pages: data.pageCount, total: data.total })}
            </p>
            <div className="flex items-center gap-2">
              {data.page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildHref({ page: data.page - 1 })}>
                    <ChevronLeft className="rtl:rotate-180" />
                    {t('previous')}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="rtl:rotate-180" />
                  {t('previous')}
                </Button>
              )}
              {data.page < data.pageCount ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildHref({ page: data.page + 1 })}>
                    {t('next')}
                    <ChevronRight className="rtl:rotate-180" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  {t('next')}
                  <ChevronRight className="rtl:rotate-180" />
                </Button>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
