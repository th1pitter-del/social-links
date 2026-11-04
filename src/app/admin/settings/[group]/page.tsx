import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { getSettingsGroup } from '@/components/admin/settings-config'
import { SettingsGroupForm } from '@/components/admin/settings-form'
import { TwitchConnect } from '@/components/admin/twitch-connect'
import { getSettings } from '@/lib/admin-utils'
import { defaultThemeValue } from '@/lib/settings'
import { requireAdmin } from '@/lib/session'
import { twitchRedirectUri } from '@/lib/verification/twitch'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ group: string }> }) {
  const { group: id } = await params
  const [group, t] = await Promise.all([getSettingsGroup(id), getTranslations('admin.settings')])
  return { title: group ? t(`groups.${group.id}.title`) : t('navLabel') }
}

export default async function AdminSettingsGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>
  searchParams: Promise<{ twitch?: string }>
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

  const form = <SettingsGroupForm groupId={group.id} settings={settings} configured={configured} />
  if (group.id !== 'step-verification') return form

  // Twitch cannot be configured by pasting a token: its follow check answers only
  // for the channel owner, so the panel runs a consent round-trip instead.
  const list = await headers()
  const host = list.get('host')
  const protocol = list.get('x-forwarded-proto') ?? 'https'
  const origin = host
    ? `${protocol}://${host}`
    : (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  const { twitch: outcome } = await searchParams

  return (
    <div className="space-y-4">
      <TwitchConnect
        connectedAs={all['verification.twitchBroadcasterLogin']?.trim() || null}
        hasClient={Boolean(all['verification.twitchClientId']?.trim())}
        hasSecret={Boolean(all['verification.twitchClientSecret']?.trim())}
        redirectUri={twitchRedirectUri(origin)}
        outcome={outcome ?? null}
      />
      {form}
    </div>
  )
}
