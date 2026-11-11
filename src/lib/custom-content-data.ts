import 'server-only'

import { cache } from 'react'

import { locales } from '@/i18n/config'
import {
  type CustomMenuItemData,
  type CustomMenuNode,
  type CustomMenuPageRef,
  type CustomPageData,
  type CustomPageStatus,
  type CustomPageTranslations,
  type LocalizedText,
} from '@/lib/custom-content'
import { prisma } from '@/lib/prisma'

type PageRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  status: string
  featuredImage: string | null
  translations: unknown
  createdAt: Date
  updatedAt: Date
  _count?: { menuItems: number }
}

type MenuRow = {
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
}

function toLocalizedText(value: unknown): LocalizedText | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const labels: LocalizedText = {}
  for (const locale of locales) {
    const text = (value as Record<string, unknown>)[locale]
    if (typeof text === 'string' && text.trim()) labels[locale] = text.trim()
  }
  return Object.keys(labels).length ? labels : null
}

function toTranslations(value: unknown): CustomPageTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const translations: CustomPageTranslations = {}
  for (const locale of locales) {
    const entry = (value as Record<string, unknown>)[locale]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const fields: CustomPageTranslations[typeof locale] = {}
    for (const field of ['title', 'excerpt', 'content'] as const) {
      const text = (entry as Record<string, unknown>)[field]
      if (typeof text === 'string' && text.trim()) fields[field] = text
    }
    if (Object.keys(fields).length) translations[locale] = fields
  }
  return Object.keys(translations).length ? translations : null
}

function toPageRef(page: MenuRow['page']): CustomMenuPageRef | null {
  if (!page) return null
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status as CustomPageStatus,
  }
}

function toCustomPage(row: PageRow): CustomPageData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status as CustomPageStatus,
    featuredImage: row.featuredImage,
    translations: toTranslations(row.translations),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    menuItemCount: row._count?.menuItems ?? 0,
  }
}

function toCustomMenuItem(row: MenuRow): CustomMenuItemData {
  return {
    id: row.id,
    parentId: row.parentId,
    pageId: row.pageId,
    title: row.title,
    labels: toLocalizedText(row.labels),
    icon: row.icon,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    page: toPageRef(row.page),
  }
}

const pageSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  status: true,
  featuredImage: true,
  translations: true,
  createdAt: true,
  updatedAt: true,
} as const

const menuPageSelect = {
  page: { select: { id: true, title: true, slug: true, status: true } },
} as const

/**
 * The extra sidebar section exactly as regular users receive it: only active
 * rows, only published pages, no empty parent groups, sorted per level.
 */
export const getSidebarCustomMenus = cache(async (): Promise<CustomMenuNode[]> => {
  try {
    const rows = await prisma.customMenuItem.findMany({
      where: { isActive: true },
      select: {
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
        ...menuPageSelect,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    const items = rows.map(toCustomMenuItem)
    const nodes: CustomMenuNode[] = []

    for (const top of items.filter((item) => !item.parentId)) {
      const publishedPage =
        top.page?.status === 'PUBLISHED' ? top.page : null
      const children = items.filter(
        (item) => item.parentId === top.id && item.page?.status === 'PUBLISHED',
      )
      if (!publishedPage && children.length === 0) continue
      nodes.push({ ...top, page: publishedPage, children })
    }

    return nodes
  } catch {
    return []
  }
})

/** Every menu row for the admin builder, including inactive ones. */
export const getAllCustomMenuItems = cache(async (): Promise<CustomMenuItemData[]> => {
  const rows = await prisma.customMenuItem.findMany({
    select: {
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
      ...menuPageSelect,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(toCustomMenuItem)
})

/** Every content page for the admin list and the menu page picker. */
export const getAllCustomPages = cache(async (): Promise<CustomPageData[]> => {
  const rows = await prisma.customPage.findMany({
    select: { ...pageSelect, _count: { select: { menuItems: true } } },
    orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
  })
  return rows.map(toCustomPage)
})

export const getCustomPageById = cache(async (id: string): Promise<CustomPageData | null> => {
  const row = await prisma.customPage.findUnique({
    where: { id },
    select: { ...pageSelect, _count: { select: { menuItems: true } } },
  })
  return row ? toCustomPage(row) : null
})

/** Raw lookup for the user-facing route; publication is enforced by the page. */
export async function getCustomPageBySlug(slug: string): Promise<CustomPageData | null> {
  const row = await prisma.customPage.findUnique({
    where: { slug },
    select: { ...pageSelect, _count: { select: { menuItems: true } } },
  })
  return row ? toCustomPage(row) : null
}
