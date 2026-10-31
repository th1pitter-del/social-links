'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { updateSetting } from '@/lib/actions/admin-settings'
import { getSettingsGroup, settingsFieldKey } from './settings-config'

export function SettingsGroupForm({
  groupId,
  settings,
}: {
  groupId: string
  settings: Record<string, string>
}) {
  const router = useRouter()
  const t = useTranslations('admin.settings')
  const tc = useTranslations('admin.common')
  const [values, setValues] = useState<Record<string, string>>(settings)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const group = getSettingsGroup(groupId)
  if (!group) return null

  function save(key: string) {
    setPendingKey(key)
    startTransition(async () => {
      const result = await updateSetting(key, values[key] ?? '')
      setPendingKey(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('savedToast'))
      router.refresh()
    })
  }

  async function uploadImage(key: string, file: File) {
    setUploadingKey(key)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Upload failed')
      }
      setValues((v) => ({ ...v, [key]: data.url as string }))
      toast.success(t('imageUploadedToast'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('imageUploadFailed'))
    } finally {
      setUploadingKey(null)
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
          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{label}</Label>
              {field.color ? (
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
                      accept="image/png,image/jpeg,image/webp,image/gif"
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
              <div className="flex items-center justify-between pt-1">
                <code className="text-xs text-muted-foreground">{field.key}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pendingKey === field.key}
                  onClick={() => save(field.key)}
                >
                  {pendingKey === field.key ? tc('saving') : tc('save')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
