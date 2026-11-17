'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { setSetting, writeAudit } from '@/lib/admin-utils'
import { SITE_CODE_MAX_LENGTH } from '@/lib/ads'
import {
  BRAND_NAME_SIZE_DEFAULT,
  BRAND_NAME_SIZE_MAX,
  BRAND_NAME_SIZE_MIN,
  BRAND_NAME_SPLIT_MAX,
} from '@/lib/brand-name'
import { isBrandMarkIcon } from '@/lib/brand-mark-icons'
import { DEFAULT_STEP_HOLD_SECONDS, STEP_HOLD_MAX_SECONDS, isMediaOrHttpUrl } from '@/lib/settings'
import { sanitizeHex } from '@/lib/theme-palette'
import { CONTENT_VALUE_MAX_LENGTH } from '@/lib/validation'
import { requireAdmin } from '@/lib/session'

export type SettingsResult = { ok: true } | { ok: false; error: string; key?: string }

type ErrorTranslator = (key: string, values?: { max: number }) => string

type PreparedSetting =
  | { ok: true; key: string; value: string }
  | { ok: false; key: string; error: string }

/** Validates and normalizes one setting without touching the database. */
function prepareSetting(key: string, rawValue: string, t: ErrorTranslator): PreparedSetting {
  let value = rawValue
  const trimmedKey = key.trim()
  if (!trimmedKey || trimmedKey.length > 64) {
    return { ok: false, key: trimmedKey, error: t('invalidSettingKey') }
  }
  if (trimmedKey === 'ogads.postbackUrl') {
    // Computed from the site URL and postback secret; never typed by hand.
    return { ok: false, key: trimmedKey, error: t('readOnlySetting') }
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
            return { ok: false, key: trimmedKey, error: t('invalidOgadsEndpoint') }
          }
        } catch {
          return { ok: false, key: trimmedKey, error: t('invalidOgadsEndpoint') }
        }
      }
    } else if (trimmedKey === 'ogads.offersShown') {
      if (value !== '') {
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
          return { ok: false, key: trimmedKey, error: t('invalidOgadsOffersShown') }
        }
        value = String(parsed)
      }
    } else if (trimmedKey === 'ogads.ctype') {
      if (value !== '') {
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 15) {
          return { ok: false, key: trimmedKey, error: t('invalidOgadsCtype') }
        }
        value = String(parsed)
      }
    } else if (trimmedKey === 'ogads.affiliateId') {
      if (value !== '' && !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
        return { ok: false, key: trimmedKey, error: t('invalidOgadsAffiliateId') }
      }
    } else if (trimmedKey === 'ogads.apiKey') {
      if (value !== '' && value.length < 8) {
        return { ok: false, key: trimmedKey, error: t('invalidOgadsApiKey') }
      }
    } else if (trimmedKey === 'ogads.postbackSecret') {
      if (value !== '' && value.length < 16) {
        return { ok: false, key: trimmedKey, error: t('invalidOgadsPostbackSecret') }
      }
    }
  }
  if (trimmedKey.startsWith('ops.')) {
    value = value.trim()
    if (trimmedKey === 'ops.gitBranch') {
      if (!/^[A-Za-z0-9._/-]{1,100}$/.test(value) || value.includes('..') || value.startsWith('-')) {
        return { ok: false, key: trimmedKey, error: t('invalidGitBranch') }
      }
    } else if (trimmedKey === 'ops.backupRetention') {
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        return { ok: false, key: trimmedKey, error: t('invalidBackupRetention') }
      }
      value = String(parsed)
    } else if (trimmedKey === 'ops.processManager') {
      if (value !== 'pm2' && value !== 'systemctl' && value !== 'none') {
        return { ok: false, key: trimmedKey, error: t('invalidProcessManager') }
      }
    } else if (trimmedKey === 'ops.processName') {
      if (!/^[A-Za-z0-9._@-]{1,100}$/.test(value)) {
        return { ok: false, key: trimmedKey, error: t('invalidProcessName') }
      }
    }
  }
  if (trimmedKey === 'unlock.stepHoldSeconds') {
    // Empty falls back to the shipped default; the value is whole seconds so
    // the field cannot hold a fraction the step timer would round away.
    value = value.trim()
    if (value === '') {
      value = String(DEFAULT_STEP_HOLD_SECONDS)
    } else {
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > STEP_HOLD_MAX_SECONDS) {
        return { ok: false, key: trimmedKey, error: t('invalidStepHold') }
      }
      value = String(parsed)
    }
  }
  if (trimmedKey.startsWith('theme.')) {
    const trimmedValue = value.trim()
    // Empty value = reset to the built-in default; otherwise it must be hex.
    if (trimmedValue !== '' && !sanitizeHex(trimmedValue)) {
      return { ok: false, key: trimmedKey, error: t('themeColorsHex') }
    }
    value = sanitizeHex(trimmedValue) ?? ''
  }
  if (trimmedKey === 'site.logoUrl' || trimmedKey === 'site.faviconUrl') {
    // Empty = built-in default; otherwise an uploaded media path or http(s) URL.
    const trimmedValue = value.trim()
    if (trimmedValue !== '' && !isMediaOrHttpUrl(trimmedValue)) {
      return { ok: false, key: trimmedKey, error: t('invalidImageUrl') }
    }
    value = trimmedValue
  }
  if (trimmedKey === 'site.logoIcon') {
    // Empty keeps the shipped built-in mark.
    const trimmedValue = value.trim()
    if (trimmedValue !== '' && !isBrandMarkIcon(trimmedValue)) {
      return { ok: false, key: trimmedKey, error: t('invalidBrandIcon') }
    }
    value = trimmedValue
  }
  if (trimmedKey === 'brand.color1' || trimmedKey === 'brand.color2') {
    // Empty inherits the surrounding text color.
    const trimmedValue = value.trim()
    if (trimmedValue !== '' && !sanitizeHex(trimmedValue)) {
      return { ok: false, key: trimmedKey, error: t('invalidHexColor') }
    }
    value = sanitizeHex(trimmedValue) ?? ''
  }
  if (trimmedKey === 'brand.splitChars') {
    const trimmedValue = value.trim() || '0'
    const parsed = Number(trimmedValue)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > BRAND_NAME_SPLIT_MAX) {
      return { ok: false, key: trimmedKey, error: t('invalidBrandSplit') }
    }
    value = String(parsed)
  }
  if (trimmedKey === 'brand.nameSize') {
    // Percentage of the name the surrounding surface already uses.
    const trimmedValue = value.trim() || String(BRAND_NAME_SIZE_DEFAULT)
    const parsed = Number(trimmedValue)
    if (!Number.isInteger(parsed) || parsed < BRAND_NAME_SIZE_MIN || parsed > BRAND_NAME_SIZE_MAX) {
      return { ok: false, key: trimmedKey, error: t('invalidBrandSize') }
    }
    value = String(parsed)
  }
  // Per-locale keys share the base key plus a `.locale` suffix.
  const isSiteKey = (base: string) =>
    trimmedKey === base || trimmedKey.startsWith(`${base}.`)
  if (isSiteKey('site.seoImage') || isSiteKey('site.seoIcon')) {
    const trimmedValue = value.trim()
    if (trimmedValue !== '' && !isMediaOrHttpUrl(trimmedValue)) {
      return { ok: false, key: trimmedKey, error: t('invalidImageUrl') }
    }
    value = trimmedValue
  }
  if (isSiteKey('site.name')) {
    // One stored name string, even though the panel edits it in two parts.
    value = value.trim().replace(/\s+/g, ' ')
    if (value.length > 80) {
      return { ok: false, key: trimmedKey, error: t('contentTooLong', { max: 80 }) }
    }
  }
  if (isSiteKey('site.seoTitle')) {
    value = value.trim().replace(/\s+/g, ' ')
    if (value.length > 120) {
      return { ok: false, key: trimmedKey, error: t('contentTooLong', { max: 120 }) }
    }
  }
  if (isSiteKey('site.seoDescription')) {
    value = value.trim().replace(/\s+/g, ' ')
    if (value.length > 320) {
      return { ok: false, key: trimmedKey, error: t('contentTooLong', { max: 320 }) }
    }
  }
  if (trimmedKey.startsWith('verification.')) {
    // The callback address is computed from the site URL, never typed by hand.
    if (trimmedKey === 'verification.oauthRedirectUrl') {
      return { ok: false, key: trimmedKey, error: t('readOnlySetting') }
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
      return { ok: false, key: trimmedKey, error: t('invalidWebhookUrl') }
    }
  }
  if (trimmedKey === 'ads.headScripts' || trimmedKey === 'ads.footerScripts') {
    // Custom snippets are pasted verbatim; only surrounding whitespace is
    // dropped so the injected code keeps its own formatting.
    value = value.trim()
  }
  const maxLength = trimmedKey.startsWith('content.')
    ? CONTENT_VALUE_MAX_LENGTH
    : trimmedKey === 'ads.headScripts' || trimmedKey === 'ads.footerScripts'
      ? SITE_CODE_MAX_LENGTH
      : 2000
  if (value.length > maxLength) {
    return { ok: false, key: trimmedKey, error: t('contentTooLong', { max: maxLength }) }
  }

  return { ok: true, key: trimmedKey, value }
}

