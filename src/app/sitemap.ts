import type { MetadataRoute } from 'next'

import { CONTENT_UPDATED_AT } from '@/components/content-page'
import { absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
}
