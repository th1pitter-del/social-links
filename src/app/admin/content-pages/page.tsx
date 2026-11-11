import { getTranslations } from 'next-intl/server'
import { NotebookText } from 'lucide-react'

import { ContentPagesTable } from '@/components/admin/content-pages-table'
import { PageHeader } from '@/components/admin/page-header'
import { getAllCustomPages } from '@/lib/custom-content-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('contentPages') }
}

export default async function AdminContentPagesPage() {
  await requireAdmin()
  const [t, pages] = await Promise.all([
    getTranslations('admin.contentPages'),
    getAllCustomPages(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} icon={NotebookText} />
      <ContentPagesTable initial={pages} />
    </div>
  )
}
