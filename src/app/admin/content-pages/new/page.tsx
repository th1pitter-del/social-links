import { getTranslations } from 'next-intl/server'

import { CustomPageEditor } from '@/components/admin/custom-page-editor'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.contentPages')
  return { title: t('createTitle') }
}

export default async function AdminNewContentPage() {
  await requireAdmin()
  return <CustomPageEditor initial={null} />
}
