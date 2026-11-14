import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BlogThumb, formatBlogDate } from '@/components/blog/blog-post-card'
import { blogPostHref, blogPostText, blogTagHref, blogTagText, type BlogPostSummary } from '@/lib/blog'
import type { BlogSidebarTag } from '@/lib/blog-data'
import type { Locale } from '@/i18n/config'

function AsideHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function PostListItem({
  post,
  locale,
  index,
}: {
  post: BlogPostSummary
  locale: Locale
  index?: number
}) {
  const text = blogPostText(post, locale)
  return (
    <li>
      <Link
        href={blogPostHref(post.slug)}
        className="group -mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
      >
        <span className="relative block size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <BlogThumb post={post} locale={locale} />
          {typeof index === 'number' ? (
            <span className="absolute start-1 top-1 rounded bg-primary px-1 text-[10px] font-semibold text-accent-text tabular-nums">
              {index + 1}
            </span>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 text-sm leading-snug font-medium group-hover:underline">
            {text.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatBlogDate(locale, post.publishedAt ?? post.createdAt)}
          </span>
        </span>
      </Link>
    </li>
  )
}

/** The article page sidebar: popular posts, tags and recent posts. */
export async function BlogArticleAside({
  popular,
  recent,
  tags,
  locale,
}: {
  popular: BlogPostSummary[]
  recent: BlogPostSummary[]
  tags: BlogSidebarTag[]
  locale: Locale
}) {
  const t = await getTranslations('blog.article.sidebar')

  return (
    <div className="space-y-6">
      {popular.length > 0 ? (
        <section className="rounded-xl border bg-card p-5">
          <AsideHeading>{t('popular')}</AsideHeading>
          <ol className="mt-3 space-y-1">
            {popular.map((post, index) => (
              <PostListItem key={post.id} post={post} locale={locale} index={index} />
            ))}
          </ol>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="rounded-xl border bg-card p-5">
          <AsideHeading>{t('tags')}</AsideHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={blogTagHref(tag.slug)}
                className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                {blogTagText(tag, locale)}
                <span className="ms-1.5 text-muted-foreground/70">{tag.postCount}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="rounded-xl border bg-card p-5">
          <AsideHeading>{t('recent')}</AsideHeading>
          <ul className="mt-3 space-y-1">
            {recent.map((post) => (
              <PostListItem key={post.id} post={post} locale={locale} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
