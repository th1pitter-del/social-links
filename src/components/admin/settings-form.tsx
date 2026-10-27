'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [, startTransition] = useTransition()

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
