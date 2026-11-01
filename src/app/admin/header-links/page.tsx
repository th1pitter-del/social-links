import { getTranslations } from 'next-intl/server'

import { HeaderLinksTable } from '@/components/admin/header-links-table'
import { PageHeader } from '@/components/admin/page-header'
import { getAllHeaderLinks } from '@/lib/ads-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('headerLinks') }
}

export default async function AdminHeaderLinksPage() {
  await requireAdmin()
  const t = await getTranslations('admin.headerLinks')
  const links = await getAllHeaderLinks()

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <HeaderLinksTable initial={links} />
    </div>
  )
}
