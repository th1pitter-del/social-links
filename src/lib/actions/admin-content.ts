'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { Prisma } from '@/generated/prisma/client'
import { locales } from '@/i18n/config'
import { writeAudit } from '@/lib/admin-utils'
import {
  CUSTOM_MENU_TITLE_MAX_LENGTH,
  CUSTOM_PAGE_CONTENT_MAX_LENGTH,
  CUSTOM_PAGE_EXCERPT_MAX_LENGTH,
  CUSTOM_PAGE_SLUG_PATTERN,
  CUSTOM_PAGE_TITLE_MAX_LENGTH,
  isCustomMenuIcon,
  type CustomPageData,
  type CustomPageInput,
  type CustomPageTranslations,
  type CustomMenuItemData,
  type CustomMenuItemInput,
  type CustomMenuOrderUpdate,
} from '@/lib/custom-content'
import { getCustomPageById } from '@/lib/custom-content-data'
import { prisma } from '@/lib/prisma'
import { sanitizeRichText } from '@/lib/rich-text'
import { requireAdmin } from '@/lib/session'

export type CustomPageResult =
  | { ok: true; page: CustomPageData }
  | { ok: false; error: string }
export type CustomMenuResult =
  | { ok: true; item: CustomMenuItemData }
  | { ok: false; error: string }
export type CustomContentActionResult = { ok: true } | { ok: false; error: string }

function revalidateContentSurfaces() {
  revalidatePath('/admin')
  revalidatePath('/admin/content-pages')
  revalidatePath('/admin/custom-menus')
  // The dashboard layout reads the visible menu tree on every request and the
  // page route renders sanitized copy, so refresh everything below it.
  revalidatePath('/dashboard', 'layout')
}

function isSafeImage(value: string): boolean {
  return /^https?:\/\//.test(value) || /^\/api\/media\/[A-Za-z0-9_-]+$/.test(value)
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
  if (!base) return 'page'
  // The slug pattern allows one character or three and more; pad two.
  return base.length === 2 ? `page-${base}` : base
}

async function uniquePageSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let suffix = 2
  for (;;) {
    const existing = await prisma.customPage.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function validatePageInput(
  input: CustomPageInput,
  existingId?: string,
): Promise<
  | {
      ok: true
      data: {
        title: string
        slug: string
        excerpt: string | null
        content: string
        status: 'DRAFT' | 'PUBLISHED'
        featuredImage: string | null
        translations: CustomPageTranslations | null
      }
    }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  const title = input.title?.trim() ?? ''
  if (!title) return { ok: false, error: t('customPageTitleRequired') }
  if (title.length > CUSTOM_PAGE_TITLE_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: CUSTOM_PAGE_TITLE_MAX_LENGTH }) }
  }

  const excerpt = input.excerpt?.trim() ?? ''
  if (excerpt.length > CUSTOM_PAGE_EXCERPT_MAX_LENGTH) {
    return { ok: false, error: t('tooLong', { max: CUSTOM_PAGE_EXCERPT_MAX_LENGTH }) }
  }

  const rawContent = input.content ?? ''
  if (rawContent.length > CUSTOM_PAGE_CONTENT_MAX_LENGTH) {
    return { ok: false, error: t('contentTooLong', { max: CUSTOM_PAGE_CONTENT_MAX_LENGTH }) }
  }
  const content = sanitizeRichText(rawContent)

  let slug = (input.slug ?? '').trim().toLowerCase()
  if (!slug) slug = slugify(title)
  if (!CUSTOM_PAGE_SLUG_PATTERN.test(slug)) {
    return { ok: false, error: t('invalidSlug') }
  }
  const slugOwner = await prisma.customPage.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (slugOwner && slugOwner.id !== existingId) {
    return { ok: false, error: t('slugTaken') }
  }

  const featuredImage = input.featuredImage?.trim() ?? ''
  if (featuredImage && !isSafeImage(featuredImage)) {
    return { ok: false, error: t('invalidCoverImage') }
  }

  const translations: CustomPageTranslations = {}
  for (const locale of locales) {
    if (locale === 'en') continue
    const entry = input.translations?.[locale]
    if (!entry) continue
    const localizedTitle = entry.title?.trim() ?? ''
    const localizedExcerpt = entry.excerpt?.trim() ?? ''
    const rawLocaleContent = entry.content ?? ''
    if (localizedTitle.length > CUSTOM_PAGE_TITLE_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: CUSTOM_PAGE_TITLE_MAX_LENGTH }) }
    }
    if (localizedExcerpt.length > CUSTOM_PAGE_EXCERPT_MAX_LENGTH) {
      return { ok: false, error: t('tooLong', { max: CUSTOM_PAGE_EXCERPT_MAX_LENGTH }) }
    }
    if (rawLocaleContent.length > CUSTOM_PAGE_CONTENT_MAX_LENGTH) {
      return { ok: false, error: t('contentTooLong', { max: CUSTOM_PAGE_CONTENT_MAX_LENGTH }) }
    }
    const fields: CustomPageTranslations[typeof locale] = {}
    if (localizedTitle) fields.title = localizedTitle
    if (localizedExcerpt) fields.excerpt = localizedExcerpt
    if (rawLocaleContent.trim()) fields.content = sanitizeRichText(rawLocaleContent)
    if (Object.keys(fields).length) translations[locale] = fields
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      status: input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      featuredImage: featuredImage || null,
      translations: Object.keys(translations).length ? translations : null,
    },
  }
}

