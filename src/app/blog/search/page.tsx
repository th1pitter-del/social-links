import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { BlogArchivePage } from '@/components/blog/blog-archive'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { parseBlogPage } from '@/lib/blog'
import { getBlogArchive } from '@/lib/blog-data'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('blog')
  return {
    title: t('search.title'),
    robots: { index: false, follow: true },
  }
}

export default async function BlogSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page: rawPage } = await searchParams
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('blog')
  const query = (q ?? '').trim().slice(0, 100)

  const data = await getBlogArchive({
    kind: 'search',
    slug: '',
    page: parseBlogPage(rawPage),
    query,
    locale,
  })

  const posts = data.ok ? data.posts : []
  const total = data.ok ? data.total : 0
  const page = data.ok ? data.page : 1
  const pageCount = data.ok ? data.pageCount : 1

  return (
    <>
      <SiteHeader />
      <BlogArchivePage
        eyebrow={t('archive.eyebrow.search')}
        title={query ? t('search.resultsFor', { query }) : t('search.title')}
        description={query ? '' : t('search.intro')}
        posts={posts}
        total={total}
        page={page}
        pageCount={pageCount}
        locale={locale}
        search={{
          query,
          placeholder: t('search.placeholder'),
          action: t('search.action'),
        }}
        hrefFor={(next) => {
          const params = new URLSearchParams()
          if (query) params.set('q', query)
          if (next > 1) params.set('page', String(next))
          const qs = params.toString()
          return `/blog/search${qs ? `?${qs}` : ''}`
        }}
        empty={{
          title: query ? t('search.emptyTitle') : t('archive.emptyTitle'),
          body: query ? t('search.emptyBody', { query }) : t('archive.emptyBody'),
        }}
      />
      <SiteFooter />
    </>
  )
}
