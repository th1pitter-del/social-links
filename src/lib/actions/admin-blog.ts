'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { Prisma } from '@/generated/prisma/client'
import { locales } from '@/i18n/config'
import { writeAudit } from '@/lib/admin-utils'
import {
  BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH,
  BLOG_CONTENT_MAX_LENGTH,
  BLOG_EXCERPT_MAX_LENGTH,
  BLOG_SEO_DESCRIPTION_MAX_LENGTH,
  BLOG_SEO_TITLE_MAX_LENGTH,
  BLOG_SLUG_PATTERN,
  BLOG_TERM_NAME_MAX_LENGTH,
  BLOG_TAGS_MAX,
  BLOG_TITLE_MAX_LENGTH,
  slugifyBlogTerm,
  splitBlogTags,
  type BlogCategoryData,
  type BlogCategoryInput,
  type BlogCategoryTranslations,
  type BlogPostData,
  type BlogPostInput,
  type BlogPostTranslations,
  type BlogTagData,
  type BlogTagInput,
  type BlogTagTranslations,
} from '@/lib/blog'
import { getAdminBlogPostById } from '@/lib/blog-data'
import { prisma } from '@/lib/prisma'
import { sanitizeRichText } from '@/lib/rich-text'
import { requireAdmin } from '@/lib/session'

export type BlogPostResult =
  | { ok: true; post: BlogPostData }
  | { ok: false; error: string }
export type BlogCategoryResult =
  | { ok: true; category: BlogCategoryData }
  | { ok: false; error: string }
export type BlogTagResult = { ok: true; tag: BlogTagData } | { ok: false; error: string }
export type BlogActionResult = { ok: true } | { ok: false; error: string }

function revalidateBlogSurfaces() {
  revalidatePath('/blog', 'layout')
  revalidatePath('/admin/blog', 'layout')
  revalidatePath('/admin')
  revalidatePath('/sitemap.xml')
}

function isSafeImage(value: string): boolean {
  return /^https?:\/\//.test(value) || /^\/api\/media\/[A-Za-z0-9_-]+$/.test(value)
}

function isSafeCanonical(value: string): boolean {
  if (/^https?:\/\/[^\s]+$/i.test(value)) return true
  if (value.startsWith('//')) return false
  return /^\/[A-Za-z0-9?#&=/_.-]*$/.test(value)
}

function slugifyTitle(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 79)
  if (!base) return 'article'
  return base.length === 2 ? `article-${base}` : base
}

async function uniquePostSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let suffix = 2
  for (;;) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

type ValidatedPost = {
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  coverAlt: string | null
  status: 'DRAFT' | 'PUBLISHED'
  featured: boolean
  publishedAt: Date | null
  translations: BlogPostTranslations | null
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  ogImage: string | null
  authorId: string
  categoryId: string | null
  tagNames: string[]
}

