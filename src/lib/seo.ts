import type { Metadata } from 'next'

/** Public origin used in canonical URLs, sitemap entries and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

export function absoluteUrl(path = '/') {
  return new URL(path, `${SITE_URL}/`).toString()
}

/**
 * Content pages are authored in markdown. Structured data needs plain text, so
 * links keep their label and the syntax markers are dropped.
 */
type PageMetadataInput = {
  title: string
  description?: string | null
  path: string
  /** Absolute or site-relative image; omitted when the page has none. */
  image?: string | null
  type?: 'website' | 'article'
  noindex?: boolean
}

/**
 * One page-level metadata block. Static pages and blog archives pass their
 * already-translated title and description here so the document head and the
 * social cards carry the same locale copy instead of the site-wide defaults.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex,
}: PageMetadataInput): Metadata {
  const text = description?.trim() || undefined
  const imageUrl = image?.trim() ? absoluteUrl(image.trim()) : undefined
  return {
    title,
    description: text,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      title,
      description: text,
      url: absoluteUrl(path),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: text,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export function markdownToText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
