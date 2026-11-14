import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BlogArticleView } from '@/components/blog/blog-article-view'
import { JsonLd } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { blogAuthorHref, blogPostHref, blogPostText, readingMinutes } from '@/lib/blog'
import {
  getAdjacentBlogPosts,
  getLatestBlogPosts,
  getPopularBlogPosts,
  getPublishedBlogPostBySlug,
  getPublishedBlogTags,
  getRelatedBlogPosts,
} from '@/lib/blog-data'
import { absoluteUrl } from '@/lib/seo'
import { getSiteSettings } from '@/lib/settings'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const getPost = cache(getPublishedBlogPostBySlug)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [post, rawLocale] = await Promise.all([getPost(slug), getLocale()])
  const locale = rawLocale as Locale
  if (!post) return {}
  const text = blogPostText(post, locale)
  const description = text.seoDescription || text.excerpt
  const image = post.ogImage || post.coverImage
  return {
    title: text.seoTitle || text.title,
    description: description || undefined,
    alternates: { canonical: post.canonicalUrl || blogPostHref(post.slug) },
    openGraph: {
      type: 'article',
      title: text.seoTitle || text.title,
      description: description || undefined,
      url: absoluteUrl(blogPostHref(post.slug)),
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author.name] : undefined,
      images: image ? [{ url: absoluteUrl(image) }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: text.seoTitle || text.title,
      description: description || undefined,
      images: image ? [absoluteUrl(image)] : undefined,
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [post, rawLocale, site, t] = await Promise.all([
    getPost(slug),
    getLocale(),
    getSiteSettings(),
    getTranslations('blog'),
  ])
  const locale = rawLocale as Locale
  if (!post) notFound()

  const [related, adjacent, popular, recent, tags] = await Promise.all([
    getRelatedBlogPosts(post),
    getAdjacentBlogPosts(post),
    getPopularBlogPosts(5, post.id),
    getLatestBlogPosts(5, post.id),
    getPublishedBlogTags(),
  ])
  const text = blogPostText(post, locale)
  const image = post.ogImage || post.coverImage
  const pageUrl = absoluteUrl(blogPostHref(post.slug))
  const logo = absoluteUrl(site.logoUrl || site.faviconUrl || '/brand/link-unlocker-mark.svg')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: text.title,
    description: text.seoDescription || text.excerpt || undefined,
    inLanguage: new Intl.Locale(locale).toString(),
    mainEntityOfPage: pageUrl,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    timeRequired: `PT${readingMinutes(text.content)}M`,
    image: image ? [absoluteUrl(image)] : undefined,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          url: absoluteUrl(blogAuthorHref(post.author.id)),
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: absoluteUrl('/'),
      logo: { '@type': 'ImageObject', url: logo },
    },
    articleSection: post.category?.name,
    keywords: post.tags.map((tag) => tag.name),
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('article.home'), item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: t('article.blog'), item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: text.title, item: pageUrl },
    ],
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <BlogArticleView
        post={post}
        related={related}
        adjacent={adjacent}
        popular={popular}
        recent={recent}
        tags={tags}
        locale={locale}
      />
      <SiteFooter />
    </>
  )
}
