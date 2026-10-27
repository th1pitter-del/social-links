import { getTranslations } from 'next-intl/server'

import { ContentForm } from '@/components/admin/content-form'
import { PageHeader } from '@/components/admin/page-header'
import { CONTENT_PAGES, getDefaultContent, getSettingMap } from '@/lib/settings'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('siteContent') }
}

export default async function AdminContentPage() {
  await requireAdmin()
  const t = await getTranslations('admin')
  const [map, pageTitles] = await Promise.all([getSettingMap(), getTranslations('pages')])

  const pages = await Promise.all(
    CONTENT_PAGES.map(async (page) => {
      const defaultContent = await getDefaultContent(page)
      return {
        page,
        title: pageTitles(`${page}.title`),
        value: map[`content.${page}`]?.trim() || defaultContent,
        defaultValue: defaultContent,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('content.title')}
        description={t('content.description')}
      />

      <ContentForm pages={pages} />
    </div>
  )
}
