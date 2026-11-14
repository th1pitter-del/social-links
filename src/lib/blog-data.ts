import 'server-only'

import { locales, type Locale } from '@/i18n/config'
import { type Prisma } from '@/generated/prisma/client'
import {
  BLOG_ADMIN_PAGE_SIZE,
  BLOG_PAGE_SIZE,
  blogCategoryText,
  blogTagText,
  type BlogCategoryData,
  type BlogCategoryTranslations,
  type BlogCoverOption,
  type BlogPostData,
  type BlogPostSummary,
  type BlogPostTranslations,
  type BlogStatusFilter,
  type BlogTagData,
  type BlogTagTranslations,
} from '@/lib/blog'
import { prisma } from '@/lib/prisma'

type PostRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  coverAlt: string | null
  status: string
  featured: boolean
  viewCount: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  translations: unknown
  author: { id: string; name: string } | null
  category: { id: string; name: string; slug: string } | null
  tags: { id: string; name: string; slug: string; translations: unknown }[]
}

type PostDetailRow = PostRow & {
  content: string
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  ogImage: string | null
}

function toPostTranslations(value: unknown): BlogPostTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const translations: BlogPostTranslations = {}
  const fields = ['title', 'excerpt', 'content', 'seoTitle', 'seoDescription'] as const
  for (const locale of locales) {
    const entry = (value as Record<string, unknown>)[locale]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const text: BlogPostTranslations[typeof locale] = {}
    for (const field of fields) {
      const value = (entry as Record<string, unknown>)[field]
      if (typeof value === 'string' && value.trim()) text[field] = value
    }
    if (Object.keys(text).length) translations[locale] = text
  }
  return Object.keys(translations).length ? translations : null
}

function toCategoryTranslations(value: unknown): BlogCategoryTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const translations: BlogCategoryTranslations = {}
  for (const locale of locales) {
    const entry = (value as Record<string, unknown>)[locale]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const fields: BlogCategoryTranslations[typeof locale] = {}
    for (const field of ['name', 'description'] as const) {
      const text = (entry as Record<string, unknown>)[field]
      if (typeof text === 'string' && text.trim()) fields[field] = text
    }
    if (Object.keys(fields).length) translations[locale] = fields
  }
  return Object.keys(translations).length ? translations : null
}

function toTagTranslations(value: unknown): BlogTagTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const translations: BlogTagTranslations = {}
  for (const locale of locales) {
    const text = (value as Record<string, unknown>)[locale]
    if (typeof text === 'string' && text.trim()) translations[locale] = text.trim()
  }
  return Object.keys(translations).length ? translations : null
}

function toSummary(row: PostRow): BlogPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    coverAlt: row.coverAlt,
    status: row.status as 'DRAFT' | 'PUBLISHED',
    featured: row.featured,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: row.author,
    category: row.category,
    tags: row.tags.map((tag) => ({ ...tag, translations: toTagTranslations(tag.translations) })),
    translations: toPostTranslations(row.translations),
  }
}

function toPost(row: PostDetailRow): BlogPostData {
  return {
    ...toSummary(row),
    content: row.content,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrl: row.canonicalUrl,
    ogImage: row.ogImage,
  }
}

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  coverAlt: true,
  status: true,
  featured: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  translations: true,
  author: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { id: true, name: true, slug: true, translations: true }, orderBy: { name: 'asc' } },
} as const

const postSelect = {
  ...summarySelect,
  content: true,
  seoTitle: true,
  seoDescription: true,
  canonicalUrl: true,
  ogImage: true,
} as const

/** Only rows a visitor may see: published and not scheduled for later. */
function publicWhere(now = new Date()) {
  return {
    status: 'PUBLISHED' as const,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  }
}

export type BlogIndexData = {
  featured: BlogPostSummary | null
  posts: BlogPostSummary[]
  total: number
  page: number
  pageCount: number
  categories: BlogCategoryData[]
}