async function validatePost(
  input: BlogPostInput,
  existing: { id: string; publishedAt: Date | null } | null,
): Promise<{ ok: true; data: ValidatedPost } | { ok: false; error: string }> {
  const t = await getTranslations('errors')

  const title = input.title?.trim() ?? ''
  if (!title) return { ok: false, error: t('blogTitleRequired') }
  if (title.length > BLOG_TITLE_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_TITLE_MAX_LENGTH }) }
  }

  const excerpt = input.excerpt?.trim() ?? ''
  if (excerpt.length > BLOG_EXCERPT_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_EXCERPT_MAX_LENGTH }) }
  }

  const rawContent = input.content ?? ''
  if (rawContent.length > BLOG_CONTENT_MAX_LENGTH) {
    return { ok: false, error: t('contentTooLong', { max: BLOG_CONTENT_MAX_LENGTH }) }
  }
  const content = sanitizeRichText(rawContent)

  let slug = (input.slug ?? '').trim().toLowerCase()
  if (!slug) slug = slugifyTitle(title)
  if (!BLOG_SLUG_PATTERN.test(slug)) return { ok: false, error: t('invalidSlug') }
  const slugOwner = await prisma.blogPost.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (slugOwner && slugOwner.id !== existing?.id) {
    return { ok: false, error: t('slugTaken') }
  }

  const coverImage = input.coverImage?.trim() ?? ''
  if (coverImage && !isSafeImage(coverImage)) {
    return { ok: false, error: t('invalidCoverImage') }
  }
  const coverAlt = (input.coverAlt ?? '').trim().slice(0, 200) || null

  const seoTitle = (input.seoTitle ?? '').trim()
  if (seoTitle.length > BLOG_SEO_TITLE_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_SEO_TITLE_MAX_LENGTH }) }
  }
  const seoDescription = (input.seoDescription ?? '').trim()
  if (seoDescription.length > BLOG_SEO_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_SEO_DESCRIPTION_MAX_LENGTH }) }
  }
  const canonicalUrl = (input.canonicalUrl ?? '').trim()
  if (canonicalUrl && !isSafeCanonical(canonicalUrl)) {
    return { ok: false, error: t('blogCanonicalInvalid') }
  }
  const ogImage = (input.ogImage ?? '').trim()
  if (ogImage && !isSafeImage(ogImage)) {
    return { ok: false, error: t('invalidCoverImage') }
  }

  const authorId = (input.authorId ?? '').trim()
  if (!authorId) return { ok: false, error: t('blogAuthorRequired') }
  const author = await prisma.user.findFirst({
    where: { id: authorId, role: 'ADMIN', banned: false },
    select: { id: true },
  })
  if (!author) return { ok: false, error: t('blogAuthorRequired') }

  const categoryIdInput = (input.categoryId ?? '').trim()
  let categoryId: string | null = null
  if (categoryIdInput) {
    const category = await prisma.blogCategory.findUnique({
      where: { id: categoryIdInput },
      select: { id: true },
    })
    if (!category) return { ok: false, error: t('blogCategoryNotFound') }
    categoryId = category.id
  }

  const status = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  let publishedAt: Date | null = null
  if (status === 'PUBLISHED') {
    const raw = input.publishedAt?.trim() ?? ''
    if (raw) {
      const parsed = new Date(raw)
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: t('blogPublishDateInvalid') }
      }
      publishedAt = parsed
    } else {
      publishedAt = existing?.publishedAt ?? new Date()
    }
  }

  const translations: BlogPostTranslations = {}
  for (const locale of locales) {
    if (locale === 'en') continue
    const entry = input.translations?.[locale]
    if (!entry) continue
    const localizedTitle = entry.title?.trim() ?? ''
    const localizedExcerpt = entry.excerpt?.trim() ?? ''
    const rawLocaleContent = entry.content ?? ''
    const localizedSeoTitle = entry.seoTitle?.trim() ?? ''
    const localizedSeoDescription = entry.seoDescription?.trim() ?? ''
    if (localizedTitle.length > BLOG_TITLE_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: BLOG_TITLE_MAX_LENGTH }) }
    }
    if (localizedExcerpt.length > BLOG_EXCERPT_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: BLOG_EXCERPT_MAX_LENGTH }) }
    }
    if (rawLocaleContent.length > BLOG_CONTENT_MAX_LENGTH) {
      return { ok: false, error: t('contentTooLong', { max: BLOG_CONTENT_MAX_LENGTH }) }
    }
    if (localizedSeoTitle.length > BLOG_SEO_TITLE_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: BLOG_SEO_TITLE_MAX_LENGTH }) }
    }
    if (localizedSeoDescription.length > BLOG_SEO_DESCRIPTION_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: BLOG_SEO_DESCRIPTION_MAX_LENGTH }) }
    }
    const fields: BlogPostTranslations[typeof locale] = {}
    if (localizedTitle) fields.title = localizedTitle
    if (localizedExcerpt) fields.excerpt = localizedExcerpt
    if (rawLocaleContent.trim()) fields.content = sanitizeRichText(rawLocaleContent)
    if (localizedSeoTitle) fields.seoTitle = localizedSeoTitle
    if (localizedSeoDescription) fields.seoDescription = localizedSeoDescription
    if (Object.keys(fields).length) translations[locale] = fields
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      coverAlt,
      status,
      featured: Boolean(input.featured),
      publishedAt,
      translations: Object.keys(translations).length ? translations : null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      canonicalUrl: canonicalUrl || null,
      ogImage: ogImage || null,
      authorId,
      categoryId,
      tagNames: splitBlogTags(input.tagNames?.join(', ') ?? '').slice(0, BLOG_TAGS_MAX),
    },
  }
}

