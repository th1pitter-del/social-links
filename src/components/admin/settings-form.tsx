'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Copy, Info, Loader2, ShieldAlert, Upload } from 'lucide-react'
import { cn } from 'cn'

import { BrandMark, BrandName } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import { BRAND_MARK_ICONS } from '@/lib/brand-mark-icons'
import { composeBrandName, splitBrandName, type BrandNameStyle } from '@/lib/brand-name'
import { updateSettings } from '@/lib/actions/admin-settings'
import {
  getSettingsGroup,
  localizedSettingsKey,
  settingsFieldKey,
  type SettingsField,
} from './settings-config'

type NameParts = Record<string, { first: string; second: string }>

function seedNameParts(groupId: string, values: Record<string, string>): NameParts {
  const group = getSettingsGroup(groupId)
  const splitChars = Number(values['brand.splitChars']) || 0
  const parts: NameParts = {}
  for (const field of group?.localizedFields ?? []) {
    if (!field.brandName) continue
    for (const locale of locales) {
      const key = localizedSettingsKey(field.key, locale)
      parts[key] = splitBrandName(values[key] ?? '', splitChars)
    }
  }
  return parts
}

export function SettingsGroupForm({
  groupId,
  settings,
  configured = {},
}: {
  groupId: string
  settings: Record<string, string>
  configured?: Record<string, boolean>
}) {
  const router = useRouter()
  const t = useTranslations('admin.settings')
  const tc = useTranslations('admin.common')
  const uploadT = useTranslations('uploads.errors')
  const [values, setValues] = useState<Record<string, string>>(settings)
  // The last persisted state; a field is dirty while it differs from this.
  const [saved, setSaved] = useState<Record<string, string>>(settings)
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>(configured)
  // A stored secret is never prefilled, so clearing it needs an explicit mark.
  const [removeSecrets, setRemoveSecrets] = useState<string[]>([])
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)
  // Edited halves of the composed site name, kept apart so a space typed in the
  // first part does not immediately move the word to the second input.
  const [nameParts, setNameParts] = useState<NameParts>(() => seedNameParts(groupId, settings))
  const [pending, startTransition] = useTransition()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const group = getSettingsGroup(groupId)
  const fields = group?.fieldsHidden ? [] : (group?.fields ?? [])
  const localizedFields = group?.localizedFields ?? []
  const fieldInstances: SettingsField[] = [
    ...fields,
    ...locales.flatMap((locale) =>
      localizedFields.map((field) => ({
        ...field,
        key: localizedSettingsKey(field.key, locale),
      })),
    ),
  ]
  const dirty = fieldInstances.filter((field) =>
    isDirty(field, values, saved, removeSecrets),
  )

  const previewBrand: BrandNameStyle = {
    color1: values['brand.color1'] ?? '',
    color2: values['brand.color2'] ?? '',
    splitChars: Number(values['brand.splitChars']) || 0,
  }

  if (!group) return null

  // A rejected field may live in a tab that is not open. The tab state changes
  // first, so the field is focused on a later frame once it is in the DOM.
  function focusField(key: string, tries = 3) {
    requestAnimationFrame(() => {
      const target = document.getElementById(key) ?? document.getElementById(`${key}-first`)
      if (!target) {
        if (tries > 0) focusField(key, tries - 1)
        return
      }
      target.focus()
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  function localeDirty(locale: Locale) {
    return localizedFields.some((field) =>
      isDirty(
        { ...field, key: localizedSettingsKey(field.key, locale) },
        values,
        saved,
        removeSecrets,
      ),
    )
  }

  function saveAll() {
    const changes = dirty.map((field) => ({
      key: field.key,
      value: field.secret && removeSecrets.includes(field.key) ? '' : values[field.key] ?? '',
    }))
    if (changes.length === 0) return
    startTransition(async () => {
      const result = await updateSettings(changes)
      if (!result.ok) {
        toast.error(result.error)
        if (result.key) {
          const errorLocale = locales.find((locale) =>
            localizedFields.some(
              (field) => localizedSettingsKey(field.key, locale) === result.key,
            ),
          )
          if (errorLocale) setActiveLocale(errorLocale)
          focusField(result.key)
        }
        return
      }
      const nextSaved = { ...saved }
      const nextConfigured = { ...configuredKeys }
      const writeOnly: string[] = []
      for (const change of changes) {
        const field = dirty.find((item) => item.key === change.key)
        if (field?.secret) {
          // Write-only: record whether one exists, never keep what was typed.
          nextSaved[change.key] = ''
          nextConfigured[change.key] = Boolean(change.value.trim())
          writeOnly.push(change.key)
        } else {
          nextSaved[change.key] = change.value
        }
      }
      setSaved(nextSaved)
      setConfiguredKeys(nextConfigured)
      setRemoveSecrets([])
      setValues((current) => {
        const next = { ...current }
        for (const key of writeOnly) next[key] = ''
        return next
      })
      toast.success(t('savedToast'))
      router.refresh()
    })
  }

  function discard() {
    setValues(saved)
    setRemoveSecrets([])
    setNameParts(seedNameParts(groupId, saved))
  }

  function toggleRemoveSecret(key: string) {
    setRemoveSecrets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
    setValues((current) => ({ ...current, [key]: '' }))
  }

  function changeNamePart(key: string, part: 'first' | 'second', text: string) {
    const current = nameParts[key] ?? splitBrandName(values[key] ?? '', 0)
    const next = { ...current, [part]: text }
    setNameParts((all) => ({ ...all, [key]: next }))
    setValues((all) => ({ ...all, [key]: composeBrandName(next.first, next.second) }))
  }

  // Upload failures arrive as a stable code plus legacy English text; the code
  // lets this panel speak the visitor's locale, the text is the fallback.
  function uploadErrorMessage(data: { error?: string; code?: string; maxMb?: number }) {
    if (data.code && uploadT.has(data.code)) {
      return uploadT(data.code, { maxMb: data.maxMb ?? '' })
    }
    return t('imageUploadFailed')
  }

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const data = (await response.json()) as {
        url?: string
        error?: string
        code?: string
        maxMb?: number
      }
      if (!response.ok || !data.url) {
        toast.error(uploadErrorMessage(data))
        return
      }
      setValues((v) => ({ ...v, [key]: data.url as string }))
      toast.success(t('imageUploadedToast'))
    } catch {
      toast.error(t('imageUploadFailed'))
    } finally {
      setUploadingKey(null)
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('copiedToast'))
    } catch {
      toast.error(t('copyFailedToast'))
    }
  }

  // Shared color/name-length controls, drawn inside the site-name block so the
  // live preview sits next to what changes it. Stored once for every language.
  function renderColorControl(key: string) {
    const value = values[key] ?? ''
    const label = t(`fields.${settingsFieldKey(key)}.label`)
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          title={label}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#d5ff2f'}
          onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))}
          className="size-8 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <Input
          id={key}
          className="h-8 max-w-28 font-mono text-xs"
          value={value}
          placeholder="#d5ff2f"
          onChange={(event) => setValues((v) => ({ ...v, [key]: event.target.value }))}
        />
      </div>
    )
  }

  function renderBrandName(field: SettingsField) {
    const parts = nameParts[field.key] ?? splitBrandName(values[field.key] ?? '', 0)
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor={`${field.key}-first`}
              className="text-xs text-muted-foreground"
            >
              {t('fields.site_name.part1')}
            </Label>
            <Input
              id={`${field.key}-first`}
              value={parts.first}
              onChange={(event) => changeNamePart(field.key, 'first', event.target.value)}
            />
            <span className="block text-[11px] text-muted-foreground">
              {t('fields.brand_color1.label')}
            </span>
            {renderColorControl('brand.color1')}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${field.key}-second`}
              className="text-xs text-muted-foreground"
            >
              {t('fields.site_name.part2')}
            </Label>
            <Input
              id={`${field.key}-second`}
              value={parts.second}
              onChange={(event) => changeNamePart(field.key, 'second', event.target.value)}
            />
            <span className="block text-[11px] text-muted-foreground">
              {t('fields.brand_color2.label')}
            </span>
            {renderColorControl('brand.color2')}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand.splitChars" className="text-xs text-muted-foreground">
            {t('fields.brand_splitChars.label')}
          </Label>
          <Input
            id="brand.splitChars"
            type="number"
            min={0}
            step={1}
            className="h-8 max-w-24"
            value={values['brand.splitChars'] ?? ''}
            placeholder="0"
            onChange={(event) =>
              setValues((v) => ({ ...v, 'brand.splitChars': event.target.value }))
            }
          />
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <BrandMark
            className="size-7 shrink-0"
            src={values['site.logoUrl'] || null}
            icon={values['site.logoIcon']}
          />
          <BrandName
            name={values[field.key] ?? ''}
            brand={previewBrand}
            className="min-w-0 truncate text-base font-semibold"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('fields.site_name.colorsHint')}</p>
      </div>
    )
  }

  function renderIconPicker(field: SettingsField) {
    const selected = values[field.key] ?? ''
    const label = t(`fields.${settingsFieldKey(field.key)}.label`)
    const optionClass = (active: boolean) =>
      cn(
        'flex size-9 items-center justify-center rounded-md border transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )
    return (
      <div className="space-y-2">
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <BrandMark
            className="size-8 shrink-0"
            src={values['site.logoUrl'] || null}
            icon={selected}
          />
          <BrandName
            name={values['site.name'] ?? ''}
            brand={previewBrand}
            className="min-w-0 truncate font-semibold"
          />
        </div>
        <div
          className="grid grid-cols-6 gap-1.5 sm:grid-cols-8"
          role="radiogroup"
          aria-label={label}
        >
          <button
            type="button"
            role="radio"
            aria-checked={selected === ''}
            aria-label={t('brandIcons.classic')}
            title={t('brandIcons.classic')}
            onClick={() => setValues((v) => ({ ...v, [field.key]: '' }))}
            className={optionClass(selected === '')}
          >
            <BrandMark className="size-6" />
          </button>
          {BRAND_MARK_ICONS.map((entry) => {
            const Icon = entry.icon
            const active = selected === entry.key
            return (
              <button
                key={entry.key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(`brandIcons.${entry.key}`)}
                title={t(`brandIcons.${entry.key}`)}
                onClick={() => setValues((v) => ({ ...v, [field.key]: entry.key }))}
                className={optionClass(active)}
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-3.5" strokeWidth={2.4} />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderField(field: SettingsField) {
    const fieldKey = settingsFieldKey(field.key)
    const label = t(`fields.${fieldKey}.label`)
    const hasHint = t.has(`fields.${fieldKey}.hint`)
    const hasPlaceholder = t.has(`fields.${fieldKey}.placeholder`)
    const isConfigured = field.secret ? Boolean(configuredKeys[field.key]) : false
    const removing = field.secret && removeSecrets.includes(field.key)
    return (
      <div key={field.key} className="space-y-1.5">
        <Label htmlFor={field.brandName || field.iconPicker ? undefined : field.key}>
          {label}
        </Label>
        {field.readonly ? (
          <div className="flex items-center gap-2">
            <Input
              id={field.key}
              readOnly
              value={values[field.key] ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              placeholder={hasPlaceholder ? t(`fields.${fieldKey}.placeholder`) : undefined}
              className="flex-1 font-mono text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0"
              aria-label={t('copy')}
              title={t('copy')}
              disabled={!values[field.key]}
              onClick={() => void copyText(values[field.key] ?? '')}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        ) : field.brandName ? (
          renderBrandName(field)
        ) : field.iconPicker ? (
          renderIconPicker(field)
        ) : field.color ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={label}
              value={/^#[0-9a-fA-F]{6}$/.test(values[field.key] ?? '')
                ? (values[field.key] as string)
                : '#d5ff2f'}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
            />
            <Input
              id={field.key}
              className="max-w-40 font-mono"
              value={values[field.key] ?? ''}
              placeholder="#d5ff2f"
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ) : field.toggle ? (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id={field.key}
              checked={values[field.key] === 'true'}
              onCheckedChange={(checked) =>
                setValues((v) => ({ ...v, [field.key]: checked ? 'true' : 'false' }))
              }
            />
            <span className="text-sm text-muted-foreground">
              {values[field.key] === 'true' ? tc('enabled') : tc('disabled')}
            </span>
          </div>
        ) : field.secret ? (
          <div className="flex items-center gap-2">
            <Input
              id={field.key}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={values[field.key] ?? ''}
              placeholder={
                isConfigured && !removing
                  ? t('secretReplacePlaceholder')
                  : hasPlaceholder
                    ? t(`fields.${fieldKey}.placeholder`)
                    : undefined
              }
              onChange={(e) => {
                setValues((v) => ({ ...v, [field.key]: e.target.value }))
                setRemoveSecrets((current) => current.filter((item) => item !== field.key))
              }}
              className="flex-1 font-mono"
            />
            <Badge variant={removing ? 'outline' : isConfigured ? 'secondary' : 'outline'}>
              {removing
                ? t('secretWillRemove')
                : isConfigured
                  ? t('secretConfigured')
                  : t('secretNotConfigured')}
            </Badge>
          </div>
        ) : field.image ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {values[field.key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values[field.key]}
                  alt=""
                  className="size-9 shrink-0 rounded-md border object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <Input
                id={field.key}
                value={values[field.key] ?? ''}
                placeholder={hasPlaceholder ? t(`fields.${fieldKey}.placeholder`) : undefined}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
              <input
                ref={(el) => {
                  fileInputs.current[field.key] = el
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadImage(field.key, file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="shrink-0"
                aria-label={t('uploadImage')}
                title={t('uploadImage')}
                disabled={uploadingKey === field.key}
                onClick={() => fileInputs.current[field.key]?.click()}
              >
                {uploadingKey === field.key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ) : field.integer ? (
          <Input
            id={field.key}
            type="number"
            min={0}
            step={1}
            value={values[field.key] ?? ''}
            placeholder={hasPlaceholder ? t(`fields.${fieldKey}.placeholder`) : undefined}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            className="max-w-32"
          />
        ) : field.multiline ? (
          <Textarea
            id={field.key}
            rows={3}
            value={values[field.key] ?? ''}
            placeholder={hasPlaceholder ? t(`fields.${fieldKey}.placeholder`) : undefined}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
          />
        ) : (
          <Input
            id={field.key}
            value={values[field.key] ?? ''}
            placeholder={hasPlaceholder ? t(`fields.${fieldKey}.placeholder`) : undefined}
            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
          />
        )}
        {hasHint ? (
          <p className="text-xs text-muted-foreground">{t(`fields.${fieldKey}.hint`)}</p>
        ) : null}
        {field.secret && isConfigured ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => toggleRemoveSecret(field.key)}
            >
              {removing ? t('secretKeep') : t('secretRemove')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-4">
        {group.notice ? (
          <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{t(`groups.${groupId}.notice.title`)}</p>
              <p className="text-foreground/85">{t(`groups.${groupId}.notice.body`)}</p>
            </div>
          </div>
        ) : null}
        {groupId === 'system-ops' ? (
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-warning" aria-hidden="true" />
            <p className="text-sm text-amber-800 dark:text-warning">{t('groups.system-ops.warning')}</p>
          </div>
        ) : null}

        {localizedFields.length > 0 ? (
          <Tabs
            value={activeLocale}
            onValueChange={(value) => setActiveLocale(value as Locale)}
            className="gap-4"
          >
            <div className="space-y-1.5">
              <TabsList
                aria-label={t('localized.label')}
                className="h-auto w-full justify-start overflow-x-auto p-1"
              >
                {locales.map((locale) => (
                  <TabsTrigger
                    key={locale}
                    value={locale}
                    className="flex-none gap-1.5 px-3 py-1.5"
                  >
                    {t(`localeNames.${locale}`)}
                    {localeDirty(locale) ? (
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              <p className="text-xs text-muted-foreground">{t('localized.hint')}</p>
            </div>
            {locales.map((locale) => (
              <TabsContent key={locale} value={locale} className="space-y-4">
                {localizedFields.map((field) =>
                  renderField({
                    ...field,
                    key: localizedSettingsKey(field.key, locale),
                  }),
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : null}

        {localizedFields.length > 0 && fields.length > 0 ? (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t('brandSection')}
            </p>
          </div>
        ) : null}

        {fields.filter((field) => !field.embedded).map(renderField)}
      </div>
      {fieldInstances.length > 0 ? (
        <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-4 rounded-b-xl border-t border-border bg-card/95 px-5 py-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {dirty.length > 0
                ? t('unsavedChanges', { count: dirty.length })
                : t('allSaved')}
            </p>
            <div className="ms-auto flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending || dirty.length === 0}
                onClick={discard}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || dirty.length === 0}
                onClick={saveAll}
              >
                {pending ? tc('saving') : tc('save')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function isDirty(
  field: SettingsField,
  values: Record<string, string>,
  saved: Record<string, string>,
  removeSecrets: string[],
) {
  if (field.readonly) return false
  if (field.secret && removeSecrets.includes(field.key)) return true
  return (values[field.key] ?? '') !== (saved[field.key] ?? '')
}
