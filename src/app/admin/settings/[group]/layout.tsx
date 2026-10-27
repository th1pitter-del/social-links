import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { PageHeader } from '@/components/admin/page-header'
import { getSettingsGroup } from '@/components/admin/settings-config'
import { SettingsNav } from '@/components/admin/settings-nav'

export default async function AdminSettingsGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ group: string }>
}) {
  const { group: id } = await params
  const group = getSettingsGroup(id)
  if (!group) notFound()
  const t = await getTranslations('admin.settings')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`groups.${group.id}.title`)}
        description={t(`groups.${group.id}.description`)}
        icon={group.icon}
      />
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
