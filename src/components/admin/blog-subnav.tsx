import { getTranslations } from 'next-intl/server'

import { FilterTabs } from '@/components/admin/filter-tabs'

/** Shared section switcher for every blog admin screen. */
export async function BlogSubnav({ active }: { active: 'overview' | 'articles' | 'categories' | 'tags' }) {
  const t = await getTranslations('admin.blog')
  return (
    <FilterTabs
      items={[
        { label: t('nav.overview'), href: '/admin/blog', active: active === 'overview' },
        { label: t('nav.articles'), href: '/admin/blog/articles', active: active === 'articles' },
        { label: t('nav.categories'), href: '/admin/blog/categories', active: active === 'categories' },
        { label: t('nav.tags'), href: '/admin/blog/tags', active: active === 'tags' },
      ]}
    />
  )
}