export async function createCustomPage(input: CustomPageInput): Promise<CustomPageResult> {
  await requireAdmin()
  const validated = await validatePageInput(input)
  if (!validated.ok) return { ok: false, error: validated.error }

  const row = await prisma.customPage.create({
    data: {
      ...validated.data,
      translations: validated.data.translations ?? Prisma.DbNull,
    },
    select: { id: true, title: true, slug: true },
  })
  await writeAudit({
    action: 'customPage.create',
    targetType: 'customPage',
    targetId: row.id,
    details: JSON.stringify({ title: row.title, slug: row.slug }),
  })
  revalidateContentSurfaces()
  const page = await getCustomPageById(row.id)
  const t = await getTranslations('errors')
  return page ? { ok: true, page } : { ok: false, error: t('customPageNotFound') }
}

export async function updateCustomPage(
  id: string,
  input: CustomPageInput,
): Promise<CustomPageResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customPage.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!existing) return { ok: false, error: t('customPageNotFound') }

  const validated = await validatePageInput(input, id)
  if (!validated.ok) return { ok: false, error: validated.error }

  await prisma.customPage.update({
    where: { id },
    data: {
      ...validated.data,
      translations: validated.data.translations ?? Prisma.DbNull,
    },
  })
  await writeAudit({
    action:
      existing.status !== validated.data.status
        ? validated.data.status === 'PUBLISHED'
          ? 'customPage.publish'
          : 'customPage.unpublish'
        : 'customPage.update',
    targetType: 'customPage',
    targetId: id,
    details: JSON.stringify({ title: validated.data.title, slug: validated.data.slug }),
  })
  revalidateContentSurfaces()
  const page = await getCustomPageById(id)
  return page ? { ok: true, page } : { ok: false, error: t('customPageNotFound') }
}

export async function setCustomPageStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED',
): Promise<CustomContentActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customPage.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('customPageNotFound') }

  await prisma.customPage.update({ where: { id }, data: { status } })
  await writeAudit({
    action: status === 'PUBLISHED' ? 'customPage.publish' : 'customPage.unpublish',
    targetType: 'customPage',
    targetId: id,
  })
  revalidateContentSurfaces()
  return { ok: true }
}

export async function deleteCustomPage(id: string): Promise<CustomContentActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customPage.findUnique({
    where: { id },
    select: { id: true, title: true, _count: { select: { menuItems: true } } },
  })
  if (!existing) return { ok: false, error: t('customPageNotFound') }
  if (existing._count.menuItems > 0) {
    return {
      ok: false,
      error: t('customPageInUse', { count: existing._count.menuItems }),
    }
  }

  await prisma.customPage.delete({ where: { id } })
  await writeAudit({
    action: 'customPage.delete',
    targetType: 'customPage',
    targetId: id,
    details: JSON.stringify({ title: existing.title }),
  })
  revalidateContentSurfaces()
  return { ok: true }
}

async function validateMenuInput(
  input: CustomMenuItemInput,
  existing: { id: string; parentId: string | null } | null,
): Promise<
  | {
      ok: true
      data: {
        title: string
        labels: Record<string, string> | null
        icon: string
        parentId: string | null
        pageId: string | null
        isActive: boolean
        createPageTitle: string | null
      }
    }
  | { ok: false; error: string }
