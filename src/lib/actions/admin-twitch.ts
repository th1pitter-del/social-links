'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'

import { requireAdmin } from '@/lib/session'
import { disconnectTwitch, startTwitchConnect } from '@/lib/verification/twitch'

export type TwitchActionResult = { ok: true; url: string } | { ok: false; error: string }

/** Hands the panel the Twitch consent URL; the code comes back to the API route. */
export async function connectTwitchAccount(): Promise<TwitchActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('admin.settings.twitch')

  const list = await headers()
  const origin = (list.get('origin') ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')
    .replace(/\/+$/, '')

  const result = await startTwitchConnect(session.user.id, origin)
  if (!result.ok) {
    return { ok: false, error: t('needClient') }
  }
  return { ok: true, url: result.url }
}

export async function disconnectTwitchAccount(): Promise<{ ok: true }> {
  await requireAdmin()
  await disconnectTwitch()
  revalidatePath('/admin/settings/step-verification')
  return { ok: true }
}