/** Resolve typed tag names to rows, creating missing tags on the fly. */
async function resolveTagIds(names: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const name of names) {
    const base = slugifyBlogTerm(name)
    let candidate = base
    let suffix = 2
    for (;;) {
      const existing = await prisma.blogTag.findUnique({
        where: { slug: candidate },
        select: { id: true, name: true },
      })
      if (!existing) {
        const created = await prisma.blogTag.create({
          data: { name, slug: candidate },
          select: { id: true },
        })
        ids.push(created.id)
        break
      }
      if (existing.name.trim().toLowerCase() === name.trim().toLowerCase()) {
        ids.push(existing.id)
        break
      }
      candidate = `${base}-${suffix}`
      suffix += 1
    }
  }
  return ids
}

function auditStatus(status: 'DRAFT' | 'PUBLISHED', publishedAt: Date | null) {
  if (status === 'DRAFT') return 'blogPost.unpublish'
  if (publishedAt && publishedAt.getTime() > Date.now()) return 'blogPost.schedule'
  return 'blogPost.publish'
}

export async function createBlogPost(input: BlogPostInput): Promise<BlogPostResult> {
  await requireAdmin()
  const validated = await validatePost(input, null)
  if (!validated.ok) return { ok: false, error: validated.error }
  const t = await getTranslations('errors')

  const tagIds = await resolveTagIds(validated.data.tagNames)
  const row = await prisma.blogPost.create({
    data: {
      title: validated.data.title,
      slug: await uniquePostSlug(validated.data.slug),
      excerpt: validated.data.excerpt,
      content: validated.data.content,
      coverImage: validated.data.coverImage,
      coverAlt: validated.data.coverAlt,
      status: validated.data.status,
      featured: validated.data.featured,
      publishedAt: validated.data.publishedAt,
      translations: validated.data.translations ?? Prisma.DbNull,
      seoTitle: validated.data.seoTitle,
      seoDescription: validated.data.seoDescription,
      canonicalUrl: validated.data.canonicalUrl,
      ogImage: validated.data.ogImage,
      authorId: validated.data.authorId,
      categoryId: validated.data.categoryId,
      tags: { connect: tagIds.map((id) => ({ id })) },
    },
    select: { id: true, title: true, slug: true },
  })

  await writeAudit({
    action: 'blogPost.create',
    targetType: 'blogPost',
    targetId: row.id,
    details: JSON.stringify({ title: row.title, slug: row.slug }),
  })
  revalidateBlogSurfaces()
  const post = await getAdminBlogPostById(row.id)
  return post ? { ok: true, post } : { ok: false, error: t('blogPostNotFound') }
}

export async function updateBlogPost(id: string, input: BlogPostInput): Promise<BlogPostResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  })
  if (!existing) return { ok: false, error: t('blogPostNotFound') }

  const validated = await validatePost(input, existing)
  if (!validated.ok) return { ok: false, error: validated.error }

  const tagIds = await resolveTagIds(validated.data.tagNames)
  await prisma.blogPost.update({
    where: { id },
    data: {
      title: validated.data.title,
      slug: await uniquePostSlug(validated.data.slug, id),
      excerpt: validated.data.excerpt,
      content: validated.data.content,
      coverImage: validated.data.coverImage,
      coverAlt: validated.data.coverAlt,
      status: validated.data.status,
      featured: validated.data.featured,
      publishedAt: validated.data.publishedAt,
      translations: validated.data.translations ?? Prisma.DbNull,
      seoTitle: validated.data.seoTitle,
      seoDescription: validated.data.seoDescription,
      canonicalUrl: validated.data.canonicalUrl,
      ogImage: validated.data.ogImage,
      authorId: validated.data.authorId,
      categoryId: validated.data.categoryId,
      tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
    },
  })

  const statusChanged =
    existing.status !== validated.data.status ||
    (existing.publishedAt?.getTime() ?? null) !== (validated.data.publishedAt?.getTime() ?? null)
  await writeAudit({
    action: statusChanged
      ? auditStatus(validated.data.status, validated.data.publishedAt)
      : 'blogPost.update',
    targetType: 'blogPost',
    targetId: id,
    details: JSON.stringify({
      title: validated.data.title,
      slug: validated.data.slug,
    }),
  })
  revalidateBlogSurfaces()
  const post = await getAdminBlogPostById(id)
  return post ? { ok: true, post } : { ok: false, error: t('blogPostNotFound') }
}