> {
  const t = await getTranslations('errors')

  const title = input.title?.trim() ?? ''
  if (!title) return { ok: false, error: t('menuTitleRequired') }
  if (title.length > CUSTOM_MENU_TITLE_MAX_LENGTH) {
    return { ok: false, error: t('labelTooLong') }
  }

  const labels: Record<string, string> = {}
  for (const locale of locales) {
    if (locale === 'en') continue
    const raw = input.labels?.[locale]
    if (typeof raw !== 'string') continue
    const text = raw.trim().replace(/\s+/g, ' ')
    if (!text) continue
    if (text.length > CUSTOM_MENU_TITLE_MAX_LENGTH) {
      return { ok: false, error: t('labelTooLong') }
    }
    labels[locale] = text
  }

  if (!isCustomMenuIcon(input.icon)) {
    return { ok: false, error: t('invalidMenuIcon') }
  }

  const parentIdInput = input.parentId?.trim() ?? ''
  let parentId: string | null = null
  if (parentIdInput) {
    if (existing && parentIdInput === existing.id) {
      return { ok: false, error: t('invalidMenuParent') }
    }
    const parent = await prisma.customMenuItem.findUnique({
      where: { id: parentIdInput },
      select: { id: true, parentId: true },
    })
    // One level of nesting: a parent must itself be a top-level row.
    if (!parent || parent.parentId) {
      return { ok: false, error: t('invalidMenuParent') }
    }
    if (existing) {
      const children = await prisma.customMenuItem.count({ where: { parentId: existing.id } })
      if (children > 0) {
        return { ok: false, error: t('menuParentHasChildren') }
      }
    }
    parentId = parent.id
  }

  const pageIdInput = input.pageId?.trim() ?? ''
  let pageId: string | null = null
  if (pageIdInput) {
    const page = await prisma.customPage.findUnique({
      where: { id: pageIdInput },
      select: { id: true },
    })
    if (!page) return { ok: false, error: t('customPageNotFound') }
    pageId = page.id
  }

  const createPageTitle = input.createPageTitle?.trim() ?? ''
  if (!pageId && !createPageTitle && parentId) {
    return { ok: false, error: t('menuPageRequired') }
  }

  return {
    ok: true,
    data: {
      title,
      labels: Object.keys(labels).length ? labels : null,
      icon: input.icon,
      parentId,
      pageId,
      isActive: input.isActive,
      createPageTitle: createPageTitle || null,
    },
  }
}

