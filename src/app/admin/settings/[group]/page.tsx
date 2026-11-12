import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { getSettingsGroup } from '@/components/admin/settings-config'
import { SettingsGroupForm } from '@/components/admin/settings-form'
import { getSettings } from '@/lib/admin-utils'
import { getOgadsConfig, ogadsPostbackUrl } from '@/lib/ogads'
import { defaultThemeValue } from '@/lib/settings'
import { SITE_URL } from '@/lib/seo'
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
  const settings: Record<string, string> = {}
  const configured: Record<string, boolean> = {}
  for (const field of group.fields) {
    const stored = all[field.key]
    if (field.secret) {
      // A credential is write-only: report that one exists, never what it is.
      settings[field.key] = ''
      configured[field.key] = Boolean(stored?.trim())
    } else {
      settings[field.key] = stored ?? defaultThemeValue(field.key) ?? ''
    }
  }

  if (group.id === 'ogads') {
    // The postback URL must contain the secret for OGAds to call us at all, so
    // it is the one credential that reaches this page — as the URL to paste.
    const ogads = await getOgadsConfig()
    settings['ogads.postbackUrl'] = ogads.postbackSecret ? ogadsPostbackUrl(ogads) : ''
  }

  if (group.id === 'step-verification') {
    // Providers must be told where to send the visitor back. It is derived
    // from the site's own address, never typed, so it cannot drift.
    settings['verification.oauthRedirectUrl'] = `${SITE_URL}/api/verify/callback`
    // The switch is on until an administrator turns it off.
    settings['verification.enabled'] = all['verification.enabled'] === 'false' ? 'false' : 'true'
  }

  return <SettingsGroupForm groupId={group.id} settings={settings} configured={configured} />
}