export async function getBlogIndex(page: number): Promise<BlogIndexData> {
  const where = publicWhere()
  const [total, featuredRow, categories] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findFirst({
      where: { ...where, featured: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: summarySelect,
    }),
    getPublishedBlogCategories(),
  ])

  const featured =
    featuredRow ??
    (await prisma.blogPost.findFirst({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: summarySelect,
    }))

  const remaining = Math.max(0, total - (featured ? 1 : 0))
  const pageCount = Math.max(1, Math.ceil(remaining / BLOG_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), pageCount)

  const posts = await prisma.blogPost.findMany({
    where: { ...where, ...(featured ? { id: { not: featured.id } } : {}) },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    skip: (safePage - 1) * BLOG_PAGE_SIZE,
    take: BLOG_PAGE_SIZE,
    select: summarySelect,
  })

  return {
    featured: featured ? toSummary(featured) : null,
    posts: posts.map(toSummary),
    total,
    page: safePage,
    pageCount,
    categories,
  }
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPostData | null> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, ...publicWhere() },
    select: postSelect,
  })
  return row ? toPost(row) : null
}

/** Newest public articles, for the homepage strip and the article sidebar. */
export async function getLatestBlogPosts(take = 3, excludeId?: string): Promise<BlogPostSummary[]> {
  const rows = await prisma.blogPost.findMany({
    where: { ...publicWhere(), ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take,
    select: summarySelect,
  })
  return rows.map(toSummary)
}

/** Most-viewed public articles, for the article sidebar. */
export async function getPopularBlogPosts(
  take = 5,
  excludeId?: string,
): Promise<BlogPostSummary[]> {
  const rows = await prisma.blogPost.findMany({
    where: { ...publicWhere(), ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take,
    select: summarySelect,
  })
  return rows.map(toSummary)
}

export type BlogSidebarTag = {
  id: string
  name: string
  slug: string
  postCount: number
  translations: BlogTagTranslations | null
}

/** Tags attached to at least one public article, most used first. */
export async function getPublishedBlogTags(take = 12): Promise<BlogSidebarTag[]> {
  const where = publicWhere()
  const rows = await prisma.blogTag.findMany({
    where: { posts: { some: where } },
    orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      translations: true,
      _count: { select: { posts: { where } } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    postCount: row._count.posts,
    translations: toTagTranslations(row.translations),
  }))
}

export async function getPublishedBlogCategories(): Promise<BlogCategoryData[]> {
  const where = publicWhere()
  const rows = await prisma.blogCategory.findMany({
    where: { posts: { some: where } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      translations: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { posts: { where } } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    translations: toCategoryTranslations(row.translations),
    postCount: row._count.posts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export type BlogArchiveKind = 'category' | 'tag' | 'author' | 'search'

export type BlogArchiveResult =
  | {
      ok: true
      kind: BlogArchiveKind
      posts: BlogPostSummary[]
      total: number
      page: number
      pageCount: number
      title: string
      description: string
      query: string
    }
  | { ok: false }

export async function getBlogArchive(input: {
  kind: BlogArchiveKind
  slug: string
  page: number
  query?: string
  locale: Locale
}): Promise<BlogArchiveResult> {
  const base = publicWhere()
  let where: Prisma.BlogPostWhereInput = base
  let title = ''
  let description = ''
  let query = ''

  if (input.kind === 'category') {
    const category = await prisma.blogCategory.findUnique({
      where: { slug: input.slug },
      select: { name: true, description: true, translations: true },
    })
    if (!category) return { ok: false }
    where = { ...base, category: { slug: input.slug } }
    const text = blogCategoryText(
      { ...category, translations: toCategoryTranslations(category.translations) },
      input.locale,
    )
    title = text.name
    description = text.description
  } else if (input.kind === 'tag') {
    const tag = await prisma.blogTag.findUnique({
      where: { slug: input.slug },
      select: { name: true, translations: true },
    })
    if (!tag) return { ok: false }
    where = { ...base, tags: { some: { slug: input.slug } } }
    title = blogTagText(
      { ...tag, translations: toTagTranslations(tag.translations) },
      input.locale,
    )
  } else if (input.kind === 'author') {
    const author = await prisma.user.findUnique({
      where: { id: input.slug },
      select: { name: true },
    })
    if (!author) return { ok: false }
    where = { ...base, authorId: input.slug }
    title = author.name
  } else {
    query = (input.query ?? '').trim().slice(0, 100)
    title = query
    where = query
      ? {
          AND: [
            base,
            {
              OR: [
                { title: { contains: query } },
                { excerpt: { contains: query } },
                { tags: { some: { name: { contains: query } } } },
              ],
            },
          ],
        }
      : base
  }

  const total = await prisma.blogPost.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, input.page), pageCount)
  const rows = await prisma.blogPost.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    skip: (safePage - 1) * BLOG_PAGE_SIZE,
    take: BLOG_PAGE_SIZE,
    select: summarySelect,
  })

  return {
    ok: true,
    kind: input.kind,
    posts: rows.map(toSummary),
    total,
    page: safePage,
    pageCount,
    title,
    description,
    query,
  }
}

export async function getRelatedBlogPosts(post: BlogPostData, take = 3) {
  const where = publicWhere()
  const sameCategory = post.category
    ? await prisma.blogPost.findMany({
        where: { ...where, id: { not: post.id }, categoryId: post.category.id },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take,
        select: summarySelect,
      })
    : []
  if (sameCategory.length >= take) return sameCategory.map(toSummary)

  const excluded = [post.id, ...sameCategory.map((row) => row.id)]
  const fill = await prisma.blogPost.findMany({
    where: { ...where, id: { notIn: excluded } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: take - sameCategory.length,
    select: summarySelect,
  })
  return [...sameCategory, ...fill].map(toSummary)
}

export async function getAdjacentBlogPosts(post: BlogPostData) {
  if (!post.publishedAt) return { previous: null, next: null }
  const where = publicWhere()
  const publishedAt = new Date(post.publishedAt)
  const [older, newer] = await Promise.all([
    prisma.blogPost.findFirst({
      where: { ...where, id: { not: post.id }, publishedAt: { lt: publishedAt } },
      orderBy: { publishedAt: 'desc' },
      select: summarySelect,
    }),
    prisma.blogPost.findFirst({
      where: { ...where, id: { not: post.id }, publishedAt: { gt: publishedAt } },
      orderBy: { publishedAt: 'asc' },
      select: summarySelect,
    }),
  ])
  return {
    previous: older ? toSummary(older) : null,
    next: newer ? toSummary(newer) : null,
  }
}

export type AdminBlogSummary = {
  total: number
  published: number
  draft: number
  scheduled: number
  views: number
  popular: BlogPostSummary[]
  recent: BlogPostSummary[]
}

export async function getAdminBlogSummary(): Promise<AdminBlogSummary> {
  const now = new Date()
  const [total, published, draft, scheduled, views, popular, recent] = await Promise.all([
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: publicWhere(now) }),
    prisma.blogPost.count({ where: { status: 'DRAFT' } }),
    prisma.blogPost.count({
      where: { status: 'PUBLISHED', publishedAt: { gt: now } },
    }),
    prisma.blogPost.aggregate({ _sum: { viewCount: true } }),
    prisma.blogPost.findMany({
      where: publicWhere(now),
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
      select: summarySelect,
    }),
    prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: summarySelect,
    }),
  ])

  return {
    total,
    published,
    draft,
    scheduled,
    views: views._sum.viewCount ?? 0,
    popular: popular.map(toSummary),
    recent: recent.map(toSummary),
  }
}