/**
 * Draft-only autosave. A published article changes only when the editor saves
 * explicitly, so an open tab cannot quietly edit the public page.
 */
export async function autosaveBlogPost(
  id: string,
  input: BlogPostInput,
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  })
  if (!existing) return { ok: false, error: t('blogPostNotFound') }
  if (existing.status !== 'DRAFT') return { ok: false, error: t('blogAutosaveDraftOnly') }

  const validated = await validatePost(
    { ...input, status: 'DRAFT', publishedAt: null },
    existing,
  )
  if (!validated.ok) return { ok: false, error: validated.error }

  const tagIds = await resolveTagIds(validated.data.tagNames)
  await prisma.blogPost.update({
    where: { id },
    data: {
      title: validated.data.title,
      slug: await uniquePostSlug(validated.data.slug, id),
      excerpt: validated.data.excerpt,
      content: validated.data.content,
      coverImage: validated.data.coverImage,
      coverAlt: validated.data.coverAlt,
      featured: validated.data.featured,
      translations: validated.data.translations ?? Prisma.DbNull,
      seoTitle: validated.data.seoTitle,
      seoDescription: validated.data.seoDescription,
      canonicalUrl: validated.data.canonicalUrl,
      ogImage: validated.data.ogImage,
      authorId: validated.data.authorId,
      categoryId: validated.data.categoryId,
      tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
    },
  })
  revalidatePath('/admin/blog', 'layout')
  return { ok: true, savedAt: new Date().toISOString() }
}

export async function setBlogPostStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED',
): Promise<BlogActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true, title: true },
  })
  if (!existing) return { ok: false, error: t('blogPostNotFound') }

  const publishedAt =
    status === 'PUBLISHED'
      ? existing.publishedAt && existing.publishedAt.getTime() > Date.now()
        ? existing.publishedAt
        : new Date()
      : null

  await prisma.blogPost.update({
    where: { id },
    data: { status, publishedAt },
  })
  await writeAudit({
    action: status === 'PUBLISHED' ? 'blogPost.publish' : 'blogPost.unpublish',
    targetType: 'blogPost',
    targetId: id,
    details: JSON.stringify({ title: existing.title }),
  })
  revalidateBlogSurfaces()
  return { ok: true }
}

export async function deleteBlogPost(id: string): Promise<BlogActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, title: true },
  })
  if (!existing) return { ok: false, error: t('blogPostNotFound') }

  await prisma.blogPost.delete({ where: { id } })
  await writeAudit({
    action: 'blogPost.delete',
    targetType: 'blogPost',
    targetId: id,
    details: JSON.stringify({ title: existing.title }),
  })
  revalidateBlogSurfaces()
  return { ok: true }
}

async function uniqueTermSlug(
  model: 'category' | 'tag',
  base: string,
  excludeId?: string,
): Promise<string> {
  let candidate = base
  let suffix = 2
  for (;;) {
    const existing =
      model === 'category'
        ? await prisma.blogCategory.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.blogTag.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing || existing.id === excludeId) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function validateTerm(
  input: { name: string; slug: string },
  existingId?: string,
  kind: 'category' | 'tag' = 'category',
): Promise<{ ok: true; name: string; slug: string } | { ok: false; error: string }> {
  const t = await getTranslations('errors')
  const name = input.name?.trim().replace(/\s+/g, ' ') ?? ''
  if (!name) return { ok: false, error: t('nameRequired') }
  if (name.length > BLOG_TERM_NAME_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_TERM_NAME_MAX_LENGTH }) }
  }
  let slug = (input.slug ?? '').trim().toLowerCase()
  if (!slug) slug = slugifyBlogTerm(name)
  if (!BLOG_SLUG_PATTERN.test(slug)) return { ok: false, error: t('invalidSlug') }
  const owner =
    kind === 'category'
      ? await prisma.blogCategory.findUnique({ where: { slug }, select: { id: true } })
      : await prisma.blogTag.findUnique({ where: { slug }, select: { id: true } })
  if (owner && owner.id !== existingId) {
    return { ok: false, error: t('slugTaken') }
  }
  return { ok: true, name, slug }
}

