import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { BlogArchivePage } from '@/components/blog/blog-archive'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { blogCategoryHref, parseBlogPage } from '@/lib/blog'
import { getBlogArchive } from '@/lib/blog-data'
import { pageMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [locale, t] = await Promise.all([getLocale(), getTranslations('blog')])
  const result = await getBlogArchive({ kind: 'category', slug, page: 1, locale: locale as Locale })
  if (!result.ok) return {}
  return pageMetadata({
    title: result.title,
    description: result.description || t('meta.description'),
    path: blogCategoryHref(slug),
  })
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('blog')

  const data = await getBlogArchive({
    kind: 'category',
    slug,
    page: parseBlogPage(rawPage),
    locale,
  })
  if (!data.ok) notFound()

  return (
    <>
      <SiteHeader />
      <BlogArchivePage
        eyebrow={t('archive.eyebrow.category')}
        title={data.title}
        description={data.description}
        posts={data.posts}
        total={data.total}
        page={data.page}
        pageCount={data.pageCount}
        locale={locale}
        hrefFor={(page) =>
          page === 1
            ? `/blog/category/${slug}`
            : `/blog/category/${slug}?page=${page}`
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
