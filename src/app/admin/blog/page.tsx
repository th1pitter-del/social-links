import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Eye, FilePlus2, FileText, Newspaper, Send, Timer } from 'lucide-react'

import { BlogSubnav } from '@/components/admin/blog-subnav'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { StatCard } from '@/components/admin/stat-card'
import { StatusPill } from '@/components/status-pill'
import { Timestamp } from '@/components/timestamp'
import { Button } from '@/components/ui/button'
import { effectiveBlogPostStatus } from '@/lib/blog'
import { getAdminBlogSummary } from '@/lib/blog-data'
import { formatNumber } from '@/lib/format'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blog') }
}

export default async function AdminBlogPage() {
  await requireAdmin()
  const [t, locale, summary] = await Promise.all([
    getTranslations('admin.blog'),
    getLocale(),
    getAdminBlogSummary(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Newspaper}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/blog/articles/new">
              <FilePlus2 />
              {t('newArticle')}
            </Link>
          </Button>
        }
      />

      <BlogSubnav active="overview" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('stats.published')} value={summary.published} icon={FileText} tone="indigo" />
        <StatCard label={t('stats.drafts')} value={summary.draft} icon={FileText} tone="sky" />
        <StatCard label={t('stats.scheduled')} value={summary.scheduled} icon={Timer} tone="amber" />
        <StatCard
          label={t('stats.views')}
          value={formatNumber(locale, summary.views)}
          icon={Eye}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title={t('popular.title')}
            description={t('popular.description')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/blog/articles?sort=views">{t('viewAll')}</Link>
              </Button>
            }
          />
          {summary.popular.length === 0 ? (
            <EmptyState className="m-5">{t('popular.empty')}</EmptyState>
          ) : (
            <ol className="divide-y divide-border">
              {summary.popular.map((post, index) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/blog/articles/${post.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t('popular.views', { count: formatNumber(locale, post.viewCount) })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={t('recent.title')}
            description={t('recent.description')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/blog/articles">{t('viewAll')}</Link>
              </Button>
            }
          />
          {summary.recent.length === 0 ? (
            <EmptyState className="m-5">{t('recent.empty')}</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {summary.recent.map((post) => {
                const status = effectiveBlogPostStatus(post)
                return (
                  <li key={post.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/blog/articles/${post.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        <Timestamp value={new Date(post.updatedAt)} />
                      </p>
                    </div>
                    <StatusPill
                      status={status}
                      label={t(`status.${status.toLowerCase()}`)}
                      className="shrink-0"
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Send className="size-3.5 shrink-0" aria-hidden />
        {t('schedulingNote')}
      </p>
    </div>
  )
}