function serializeCategory(row: {
  id: string
  name: string
  slug: string
  description: string | null
  translations: unknown
  createdAt: Date
  updatedAt: Date
  _count: { posts: number }
}): BlogCategoryData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    translations: (row.translations as BlogCategoryTranslations | null) ?? null,
    postCount: row._count.posts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  translations: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { posts: true } },
} as const

export async function createBlogCategory(input: BlogCategoryInput): Promise<BlogCategoryResult> {
  await requireAdmin()
  const validated = await validateTerm(input, undefined, 'category')
  if (!validated.ok) return { ok: false, error: validated.error }
  const t = await getTranslations('errors')

  const description = (input.description ?? '').trim()
  if (description.length > BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH }) }
  }
  const translations = normalizeCategoryTranslations(input.translations)
  if (!translations.ok) {
    return {
      ok: false,
      error:
        translations.field === 'name'
          ? t('tooLong', { max: BLOG_TERM_NAME_MAX_LENGTH })
          : t('tooLong', { max: BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH }),
    }
  }

  const row = await prisma.blogCategory.create({
    data: {
      name: validated.name,
      slug: await uniqueTermSlug('category', validated.slug),
      description: description || null,
      translations:
        Object.keys(translations.data).length > 0 ? translations.data : Prisma.DbNull,
    },
    select: categorySelect,
  })
  await writeAudit({
    action: 'blogCategory.create',
    targetType: 'blogCategory',
    targetId: row.id,
    details: JSON.stringify({ name: row.name }),
  })
  revalidateBlogSurfaces()
  return { ok: true, category: serializeCategory(row) }
}

export async function updateBlogCategory(
  id: string,
  input: BlogCategoryInput,
): Promise<BlogCategoryResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogCategory.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('blogCategoryNotFound') }

  const validated = await validateTerm(input, id, 'category')
  if (!validated.ok) return { ok: false, error: validated.error }

  const description = (input.description ?? '').trim()
  if (description.length > BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH }) }
  }
  const translations = normalizeCategoryTranslations(input.translations)
  if (!translations.ok) {
    return {
      ok: false,
      error:
        translations.field === 'name'
          ? t('tooLong', { max: BLOG_TERM_NAME_MAX_LENGTH })
          : t('tooLong', { max: BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH }),
    }
  }

  const row = await prisma.blogCategory.update({
    where: { id },
    data: {
      name: validated.name,
      slug: await uniqueTermSlug('category', validated.slug, id),
      description: description || null,
      translations:
        Object.keys(translations.data).length > 0 ? translations.data : Prisma.DbNull,
    },
    select: categorySelect,
  })
  await writeAudit({
    action: 'blogCategory.update',
    targetType: 'blogCategory',
    targetId: id,
    details: JSON.stringify({ name: row.name }),
  })
  revalidateBlogSurfaces()
  return { ok: true, category: serializeCategory(row) }
}

export async function deleteBlogCategory(id: string): Promise<BlogActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogCategory.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { posts: true } } },
  })
  if (!existing) return { ok: false, error: t('blogCategoryNotFound') }

  // The FK nulls the category on its articles; nothing else is deleted.
  await prisma.blogCategory.delete({ where: { id } })
  await writeAudit({
    action: 'blogCategory.delete',
    targetType: 'blogCategory',
    targetId: id,
    details: JSON.stringify({ name: existing.name, posts: existing._count.posts }),
  })
  revalidateBlogSurfaces()
  return { ok: true }
}

