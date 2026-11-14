import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'

import { BlogFeaturedPost } from '@/components/blog/blog-featured-post'
import { BlogPagination } from '@/components/blog/blog-pagination'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { getBlogIndex } from '@/lib/blog-data'
import { blogCategoryText } from '@/lib/blog'
import { pageMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('blog')
  return pageMetadata({
    title: t('meta.title'),
    description: t('meta.description'),
    path: '/blog',
  })
}

function parsePage(value?: string) {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const [{ page: rawPage }, t] = await Promise.all([searchParams, getTranslations('blog')])
  const locale = (await getLocale()) as Locale
  const data = await getBlogIndex(parsePage(rawPage))
  const isEmpty = data.total === 0

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(60%_55%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
          />
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {t('index.eyebrow')}
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t('index.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              {t('index.intro')}
            </p>
            <form action="/blog/search" method="get" className="mt-8 flex w-full max-w-md gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  aria-label={t('search.placeholder')}
                  placeholder={t('search.placeholder')}
                  className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>
              <Button type="submit" variant="outline" className="h-10">
                {t('search.action')}
              </Button>
            </form>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 py-12 sm:py-14">
          {data.categories.length > 0 ? (
            <nav aria-label={t('index.categories')} className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {t('index.allCategories')}
              </span>
              {data.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/blog/category/${category.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {blogCategoryText(category, locale).name}
                  <span className="text-[10px] tabular-nums opacity-60">{category.postCount}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {isEmpty ? (
            <div className="rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
              <h2 className="text-lg font-semibold tracking-tight">{t('index.emptyTitle')}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t('index.emptyBody')}
              </p>
              <Button className="mt-5" asChild>
                <Link href="/create">{t('index.emptyCta')}</Link>
              </Button>
            </div>
          ) : (
            <>
              {data.featured ? (
                <section aria-labelledby="blog-featured">
                  <h2 id="blog-featured" className="sr-only">
                    {t('index.featured')}
                  </h2>
                  <BlogFeaturedPost
                    post={data.featured}
                    locale={locale}
                    eyebrow={t('index.featured')}
                    cta={t('index.readArticle')}
                  />
                </section>
              ) : null}

              {data.posts.length > 0 ? (
                <section aria-labelledby="blog-latest">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 id="blog-latest" className="text-2xl font-semibold tracking-tight">
                        {t('index.latest')}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{t('index.latestIntro')}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.posts.map((post) => (
                      <BlogPostCard key={post.id} post={post} locale={locale} />
                    ))}
                  </div>
                  <div className="mt-10">
                    <BlogPagination
                      page={data.page}
                      pageCount={data.pageCount}
                      hrefFor={(page) => (page === 1 ? '/blog' : `/blog?page=${page}`)}
                      labels={{
                        previous: t('pagination.previous'),
                        next: t('pagination.next'),
                        page: t('pagination.label'),
                      }}
                    />
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
