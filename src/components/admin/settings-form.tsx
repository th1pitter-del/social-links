'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Copy, Info, Loader2, ShieldAlert, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateSettings } from '@/lib/actions/admin-settings'
import { getSettingsGroup, settingsFieldKey, type SettingsField } from './settings-config'

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
  const [pending, startTransition] = useTransition()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const group = getSettingsGroup(groupId)
  if (!group) return null

  const fields = group.fieldsHidden ? [] : group.fields
  const dirty = fields.filter((field) => isDirty(field, values, saved, removeSecrets))

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
        const target = result.key ? document.getElementById(result.key) : null
        target?.focus()
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
  }

  function toggleRemoveSecret(key: string) {
    setRemoveSecrets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
    setValues((current) => ({ ...current, [key]: '' }))
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
        {fields.map((field) => {
          const fieldKey = settingsFieldKey(field.key)
          const label = t(`fields.${fieldKey}.label`)
          const hasHint = t.has(`fields.${fieldKey}.hint`)
          const hasPlaceholder = t.has(`fields.${fieldKey}.placeholder`)
          const isConfigured = field.secret ? Boolean(configuredKeys[field.key]) : false
          const removing = field.secret && removeSecrets.includes(field.key)
          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{label}</Label>
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
              ) : field.color ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={label}
                    value={/^#[0-9a-fA-F]{6}$/.test(values[field.key] ?? '')
                      ? (values[field.key] as string)
                      : '#000000'}
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
        })}
      </div>
      {fields.length > 0 ? (
        <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-4 rounded-b-xl border-t border-border bg-card/95 px-5 py-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {dirty.length > 0 ? t('unsavedChanges', { count: dirty.length }) : t('allSaved')}
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
