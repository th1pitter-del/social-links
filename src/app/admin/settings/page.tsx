import { redirect } from 'next/navigation'

import { SETTINGS_GROUPS } from '@/components/admin/settings-config'

export default function AdminSettingsIndexPage() {
  redirect(`/admin/settings/${SETTINGS_GROUPS[0].id}`)
}
