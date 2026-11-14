import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Tag,
  UserRound,
} from 'lucide-react'

import { BlogArticleAside } from '@/components/blog/blog-article-aside'
import { BlogPostCard, BlogCategoryChip, BlogThumb, formatBlogDate } from '@/components/blog/blog-post-card'
import { BlogShare } from '@/components/blog/blog-share'
import { BlogViewBeacon } from '@/components/blog/blog-view-beacon'
import {
  blogAuthorHref,
  blogCategoryName,
  blogPostHref,
  blogPostText,
  blogTagHref,
  blogTagText,
  readingMinutes,
  type BlogPostData,
  type BlogPostSummary,
} from '@/lib/blog'
import type { BlogSidebarTag } from '@/lib/blog-data'
import { prepareArticle } from '@/lib/blog-article'
import { sanitizeRichText } from '@/lib/rich-text'
import { absoluteUrl } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

export async function BlogArticleView({
  post,
  related,
  adjacent,
  popular,
  recent,
  tags,
  locale,
  preview = false,
}: {
  post: BlogPostData
  related: BlogPostSummary[]
  adjacent: { previous: BlogPostSummary | null; next: BlogPostSummary | null }
  popular: BlogPostSummary[]
  recent: BlogPostSummary[]
  tags: BlogSidebarTag[]
  locale: Locale
  preview?: boolean
}) {
  const t = await getTranslations('blog.article')
  const text = blogPostText(post, locale)
  const { html } = prepareArticle(sanitizeRichText(text.content))
  const minutes = readingMinutes(text.content)
  const published = post.publishedAt ?? post.createdAt
  const publishedLabel = formatBlogDate(locale, published)
  const updatedLabel = formatBlogDate(locale, post.updatedAt)
  const showUpdated =
    post.status === 'PUBLISHED' &&
    new Date(post.updatedAt).getTime() - new Date(published).getTime() > 86_400_000

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(60%_55%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
        />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:py-16">
          <nav aria-label={t('breadcrumbs')} className="text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <li>
                <Link href="/" className="hover:text-foreground">
                  {t('home')}
                </Link>
              </li>
              <li aria-hidden className="rtl:rotate-180">
                /
              </li>
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  {t('blog')}
                </Link>
              </li>
              {post.category ? (
                <>
                  <li aria-hidden className="rtl:rotate-180">
                    /
                  </li>
                  <li>
                    <Link href={`/blog/category/${post.category.slug}`} className="hover:text-foreground">
                      {blogCategoryName(post.category, locale)}
                    </Link>
                  </li>
                </>
              ) : null}
            </ol>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {post.category ? (
              <BlogCategoryChip
                name={blogCategoryName(post.category, locale)}
                slug={post.category.slug}
              />
            ) : null}
            {post.status !== 'PUBLISHED' ? (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium">
                {t('draftBadge')}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {text.title}
          </h1>
          {text.excerpt ? (
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground text-pretty">
              {text.excerpt}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {post.author ? (
              <span className="inline-flex items-center gap-2">
                <UserRound className="size-4 text-accent-text" aria-hidden />
                <Link href={blogAuthorHref(post.author.id)} className="hover:text-foreground">
                  {post.author.name}
                </Link>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-accent-text" aria-hidden />
              {publishedLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-accent-text" aria-hidden />
              {t('readMinutes', { minutes })}
            </span>
          </div>
          {showUpdated ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('updated', { date: updatedLabel })}
            </p>
          ) : null}
        </div>
      </section>

      {preview ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6">
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            {t('previewNotice')}
          </p>
        </div>
      ) : null}

      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 lg:py-14">
        <div className="min-w-0 max-w-3xl">
          {post.coverImage ? (
            <figure className="mb-8 overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImage}
                alt={post.coverAlt || text.title}
                className="aspect-[16/9] w-full object-cover"
              />
              {post.coverAlt ? (
                <figcaption className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {post.coverAlt}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {html ? (
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('emptyBody')}</p>
          )}

          {post.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t pt-6">
              <Tag className="size-4 text-accent-text" aria-hidden />
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={blogTagHref(tag.slug)}
                  className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {blogTagText(tag, locale)}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 rounded-xl border bg-card p-4">
            <BlogShare url={absoluteUrl(blogPostHref(post.slug))} title={text.title} />
          </div>

          {adjacent.previous || adjacent.next ? (
            <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label={t('moreArticles')}>
              {adjacent.previous ? (
                <Link
                  href={blogPostHref(adjacent.previous.slug)}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20"
                >
                  <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <BlogThumb post={adjacent.previous} locale={locale} />
                  </span>
                  <span className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden />
                      {t('previousArticle')}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm font-medium group-hover:underline">
                      {blogPostText(adjacent.previous, locale).title}
                    </span>
                  </span>
                </Link>
              ) : null}
              {adjacent.next ? (
                <Link
                  href={blogPostHref(adjacent.next.slug)}
                  className="group flex flex-row-reverse items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 sm:col-start-2"
                >
                  <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                    <BlogThumb post={adjacent.next} locale={locale} />
                  </span>
                  <span className="min-w-0 flex-1 text-end">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {t('nextArticle')}
                      <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm font-medium group-hover:underline">
                      {blogPostText(adjacent.next, locale).title}
                    </span>
                  </span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>

        <aside className="min-w-0">
          <BlogArticleAside popular={popular} recent={recent} tags={tags} locale={locale} />
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="border-t">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{t('relatedTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('relatedDescription')}</p>
              </div>
              <Link
                href="/blog"
                className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                {t('allArticles')}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <BlogPostCard key={item.id} post={item} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {preview ? null : <BlogViewBeacon slug={post.slug} />}
    </main>
  )
}
