'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { setSetting, writeAudit } from '@/lib/admin-utils'
import { sanitizeHex } from '@/lib/settings'
import { CONTENT_VALUE_MAX_LENGTH } from '@/lib/validation'
import { requireAdmin } from '@/lib/session'

export type SettingsResult = { ok: true } | { ok: false; error: string }

export async function updateSetting(key: string, value: string): Promise<SettingsResult> {
  await requireAdmin()
  const t = await getTranslations('errors')

  const trimmedKey = key.trim()
  if (!trimmedKey || trimmedKey.length > 64) {
    return { ok: false, error: t('invalidSettingKey') }
  }
  if (trimmedKey.startsWith('theme.')) {
    const trimmedValue = value.trim()
    // Empty value = reset to the built-in default; otherwise it must be hex.
    if (trimmedValue !== '' && !sanitizeHex(trimmedValue)) {
      return { ok: false, error: t('themeColorsHex') }
    }
    value = sanitizeHex(trimmedValue) ?? ''
  }
  const maxLength = trimmedKey.startsWith('content.')
    ? CONTENT_VALUE_MAX_LENGTH
    : 2000
  if (value.length > maxLength) {
    return { ok: false, error: t('contentTooLong', { max: maxLength }) }
  }

  await setSetting(trimmedKey, value)
  await writeAudit({
    action: 'setting.update',
    targetType: 'setting',
    targetId: trimmedKey,
    details: JSON.stringify({ length: value.length }),
  })

  revalidatePath('/admin/settings', 'layout')
  revalidatePath('/admin/content')
  revalidatePath('/', 'layout')
  return { ok: true }
}
