import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AdSlot } from '@/components/ads/ad-slot'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSidebarCustomMenus } from '@/lib/custom-content-data'
import { requireUser } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const [site, customMenus] = await Promise.all([getSiteSettings(), getSidebarCustomMenus()])
  const t = await getTranslations('dashboard.common')

  return (
    <DashboardShell
      user={{
        id: session.user.id,
        name: session.user.name ?? t('member'),
        email: session.user.email ?? '',
        role: session.user.role ?? 'USER',
      }}
      siteName={site.name}
      logoUrl={site.logoUrl}
      customMenus={customMenus}
    >
      <AdSlot placement="dashboard-top" />
      {children}
      <AdSlot placement="dashboard-bottom" />
    </DashboardShell>
  )
}
