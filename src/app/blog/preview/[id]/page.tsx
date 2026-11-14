import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getLocale } from 'next-intl/server'

import { BlogArticleView } from '@/components/blog/blog-article-view'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { blogPostText } from '@/lib/blog'
import {
  getAdjacentBlogPosts,
  getAdminBlogPostById,
  getLatestBlogPosts,
  getPopularBlogPosts,
  getPublishedBlogTags,
  getRelatedBlogPosts,
} from '@/lib/blog-data'
import { requireAdmin } from '@/lib/session'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const getPreviewPost = cache(getAdminBlogPostById)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  await requireAdmin()
  const { id } = await params
  const [post, rawLocale] = await Promise.all([getPreviewPost(id), getLocale()])
  if (!post) return {}
  return {
    title: blogPostText(post, rawLocale as Locale).title,
    robots: { index: false, follow: false },
  }
}

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const [post, rawLocale] = await Promise.all([getPreviewPost(id), getLocale()])
  const [related, adjacent, popular, recent, tags] = post
    ? await Promise.all([
        getRelatedBlogPosts(post),
        getAdjacentBlogPosts(post),
        getPopularBlogPosts(5, post.id),
        getLatestBlogPosts(5, post.id),
        getPublishedBlogTags(),
      ])
    : [[], { previous: null, next: null }, [], [], []]
  if (!post) notFound()

  return (
    <>
      <SiteHeader />
      <BlogArticleView
        post={post}
        related={related}
        adjacent={adjacent}
        popular={popular}
        recent={recent}
        tags={tags}
        locale={rawLocale as Locale}
        preview
      />
      <SiteFooter />
    </>
  )
}