export type AdminBlogListData = {
  posts: BlogPostSummary[]
  total: number
  page: number
  pageCount: number
  counts: { all: number; published: number; draft: number; scheduled: number }
}

export type AdminBlogSort = 'updated' | 'published' | 'title' | 'views'

export async function getAdminBlogPosts(input: {
  query: string
  status: BlogStatusFilter
  categoryId: string
  page: number
  sort: AdminBlogSort
}): Promise<AdminBlogListData> {
  const now = new Date()
  // AND keeps the publication window intact when a search also adds an OR.
  const conditions: Prisma.BlogPostWhereInput[] = []
  if (input.status === 'draft') conditions.push({ status: 'DRAFT' })
  if (input.status === 'published') conditions.push(publicWhere(now))
  if (input.status === 'scheduled') {
    conditions.push({ status: 'PUBLISHED', publishedAt: { gt: now } })
  }
  if (input.query) {
    conditions.push({
      OR: [{ title: { contains: input.query } }, { slug: { contains: input.query } }],
    })
  }
  if (input.categoryId) conditions.push({ categoryId: input.categoryId })
  const where: Prisma.BlogPostWhereInput = conditions.length ? { AND: conditions } : {}

  const orderBy: Prisma.BlogPostOrderByWithRelationInput =
    input.sort === 'title'
      ? { title: 'asc' }
      : input.sort === 'views'
        ? { viewCount: 'desc' }
        : input.sort === 'published'
          ? { publishedAt: 'desc' }
          : { updatedAt: 'desc' }

  const [rows, total, all, published, draft, scheduled] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * BLOG_ADMIN_PAGE_SIZE,
      take: BLOG_ADMIN_PAGE_SIZE,
      select: summarySelect,
    }),
    prisma.blogPost.count({ where }),
    prisma.blogPost.count(),
    prisma.blogPost.count({ where: publicWhere(now) }),
    prisma.blogPost.count({ where: { status: 'DRAFT' } }),
    prisma.blogPost.count({ where: { status: 'PUBLISHED', publishedAt: { gt: now } } }),
  ])

  const pageCount = Math.max(1, Math.ceil(total / BLOG_ADMIN_PAGE_SIZE))
  const page = Math.min(Math.max(1, input.page), pageCount)

  return {
    posts: rows.map(toSummary),
    total,
    page,
    pageCount,
    counts: { all, published, draft, scheduled },
  }
}

