// Shared (client-safe) constants and types for the admin-managed dashboard
// sidebar menus and their content pages. Server data access lives in
// `custom-content-data.ts`; HTML sanitizing lives in `rich-text.ts`.

import type { SiteNavIcon } from '@/components/site-nav-icons'
import type { Locale } from '@/i18n/config'

export const CUSTOM_MENU_TITLE_MAX_LENGTH = 60
export const CUSTOM_PAGE_TITLE_MAX_LENGTH = 120
export const CUSTOM_PAGE_EXCERPT_MAX_LENGTH = 300
export const CUSTOM_PAGE_CONTENT_MAX_LENGTH = 120_000

/** Same shape as link slugs: lowercase words joined by single hyphens. */
export const CUSTOM_PAGE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/

/** Every icon in the project's shared nav icon library. */
export const CUSTOM_MENU_ICONS = [
  'listChecks',
  'sparkles',
  'circleHelp',
  'minimize',
  'download',
  'link',
  'globe',
  'star',
  'gift',
  'tag',
  'rocket',
  'play',
  'film',
  'music',
  'camera',
  'heart',
  'flame',
  'layoutDashboard',
  'shieldCheck',
  'logIn',
] as const satisfies readonly SiteNavIcon[]

export type CustomMenuIcon = (typeof CUSTOM_MENU_ICONS)[number]

export const CUSTOM_MENU_ICON_DEFAULT: CustomMenuIcon = 'link'

export function isCustomMenuIcon(value: string): value is CustomMenuIcon {
  return (CUSTOM_MENU_ICONS as readonly string[]).includes(value)
}

export type LocalizedText = Partial<Record<Locale, string>>

export type CustomPageStatus = 'DRAFT' | 'PUBLISHED'

/** One locale's authored page fields. Empty strings fall back to English. */
export type CustomPageLocaleText = {
  title?: string
  excerpt?: string
  content?: string
}

export type CustomPageTranslations = Partial<Record<Locale, CustomPageLocaleText>>

export type CustomPageData = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  status: CustomPageStatus
  featuredImage: string | null
  translations: CustomPageTranslations | null
  createdAt: string
  updatedAt: string
  /** How many sidebar menu rows point at this page. */
  menuItemCount: number
}

export type CustomPageInput = {
  title: string
  slug: string
  excerpt: string
  content: string
  status: CustomPageStatus
  featuredImage: string
  translations: CustomPageTranslations
}

export type CustomMenuPageRef = {
  id: string
  title: string
  slug: string
  status: CustomPageStatus
}

export type CustomMenuItemData = {
  id: string
  parentId: string | null
  pageId: string | null
  title: string
  labels: LocalizedText | null
  icon: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  page: CustomMenuPageRef | null
}

/** A top-level row with its (at most one level of) submenu rows. */
export type CustomMenuNode = CustomMenuItemData & { children: CustomMenuItemData[] }

export type CustomMenuItemInput = {
  title: string
  labels: LocalizedText
  icon: string
  parentId: string | null
  pageId: string | null
  isActive: boolean
  /** Create a draft page from this title and link it in one step. */
  createPageTitle?: string
}

export type CustomMenuOrderUpdate = {
  id: string
  parentId: string | null
  sortOrder: number
}

/** Locale-correct label, falling back to the English title. */
export function menuLabel(item: Pick<CustomMenuItemData, 'title' | 'labels'>, locale: Locale) {
  return item.labels?.[locale]?.trim() || item.title
}

/** Locale-correct page copy, falling back to the English columns. */
export function pageText(
  page: {
    title: string
    excerpt: string | null
    content: string
    translations?: CustomPageTranslations | null
  },
  locale: Locale,
) {
  const override = page.translations?.[locale]
  return {
    title: override?.title?.trim() || page.title,
    excerpt: override?.excerpt?.trim() || page.excerpt || '',
    content: override?.content?.trim() || page.content,
  }
}

export function customPageHref(slug: string) {
  return `/dashboard/pages/${slug}`
}
