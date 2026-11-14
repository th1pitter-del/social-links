import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'

import { BlogPagination } from '@/components/blog/blog-pagination'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { Button } from '@/components/ui/button'
import type { BlogPostSummary } from '@/lib/blog'
import type { Locale } from '@/i18n/config'

/** Category, tag, author and search share one archive layout. */
export async function BlogArchivePage({
  eyebrow,
  title,
  description,
  posts,
  total,
  page,
  pageCount,
  locale,
  hrefFor,
  search,
  empty,
}: {
  eyebrow: string
  title: string
  description: string
  posts: BlogPostSummary[]
  total: number
  page: number
  pageCount: number
  locale: Locale
  hrefFor: (page: number) => string
  search?: { query: string; placeholder: string; action: string }
  empty: { title: string; body: string }
}) {
  const t = await getTranslations('blog')

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(60%_55%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
        />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {eyebrow}
          </span>
          <h1 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-muted-foreground">
            {t('archive.count', { count: total })}
          </p>

          {search ? (
            <form action="/blog/search" method="get" className="mt-6 flex w-full max-w-md gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={search.query}
                  aria-label={search.placeholder}
                  placeholder={search.placeholder}
                  className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>
              <Button type="submit" variant="outline" className="h-10">
                {search.action}
              </Button>
            </form>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-12 sm:py-14">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
            <h2 className="text-lg font-semibold tracking-tight">{empty.title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{empty.body}</p>
            <Button className="mt-5" asChild>
              <Link href="/blog">{t('archive.backToBlog')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogPostCard key={post.id} post={post} locale={locale} />
              ))}
            </div>
            <BlogPagination
              page={page}
              pageCount={pageCount}
              hrefFor={hrefFor}
              labels={{
                previous: t('pagination.previous'),
                next: t('pagination.next'),
                page: t('pagination.label'),
              }}
            />
          </>
        )}
      </div>
    </main>
  )
}
