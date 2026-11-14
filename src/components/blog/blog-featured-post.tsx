import Link from 'next/link'
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatBlogDate } from '@/components/blog/blog-post-card'
import { blogCategoryName, blogPostHref, blogPostText, type BlogPostSummary } from '@/lib/blog'
import type { Locale } from '@/i18n/config'

/** The index leads with one article; the composition is deliberately unlike the grid. */
export async function BlogFeaturedPost({
  post,
  locale,
  eyebrow,
  cta,
}: {
  post: BlogPostSummary
  locale: Locale
  eyebrow: string
  cta: string
}) {
  const text = blogPostText(post, locale)
  const date = formatBlogDate(locale, post.publishedAt ?? post.createdAt)

  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card">
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Link
          href={blogPostHref(post.slug)}
          className="relative block aspect-[16/9] overflow-hidden border-b bg-muted lg:aspect-auto lg:min-h-[360px] lg:border-b-0 lg:border-e"
        >
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.coverAlt || text.title}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <span
              aria-hidden
              className="flex size-full items-center justify-center bg-[radial-gradient(70%_70%_at_50%_10%,rgba(201,247,42,0.22),transparent)] dark:bg-[radial-gradient(70%_70%_at_50%_10%,rgba(213,255,47,0.14),transparent)]"
            >
              <Sparkles className="size-10 text-accent-text/60" />
            </span>
          )}
        </Link>

        <div className="flex flex-col gap-4 p-6 sm:p-8 lg:justify-center lg:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground">
              <Sparkles className="size-3" aria-hidden />
              {eyebrow}
            </span>
            {post.category ? (
              <span className="text-muted-foreground">
                {blogCategoryName(post.category, locale)}
              </span>
            ) : null}
          </div>
          <h2 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
            <Link href={blogPostHref(post.slug)} className="hover:underline">
              {text.title}
            </Link>
          </h2>
          {text.excerpt ? (
            <p className="line-clamp-4 text-base leading-7 text-muted-foreground text-pretty">
              {text.excerpt}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-accent-text" aria-hidden />
              {date}
            </span>
            {post.author ? <span>{post.author.name}</span> : null}
          </div>
          <div>
            <Button size="lg" asChild>
              <Link href={blogPostHref(post.slug)}>
                {cta}
                <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
