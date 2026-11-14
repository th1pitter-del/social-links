// Shared (client-safe) blog constants, types and locale helpers. Database
// access lives in `blog-data.ts`; HTML sanitizing in `rich-text.ts`.

import type { Locale } from '@/i18n/config'

export const BLOG_PAGE_SIZE = 8
export const BLOG_ADMIN_PAGE_SIZE = 20
export const BLOG_TITLE_MAX_LENGTH = 160
export const BLOG_EXCERPT_MAX_LENGTH = 480
export const BLOG_CONTENT_MAX_LENGTH = 200_000
export const BLOG_SEO_TITLE_MAX_LENGTH = 120
export const BLOG_SEO_DESCRIPTION_MAX_LENGTH = 320
export const BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH = 400
export const BLOG_TERM_NAME_MAX_LENGTH = 60
export const BLOG_TAGS_MAX = 8

/** Same shape as page slugs; long enough for a descriptive article URL. */
export const BLOG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$/

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED'
/** Names the admin list shows: a future publishedAt reads as scheduled. */
export type BlogEffectiveStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED'

export type BlogPostLocaleText = {
  title?: string
  excerpt?: string
  content?: string
  seoTitle?: string
  seoDescription?: string
}

export type BlogPostTranslations = Partial<Record<Locale, BlogPostLocaleText>>

export type BlogCategoryLocaleText = {
  name?: string
  description?: string
}

export type BlogCategoryTranslations = Partial<Record<Locale, BlogCategoryLocaleText>>

export type BlogTagTranslations = Partial<Record<Locale, string>>

export type BlogAuthorRef = { id: string; name: string }
export type BlogTermRef = { id: string; name: string; slug: string }
/** Tag refs carry their translations so chips can render the visitor's locale. */
export type BlogTagRef = BlogTermRef & { translations: BlogTagTranslations | null }

/** One image offered by the media library picker in the editor. */
export type BlogCoverOption = { id: string; url: string; filename: string }

export type BlogPostSummary = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  coverAlt: string | null
  status: BlogPostStatus
  featured: boolean
  viewCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: BlogAuthorRef | null
  category: BlogTermRef | null
  tags: BlogTagRef[]
  translations: BlogPostTranslations | null
}

export type BlogPostData = BlogPostSummary & {
  content: string
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  ogImage: string | null
}

export type BlogPostInput = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  coverAlt: string
  status: BlogPostStatus
  featured: boolean
  /** ISO date-time; required when scheduling or publishing. */
  publishedAt: string | null
  translations: BlogPostTranslations
  seoTitle: string
  seoDescription: string
  canonicalUrl: string
  ogImage: string
  authorId: string
  categoryId: string
  tagNames: string[]
}

export type BlogCategoryData = {
  id: string
  name: string
  slug: string
  description: string | null
  translations: BlogCategoryTranslations | null
  postCount: number
  createdAt: string
  updatedAt: string
}

export type BlogTagData = {  id: string
  name: string
  slug: string
  translations: BlogTagTranslations | null
  postCount: number
  createdAt: string
  updatedAt: string
}

export type BlogCategoryInput = {
  name: string
  slug: string
  description: string
  translations: BlogCategoryTranslations
}

export type BlogTagInput = {
  name: string
  slug: string
  translations: BlogTagTranslations
}

export type BlogStatusFilter = 'all' | 'published' | 'draft' | 'scheduled'

export function effectiveBlogPostStatus(
  post: Pick<BlogPostSummary, 'status' | 'publishedAt'>,
  now = new Date(),
): BlogEffectiveStatus {
  if (post.status === 'DRAFT') return 'DRAFT'
  if (post.publishedAt && new Date(post.publishedAt).getTime() > now.getTime()) {
    return 'SCHEDULED'
  }
  return 'PUBLISHED'
}

/** Locale-correct article copy, falling back to the English columns. */
export function blogPostText(
  post: {
    title: string
    excerpt: string | null
    content?: string
    seoTitle?: string | null
    seoDescription?: string | null
    translations?: BlogPostTranslations | null
  },
  locale: Locale,
) {
  const override = post.translations?.[locale]
  return {
    title: override?.title?.trim() || post.title,
    excerpt: override?.excerpt?.trim() || post.excerpt || '',
    content: override?.content?.trim() || post.content || '',
    seoTitle: override?.seoTitle?.trim() || post.seoTitle?.trim() || '',
    seoDescription: override?.seoDescription?.trim() || post.seoDescription?.trim() || '',
  }
}

export function blogCategoryText(
  category: {
    name: string
    description: string | null
    translations?: BlogCategoryTranslations | null
  },
  locale: Locale,
) {
  const override = category.translations?.[locale]
  return {
    name: override?.name?.trim() || category.name,
    description: override?.description?.trim() || category.description || '',
  }
}

export function blogTagText(
  tag: { name: string; translations?: BlogTagTranslations | null },
  locale: Locale,
) {
  return tag.translations?.[locale]?.trim() || tag.name
}

export function blogPostHref(slug: string) {
  return `/blog/${slug}`
}

export function blogCategoryHref(slug: string) {
  return `/blog/category/${slug}`
}

export function blogTagHref(slug: string) {
  return `/blog/tag/${slug}`
}

export function blogAuthorHref(id: string) {
  return `/blog/author/${id}`
}

export function blogSearchHref(query: string) {
  return `/blog/search?q=${encodeURIComponent(query)}`
}

/** `?page=` as a positive integer; anything else reads as the first page. */
export function parseBlogPage(value?: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/** Words in the reader's language, counted the same way as content pages. */
export function readingMinutes(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim()
  const words = text ? text.split(/\s+/).length : 0
  return Math.max(1, Math.ceil(words / 200))
}

export function slugifyBlogTerm(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
  if (!base) return 'item'
  return base.length === 2 ? `tag-${base}` : base
}

/** Comma or newline separated tag typing, deduped case-insensitively. */
export function splitBlogTags(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of value.split(/[,\n]/)) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(name.slice(0, BLOG_TERM_NAME_MAX_LENGTH))
    if (tags.length >= BLOG_TAGS_MAX) break
  }
  return tags
}