async function nextMenuPosition(parentId: string | null): Promise<number> {
  const last = await prisma.customMenuItem.findFirst({
    where: { parentId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  return (last?.sortOrder ?? -1) + 1
}

function serializeMenuItem(row: {
  id: string
  parentId: string | null
  pageId: string | null
  title: string
  labels: unknown
  icon: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  page: { id: string; title: string; slug: string; status: string } | null
}): CustomMenuItemData {
  const labels: Record<string, string> = {}
  if (row.labels && typeof row.labels === 'object' && !Array.isArray(row.labels)) {
    for (const locale of locales) {
      const text = (row.labels as Record<string, unknown>)[locale]
      if (typeof text === 'string' && text.trim()) labels[locale] = text.trim()
    }
  }
  return {
    id: row.id,
    parentId: row.parentId,
    pageId: row.pageId,
    title: row.title,
    labels: Object.keys(labels).length ? labels : null,
    icon: row.icon,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    page: row.page
      ? {
          id: row.page.id,
          title: row.page.title,
          slug: row.page.slug,
          status: row.page.status as 'DRAFT' | 'PUBLISHED',
        }
      : null,
  }
}

const menuSelect = {
  id: true,
  parentId: true,
  pageId: true,
  title: true,
  labels: true,
  icon: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  page: { select: { id: true, title: true, slug: true, status: true } },
} as const

export async function createCustomMenuItem(
  input: CustomMenuItemInput,
): Promise<CustomMenuResult> {
  await requireAdmin()
  const validated = await validateMenuInput(input, null)
  if (!validated.ok) return { ok: false, error: validated.error }

  let pageId = validated.data.pageId
  if (!pageId && validated.data.createPageTitle) {
    // Inline creation always lands as a draft page so nothing goes public by
    // accident; the admin publishes it from the content page editor.
    const page = await prisma.customPage.create({
      data: {
        title: validated.data.createPageTitle,
        slug: await uniquePageSlug(slugify(validated.data.createPageTitle)),
        content: '',
        status: 'DRAFT',
      },
      select: { id: true },
    })
    pageId = page.id
  }

  const row = await prisma.customMenuItem.create({
    data: {
      title: validated.data.title,
      labels: validated.data.labels ?? Prisma.DbNull,
      icon: validated.data.icon,
      parentId: validated.data.parentId,
      pageId,
      isActive: validated.data.isActive,
      sortOrder: await nextMenuPosition(validated.data.parentId),
    },
    select: menuSelect,
  })
  await writeAudit({
    action: 'customMenu.create',
    targetType: 'customMenuItem',
    targetId: row.id,
    details: JSON.stringify({ title: row.title, parentId: row.parentId, pageId }),
  })
  revalidateContentSurfaces()
  return { ok: true, item: serializeMenuItem(row) }
}

export async function updateCustomMenuItem(
  id: string,
  input: CustomMenuItemInput,
): Promise<CustomMenuResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customMenuItem.findUnique({
    where: { id },
    select: { id: true, parentId: true },
  })
  if (!existing) return { ok: false, error: t('menuNotFound') }

  const validated = await validateMenuInput(input, existing)
  if (!validated.ok) return { ok: false, error: validated.error }

  let pageId = validated.data.pageId
  if (!pageId && validated.data.createPageTitle) {
    const page = await prisma.customPage.create({
      data: {
        title: validated.data.createPageTitle,
        slug: await uniquePageSlug(slugify(validated.data.createPageTitle)),
        content: '',
        status: 'DRAFT',
      },
      select: { id: true },
    })
    pageId = page.id
  }

  // Moving between parents re-queues the row at the end of its new siblings.
  const moved = validated.data.parentId !== existing.parentId
  const row = await prisma.customMenuItem.update({
    where: { id },
    data: {
      title: validated.data.title,
      labels: validated.data.labels ?? Prisma.DbNull,
      icon: validated.data.icon,
      parentId: validated.data.parentId,
      pageId,
      isActive: validated.data.isActive,
      ...(moved ? { sortOrder: await nextMenuPosition(validated.data.parentId) } : {}),
    },
    select: menuSelect,
  })
  await writeAudit({
    action: 'customMenu.update',
    targetType: 'customMenuItem',
    targetId: id,
    details: JSON.stringify({ title: row.title, parentId: row.parentId, pageId }),
  })
  revalidateContentSurfaces()
  return { ok: true, item: serializeMenuItem(row) }
}

export async function setCustomMenuItemActive(
  id: string,
  isActive: boolean,
): Promise<CustomContentActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customMenuItem.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return { ok: false, error: t('menuNotFound') }

  await prisma.customMenuItem.update({ where: { id }, data: { isActive } })
  await writeAudit({
    action: isActive ? 'customMenu.enable' : 'customMenu.disable',
    targetType: 'customMenuItem',
    targetId: id,
  })
  revalidateContentSurfaces()
  return { ok: true }
}

export async function deleteCustomMenuItem(id: string): Promise<CustomContentActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const existing = await prisma.customMenuItem.findUnique({
    where: { id },
    select: { id: true, title: true },
  })
  if (!existing) return { ok: false, error: t('menuNotFound') }

  // Children are removed by the cascade; pages are never deleted with a menu.
  await prisma.customMenuItem.delete({ where: { id } })
  await writeAudit({
    action: 'customMenu.delete',
    targetType: 'customMenuItem',
    targetId: id,
    details: JSON.stringify({ title: existing.title }),
  })
  revalidateContentSurfaces()
  return { ok: true }
}

export async function reorderCustomMenuItems(
  updates: CustomMenuOrderUpdate[],
): Promise<CustomContentActionResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  if (!Array.isArray(updates) || updates.length === 0) return { ok: true }
  if (updates.length > 500) return { ok: false, error: t('menuOrderInvalid') }

  const rows = await prisma.customMenuItem.findMany({
    select: { id: true, parentId: true },
  })
  const finalParents = new Map(rows.map((row) => [row.id, row.parentId]))
  for (const update of updates) {
    if (!finalParents.has(update.id)) return { ok: false, error: t('menuOrderInvalid') }
    finalParents.set(update.id, update.parentId)
  }

  for (const [id, parentId] of finalParents) {
    if (!parentId) continue
    const parent = finalParents.get(parentId)
    if (parent === undefined) return { ok: false, error: t('menuOrderInvalid') }
    if (parentId === id || parent !== null) {
      return { ok: false, error: t('menuOrderInvalid') }
    }
  }

  // One level only: a row that owns children cannot itself become a child.
  for (const update of updates) {
    if (!update.parentId) continue
    const hasChildren = [...finalParents.values()].includes(update.id)
    if (hasChildren) return { ok: false, error: t('menuParentHasChildren') }
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.customMenuItem.update({
        where: { id: update.id },
        data: {
          parentId: update.parentId,
          sortOrder: Math.max(0, Math.trunc(update.sortOrder)),
        },
      }),
    ),
  )
  await writeAudit({
    action: 'customMenu.reorder',
    targetType: 'customMenuItem',
    details: JSON.stringify({ count: updates.length }),
  })
  revalidateContentSurfaces()
  return { ok: true }
}
