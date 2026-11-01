import { getTranslations } from 'next-intl/server'

import { AdSlot } from '@/components/ads/ad-slot'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { requireUser } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const site = await getSiteSettings()
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
    >
      <AdSlot placement="dashboard-top" />
      {children}
      <AdSlot placement="dashboard-bottom" />
    </DashboardShell>
  )
}
