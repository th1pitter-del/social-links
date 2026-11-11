import { getTranslations } from 'next-intl/server'

import { CustomMenusBuilder } from '@/components/admin/custom-menus-builder'
import { getAllCustomMenuItems, getAllCustomPages } from '@/lib/custom-content-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('customMenus') }
}

export default async function AdminCustomMenusPage() {
  await requireAdmin()
  const [items, pages] = await Promise.all([getAllCustomMenuItems(), getAllCustomPages()])

  return <CustomMenusBuilder initial={items} pages={pages} />
}
