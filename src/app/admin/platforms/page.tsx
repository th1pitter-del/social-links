import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/admin/page-header'
import { getAllPlatforms } from '@/lib/action-catalog'
import { SUPPORTED_PLATFORM_KEYS } from '@/lib/action-defaults'
import { requireAdmin } from '@/lib/session'
import { PlatformsTable } from '@/components/admin/platforms-table'

export const dynamic = 'force-dynamic'

const SUPPORTED = new Set<string>(SUPPORTED_PLATFORM_KEYS)

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('platforms') }
}

export default async function AdminPlatformsPage() {
  await requireAdmin()
  const t = await getTranslations('admin.platforms')
  // Retired built-ins stay in the database; the panel only lists the supported
  // catalog plus anything the administrator created themselves.
  const platforms = (await getAllPlatforms()).filter(
    (platform) => !platform.system || SUPPORTED.has(platform.key),
  )

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
