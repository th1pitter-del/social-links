import Link from 'next/link'
import { ArrowUpRight, CalendarDays, ImageIcon, UserRound } from 'lucide-react'

import { cn } from 'cn'
import { blogCategoryHref, blogPostHref, blogPostText, type BlogPostSummary } from '@/lib/blog'
import type { Locale } from '@/i18n/config'

export function formatBlogDate(locale: string, iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(iso),
  )
}

export function BlogCategoryChip({ name, slug }: { name: string; slug: string }) {
  return (
    <Link
      href={blogCategoryHref(slug)}
      className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {name}
    </Link>
  )
}

function Cover({ post, locale }: { post: BlogPostSummary; locale: Locale }) {
  const text = blogPostText(post, locale)
  if (post.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.coverImage}
        alt={post.coverAlt || text.title}
        loading="lazy"
        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex size-full items-center justify-center bg-[radial-gradient(60%_60%_at_50%_0%,rgba(201,247,42,0.18),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(213,255,47,0.12),transparent)]"
    >
      <ImageIcon className="size-8 text-muted-foreground/40" />
    </span>
  )
}

/** Small square thumbnail (cover image or lime placeholder) for compact lists. */
export function BlogThumb({ post, locale }: { post: BlogPostSummary; locale: Locale }) {
  const text = blogPostText(post, locale)
  if (post.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.coverImage}
        alt={post.coverAlt || text.title}
        loading="lazy"
        className="size-full object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex size-full items-center justify-center bg-[radial-gradient(60%_60%_at_50%_0%,rgba(201,247,42,0.18),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(213,255,47,0.12),transparent)]"
    >
      <ImageIcon className="size-5 text-muted-foreground/40" />
    </span>
  )
}

/** The grid card used by the index, archives and related lists. */
export async function BlogPostCard({
  post,
  locale,
  className,
}: {
  post: BlogPostSummary
  locale: Locale
  className?: string
}) {
  const text = blogPostText(post, locale)
  const date = formatBlogDate(locale, post.publishedAt ?? post.createdAt)

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20',
        className,
      )}
    >
      <Link href={blogPostHref(post.slug)} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden border-b bg-muted">
          <Cover post={post} locale={locale} />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {post.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                {post.category.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 text-accent-text" aria-hidden />
              {date}
            </span>
          </div>
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-balance group-hover:underline">
            {text.title}
          </h3>
          {text.excerpt ? (
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{text.excerpt}</p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3.5 shrink-0 text-accent-text" aria-hidden />
              <span className="truncate">{post.author?.name ?? ''}</span>
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100"
              aria-hidden
            />
          </div>
        </div>
      </Link>
    </article>
  )
}
