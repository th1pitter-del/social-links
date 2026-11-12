'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { setSetting, writeAudit } from '@/lib/admin-utils'
import { AD_NETWORK_SCRIPT_MAX_LENGTH } from '@/lib/ads'
import { isMediaOrHttpUrl, sanitizeHex } from '@/lib/settings'
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
  if (trimmedKey === 'ogads.postbackUrl') {
    // Computed from the site URL and postback secret; never typed by hand.
    return { ok: false, error: t('readOnlySetting') }
  }
  if (trimmedKey.startsWith('ogads.')) {
    value = value.trim()
    if (trimmedKey === 'ogads.enabled') {
      value = value === 'true' ? 'true' : 'false'
    } else if (trimmedKey === 'ogads.endpoint') {
      if (value !== '') {
        try {
          const protocol = new URL(value).protocol
          if (protocol !== 'https:' && protocol !== 'http:') {
            return { ok: false, error: t('invalidOgadsEndpoint') }
          }
        } catch {
          return { ok: false, error: t('invalidOgadsEndpoint') }
        }
      }
    } else if (trimmedKey === 'ogads.offersShown') {
      if (value !== '') {
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
          return { ok: false, error: t('invalidOgadsOffersShown') }
        }
        value = String(parsed)
      }
    } else if (trimmedKey === 'ogads.ctype') {
      if (value !== '') {
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 15) {
          return { ok: false, error: t('invalidOgadsCtype') }
        }
        value = String(parsed)
      }
    } else if (trimmedKey === 'ogads.affiliateId') {
      if (value !== '' && !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
        return { ok: false, error: t('invalidOgadsAffiliateId') }
      }
    } else if (trimmedKey === 'ogads.apiKey') {
      if (value !== '' && value.length < 8) {
        return { ok: false, error: t('invalidOgadsApiKey') }
      }
    } else if (trimmedKey === 'ogads.postbackSecret') {
      if (value !== '' && value.length < 16) {
        return { ok: false, error: t('invalidOgadsPostbackSecret') }
      }
    }
  }
  if (trimmedKey.startsWith('theme.')) {
    const trimmedValue = value.trim()
    // Empty value = reset to the built-in default; otherwise it must be hex.
    if (trimmedValue !== '' && !sanitizeHex(trimmedValue)) {
      return { ok: false, error: t('themeColorsHex') }
    }
    value = sanitizeHex(trimmedValue) ?? ''
  }
  if (trimmedKey === 'site.logoUrl' || trimmedKey === 'site.faviconUrl') {
    // Empty = built-in default; otherwise an uploaded media path or http(s) URL.
    const trimmedValue = value.trim()
    if (trimmedValue !== '' && !isMediaOrHttpUrl(trimmedValue)) {
      return { ok: false, error: t('invalidImageUrl') }
    }
    value = trimmedValue
  }
  if (trimmedKey === 'demo.loginEnabled') {
    value = value === 'true' ? 'true' : 'false'
  }
  if (trimmedKey.startsWith('verification.')) {
    // The callback address is computed from the site URL, never typed by hand.
    if (trimmedKey === 'verification.oauthRedirectUrl') {
      return { ok: false, error: t('readOnlySetting') }
    }
    value = value.trim()
    if (trimmedKey === 'verification.enabled') {
      value = value === 'true' ? 'true' : 'false'
    }
  }
  if (trimmedKey.startsWith('email.')) {
    // Credentials are pasted, so surrounding whitespace is never part of the
    // value. An accidental space makes every platform request fail.
    value = value.trim()
    if (trimmedKey === 'email.webhookUrl' && value !== '' && !/^https?:\/\//.test(value)) {
      return { ok: false, error: t('invalidWebhookUrl') }
    }
  }
  if (trimmedKey === 'ads.headScripts') {
    // Ad-network snippets are pasted verbatim; only surrounding whitespace is
    // dropped so the injected code keeps its own formatting.
    value = value.trim()
  }
  const maxLength = trimmedKey.startsWith('content.')
    ? CONTENT_VALUE_MAX_LENGTH
    : trimmedKey === 'ads.headScripts'
      ? AD_NETWORK_SCRIPT_MAX_LENGTH
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
