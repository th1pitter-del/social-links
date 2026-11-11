import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { CustomPageEditor } from '@/components/admin/custom-page-editor'
import { getCustomPageById } from '@/lib/custom-content-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('admin.contentPages')
  const { id } = await params
  const page = await getCustomPageById(id)
  return { title: page?.title ?? t('editTitle') }
}

export default async function AdminEditContentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const page = await getCustomPageById(id)
  if (!page) notFound()

  return <CustomPageEditor initial={page} />
}