export async function getAdminBlogPostById(id: string): Promise<BlogPostData | null> {
  const row = await prisma.blogPost.findUnique({ where: { id }, select: postSelect })
  return row ? toPost(row) : null
}

export async function getAdminBlogCategories(): Promise<BlogCategoryData[]> {
  const rows = await prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      translations: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { posts: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    translations: toCategoryTranslations(row.translations),
    postCount: row._count.posts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function getAdminBlogTags(): Promise<BlogTagData[]> {
  const rows = await prisma.blogTag.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      translations: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { posts: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    translations: toTagTranslations(row.translations),
    postCount: row._count.posts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

/** Admins are the only authors the editor offers; regular users cannot post. */
export async function getBlogAuthorOptions() {
  return prisma.user.findMany({
    where: { role: 'ADMIN', banned: false },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

export async function getBlogCategoryOptions() {
  return prisma.blogCategory.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

/** The admin media library, images only, for the editor's "choose from library" dialog. */
export async function getBlogCoverLibrary(take = 60): Promise<BlogCoverOption[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: { mimeType: { startsWith: 'image/' } },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, filename: true },
  })
  return rows.map((row) => ({
    id: row.id,
    url: `/api/media/${row.id}`,
    filename: row.filename,
  }))
}

/** Public URLs and their real last-modified dates, for the sitemap. */
export async function getBlogSitemapEntries(): Promise<{
  posts: { slug: string; updatedAt: string }[]
  categories: { slug: string; updatedAt: string }[]
  tags: { slug: string; updatedAt: string }[]
}> {
  const where = publicWhere()
  const [posts, categories, tags] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogCategory.findMany({
      where: { posts: { some: where } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogTag.findMany({
      where: { posts: { some: where } },
      select: { slug: true, updatedAt: true },
    }),
  ])
  return {
    posts: posts.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() })),
    categories: categories.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() })),
    tags: tags.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() })),
  }
}
