import { getTranslations } from 'next-intl/server'

import { AdminShell } from '@/components/admin/admin-shell'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('settings') }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const site = await getSiteSettings()

  // The badge count is best-effort: a failure here must never block the panel.
  const openReports = await prisma.abuseReport
    .count({ where: { status: 'OPEN' } })
    .catch(() => 0)

  return (
    <AdminShell
      user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
      siteName={site.name}
      openReports={openReports}
    >
      {children}
    </AdminShell>
  )
}
