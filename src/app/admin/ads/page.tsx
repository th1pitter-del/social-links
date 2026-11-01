import { getTranslations } from 'next-intl/server'

import { AdsTable } from '@/components/admin/ads-table'
import { PageHeader } from '@/components/admin/page-header'
import { getAllAdUnits } from '@/lib/ads-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('ads') }
}

export default async function AdminAdsPage() {
  await requireAdmin()
  const t = await getTranslations('admin.ads')
  const ads = await getAllAdUnits()

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <AdsTable initial={ads} />
    </div>
  )
}
