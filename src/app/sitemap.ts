import type { MetadataRoute } from 'next'

import { CONTENT_UPDATED_AT } from '@/components/content-page'
import { getBlogSitemapEntries } from '@/lib/blog-data'
import { absoluteUrl } from '@/lib/seo'

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl('/'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    url: absoluteUrl('/create'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: absoluteUrl('/faq'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: absoluteUrl('/how-it-works'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  ...['create', 'share', 'unlock'].map((topic) => ({
    url: absoluteUrl(`/how-it-works/${topic}`),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  })),
  {
    url: absoluteUrl('/about'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  ...['story', 'what-we-do', 'values'].map((topic) => ({
    url: absoluteUrl(`/about/${topic}`),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  })),
  {
    url: absoluteUrl('/contact'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    url: absoluteUrl('/privacy'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: absoluteUrl('/terms'),
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
]

/**
 * Static pages plus the published blog. The blog is read from the database, so a
 * failed read (for example during a build without a database) still returns the
 * static pages instead of failing the whole route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const blog = await getBlogSitemapEntries()
    const blogLastModified = new Date(
      [...blog.posts, ...blog.categories, ...blog.tags].reduce(
        (latest, entry) => Math.max(latest, new Date(entry.updatedAt).getTime()),
        CONTENT_UPDATED_AT.getTime(),
      ),
    )
    return [
      ...STATIC_ENTRIES,
      {
        url: absoluteUrl('/blog'),
        lastModified: blogLastModified,
        changeFrequency: 'daily',
        priority: 0.8,
      },
      ...blog.posts.map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
      ...blog.categories.map((category) => ({
        url: absoluteUrl(`/blog/category/${category.slug}`),
        lastModified: new Date(category.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
      ...blog.tags.map((tag) => ({
        url: absoluteUrl(`/blog/tag/${tag.slug}`),
        lastModified: new Date(tag.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      })),
    ]
  } catch {
    return STATIC_ENTRIES
  }
}
