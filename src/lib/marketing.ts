import type { SiteNavIcon } from '@/components/site-nav-icons'
import type { HeaderMenuKey } from '@/lib/ads'

/** One titled block of copy on a marketing page, read from the catalogs. */
export type MarketingSection = { title: string; body: string }

/** One child page advertised on a hub page or a topic's related list. */
export type MarketingTopic = {
  /** URL segment under the hub, e.g. `story` for /about/story. */
  slug: string
  /** Catalog key under `pages.<hub>.topics` and `pages.<hub>.cards`. */
  key: string
  /** Built-in header menu label for this topic. */
  navKey: HeaderMenuKey
  icon: SiteNavIcon
}

export const ABOUT_TOPICS: MarketingTopic[] = [
  { slug: 'story', key: 'story', navKey: 'aboutStory', icon: 'sparkles' },
  { slug: 'what-we-do', key: 'what', navKey: 'aboutWhat', icon: 'rocket' },
  { slug: 'values', key: 'values', navKey: 'aboutValues', icon: 'heart' },
]

export const HOW_IT_WORKS_TOPICS: MarketingTopic[] = [
  { slug: 'create', key: 'create', navKey: 'hiwCreate', icon: 'link' },
  { slug: 'share', key: 'share', navKey: 'hiwShare', icon: 'globe' },
  { slug: 'unlock', key: 'unlock', navKey: 'hiwUnlock', icon: 'gift' },
]

/** The catalog stores topic copy as arrays; keep only well-formed entries. */
export function readSections(value: unknown): MarketingSection[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is MarketingSection =>
      Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as MarketingSection).title === 'string' &&
          typeof (item as MarketingSection).body === 'string',
      ),
  )
}

/** The catalog stores card copy as objects with one title and one body. */
export function readCard(value: unknown): { title: string; body: string } {
  const card = value as { title?: unknown; body?: unknown } | null
  return {
    title: typeof card?.title === 'string' ? card.title : '',
    body: typeof card?.body === 'string' ? card.body : '',
  }
}
export function topicHref(hub: string, topic: MarketingTopic) {
  return `/${hub}/${topic.slug}`
}