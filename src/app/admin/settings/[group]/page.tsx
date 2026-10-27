import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { getSettingsGroup } from '@/components/admin/settings-config'
import { SettingsGroupForm } from '@/components/admin/settings-form'
import { getSettings } from '@/lib/admin-utils'
import { defaultThemeValue } from '@/lib/settings'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }) {
  const { group: id } = await params
  const [group, t] = await Promise.all([getSettingsGroup(id), getTranslations('admin.settings')])
  return { title: group ? t(`groups.${group.id}.title`) : t('navLabel') }
}

export default async function AdminSettingsGroupPage({
  params,
}: {
  params: Promise<{ group: string }>
}) {
  await requireAdmin()
  const { group: id } = await params

  const group = getSettingsGroup(id)
  if (!group) notFound()

  // Only expose the keys this group edits. `getSettings()` returns every row,
  // including any secret values, which must never be sent to the client.
  // Theme colors prefill with their effective defaults so the pickers start
  // on the color actually in use instead of an empty input.
  const all = await getSettings()
  const settings = Object.fromEntries(
    group.fields.map((field) => {
      const stored = all[field.key]
      const value = stored ?? defaultThemeValue(field.key) ?? ''
      return [field.key, value]
    }),
  )

  return <SettingsGroupForm groupId={group.id} settings={settings} />
}
