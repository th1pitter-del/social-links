'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Copy, Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateSetting } from '@/lib/actions/admin-settings'
import { getSettingsGroup, settingsFieldKey } from './settings-config'

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
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const group = getSettingsGroup(groupId)
  if (!group) return null

  function save(key: string, value = values[key] ?? '') {
    setPendingKey(key)
    startTransition(async () => {
      const result = await updateSetting(key, value)
      setPendingKey(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      // A credential is never echoed back, so drop the typed value from local
      // state once the server has it instead of leaving it on screen.
      if (group?.fields.some((field) => field.key === key && field.secret)) {
        setValues((v) => ({ ...v, [key]: '' }))
      }
      toast.success(t('savedToast'))
      router.refresh()
    })
  }

  // Upload failures arrive as a stable code plus legacy English text; the code
  // lets this panel speak the visitor's locale, the text is the fallback.
  function uploadErrorMessage(data: { error?: string; code?: string; maxMb?: number }) {
    if (data.code && uploadT.has(data.code)) {
      return uploadT(data.code, { maxMb: data.maxMb ?? '' })
    }
    return t('imageUploadFailed')
  }

  async function uploadImage(key: string, file: File) {    setUploadingKey(key)
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
        {group.fields.map((field) => {
          const fieldKey = settingsFieldKey(field.key)
          const label = t(`fields.${fieldKey}.label`)
          const hasHint = t.has(`fields.${fieldKey}.hint`)
          const hasPlaceholder = t.has(`fields.${fieldKey}.placeholder`)
          const isConfigured = field.secret ? Boolean(configured[field.key]) : false
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
                      isConfigured
                        ? t('secretReplacePlaceholder')
                        : hasPlaceholder
                          ? t(`fields.${fieldKey}.placeholder`)
                          : undefined
                    }
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="flex-1 font-mono"
                  />
                  <Badge variant={isConfigured ? 'secondary' : 'outline'}>
                    {isConfigured ? t('secretConfigured') : t('secretNotConfigured')}
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
              {field.readonly ? null : (
                <div className="flex items-center justify-end gap-2 pt-1">
                  {field.secret && isConfigured ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pendingKey === field.key}
                      onClick={() => save(field.key, '')}
                    >
                      {t('secretRemove')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      pendingKey === field.key ||
                      (field.secret ? !(values[field.key] ?? '').trim() : false)
                    }
                    onClick={() => save(field.key)}
                  >
                    {pendingKey === field.key ? tc('saving') : tc('save')}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
