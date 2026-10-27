import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/admin/page-header'
import { requireAdmin } from '@/lib/session'
import { getAllPlatforms } from '@/lib/action-catalog'
import { PlatformsTable } from '@/components/admin/platforms-table'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('platforms') }
}

export default async function AdminPlatformsPage() {
  await requireAdmin()
  const t = await getTranslations('admin.platforms')
  const platforms = await getAllPlatforms()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <PlatformsTable initial={platforms} />
    </div>
  )
}