async function errorTranslator(): Promise<ErrorTranslator> {
  const t = await getTranslations('errors')
  return t as unknown as ErrorTranslator
}

async function persistSetting(key: string, value: string) {
  await setSetting(key, value)
  await writeAudit({
    action: 'setting.update',
    targetType: 'setting',
    targetId: key,
    details: JSON.stringify({ length: value.length }),
  })
}

function revalidateSettings() {
  revalidatePath('/admin/settings', 'layout')
  revalidatePath('/admin/content')
  revalidatePath('/', 'layout')
}

export async function updateSetting(key: string, value: string): Promise<SettingsResult> {
  await requireAdmin()
  const prepared = prepareSetting(key, value, await errorTranslator())
  if (!prepared.ok) {
    return { ok: false, error: prepared.error }
  }
  await persistSetting(prepared.key, prepared.value)
  revalidateSettings()
  return { ok: true }
}

/**
 * Saves a whole settings page in one call. Every field is validated before any
 * write, so a rejected value never leaves the group half-saved.
 */
export async function updateSettings(
  entries: { key: string; value: string }[],
): Promise<SettingsResult> {
  await requireAdmin()
  if (entries.length === 0) {
    return { ok: true }
  }
  const t = await errorTranslator()
  const prepared: { key: string; value: string }[] = []
  for (const entry of entries) {
    const result = prepareSetting(entry.key, entry.value, t)
    if (!result.ok) {
      return { ok: false, error: result.error, key: result.key }
    }
    prepared.push({ key: result.key, value: result.value })
  }
  for (const entry of prepared) {
    await persistSetting(entry.key, entry.value)
  }
  revalidateSettings()
  return { ok: true }
}
