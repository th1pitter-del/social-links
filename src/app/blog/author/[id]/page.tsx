import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { BlogArchivePage } from '@/components/blog/blog-archive'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { blogAuthorHref, parseBlogPage } from '@/lib/blog'
import { getBlogArchive } from '@/lib/blog-data'
import { pageMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const [locale, t] = await Promise.all([getLocale(), getTranslations('blog')])
  const result = await getBlogArchive({ kind: 'author', slug: id, page: 1, locale: locale as Locale })
  if (!result.ok) return {}
  // Author archives only repeat the post lists; keep them crawlable but out
  // of the index so they cannot compete with the article pages themselves.
  return pageMetadata({
    title: result.title,
    description: t('archive.authorDescription', { name: result.title }),
    path: blogAuthorHref(id),
    noindex: true,
  })
}

export default async function BlogAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ id }, { page: rawPage }] = await Promise.all([params, searchParams])
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('blog')

  const data = await getBlogArchive({ kind: 'author', slug: id, page: parseBlogPage(rawPage), locale })
  if (!data.ok) notFound()

  return (
    <>
      <SiteHeader />
      <BlogArchivePage
        eyebrow={t('archive.eyebrow.author')}
        title={data.title}
        description={data.description}
        posts={data.posts}
        total={data.total}
        page={data.page}
        pageCount={data.pageCount}
        locale={locale}
        hrefFor={(page) =>
          page === 1 ? `/blog/author/${id}` : `/blog/author/${id}?page=${page}`
        }
        empty={{
          title: t('archive.emptyTitle'),
          body: t('archive.emptyBody'),
        }}
      />
      <SiteFooter />
    </>
  )
}