function normalizeCategoryTranslations(
  input: BlogCategoryTranslations | undefined,
):
  | { ok: true; data: BlogCategoryTranslations }
  | { ok: false; field: 'name' | 'description' } {
  const translations: BlogCategoryTranslations = {}
  for (const locale of locales) {
    if (locale === 'en') continue
    const entry = input?.[locale]
    if (!entry) continue
    const name = entry.name?.trim() ?? ''
    const description = entry.description?.trim() ?? ''
    if (name.length > BLOG_TERM_NAME_MAX_LENGTH) return { ok: false, field: 'name' }
    if (description.length > BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH) {
      return { ok: false, field: 'description' }
    }
    const fields: BlogCategoryTranslations[typeof locale] = {}
    if (name) fields.name = name
    if (description) fields.description = description
    if (Object.keys(fields).length) translations[locale] = fields
  }
  return { ok: true, data: translations }
}

const tagSelect = {
  id: true,
  name: true,
  slug: true,
  translations: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { posts: true } },
} as const

function serializeTag(row: {
  id: string
  name: string
  slug: string
  translations: unknown
  createdAt: Date
  updatedAt: Date
  _count: { posts: number }
}): BlogTagData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    translations: (row.translations as BlogTagTranslations | null) ?? null,
    postCount: row._count.posts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalizeTagTranslations(
  input: BlogTagTranslations | undefined,
): { ok: true; data: BlogTagTranslations } | { ok: false } {
  const translations: BlogTagTranslations = {}
  for (const locale of locales) {
    if (locale === 'en') continue
    const text = input?.[locale]?.trim() ?? ''
    if (!text) continue
    if (text.length > BLOG_TERM_NAME_MAX_LENGTH) return { ok: false }
    translations[locale] = text
  }
  return { ok: true, data: translations }
}

export async function createBlogTag(input: BlogTagInput): Promise<BlogTagResult> {
  await requireAdmin()
  const validated = await validateTerm(input, undefined, 'tag')
  if (!validated.ok) return { ok: false, error: validated.error }
  const t = await getTranslations('errors')
  const translations = normalizeTagTranslations(input.translations)
  if (!translations.ok) {
    return { ok: false, error: t('tooLong', { max: BLOG_TERM_NAME_MAX_LENGTH }) }
  }

  const row = await prisma.blogTag.create({
    data: {
      name: validated.name,
      slug: await uniqueTermSlug('tag', validated.slug),
      translations:
        Object.keys(translations.data).length > 0 ? translations.data : Prisma.DbNull,
    },
    select: tagSelect,
  })
  await writeAudit({
    action: 'blogTag.create',
    targetType: 'blogTag',
    targetId: row.id,
    details: JSON.stringify({ name: row.name }),
  })
  revalidateBlogSurfaces()
  return { ok: true, tag: serializeTag(row) }
}

export async function updateBlogTag(id: string, input: BlogTagInput): Promise<BlogTagResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogTag.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('blogTagNotFound') }

  const validated = await validateTerm(input, id, 'tag')
  if (!validated.ok) return { ok: false, error: validated.error }
  const translations = normalizeTagTranslations(input.translations)
  if (!translations.ok) {
    return { ok: false, error: t('tooLong', { max: BLOG_TERM_NAME_MAX_LENGTH }) }
  }

  const row = await prisma.blogTag.update({
    where: { id },
    data: {
      name: validated.name,
      slug: await uniqueTermSlug('tag', validated.slug, id),
      translations:
        Object.keys(translations.data).length > 0 ? translations.data : Prisma.DbNull,
    },
    select: tagSelect,
  })
  await writeAudit({
    action: 'blogTag.update',
    targetType: 'blogTag',
    targetId: id,
    details: JSON.stringify({ name: row.name }),
  })
  revalidateBlogSurfaces()
  return { ok: true, tag: serializeTag(row) }
}

export async function deleteBlogTag(id: string): Promise<BlogActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')
  const existing = await prisma.blogTag.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { posts: true } } },
  })
  if (!existing) return { ok: false, error: t('blogTagNotFound') }

  await prisma.blogTag.delete({ where: { id } })
  await writeAudit({
    action: 'blogTag.delete',
    targetType: 'blogTag',
    targetId: id,
    details: JSON.stringify({ name: existing.name, posts: existing._count.posts }),
  })
  revalidateBlogSurfaces()
  return { ok: true }
}
