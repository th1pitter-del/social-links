'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'

import { FieldErrorText } from '@/components/auth/auth-messages'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The password row shared by all three credential forms. Revealing the value is
 * the one affordance that pays for itself here: on a phone the obscured field is
 * where sign-in actually fails, and nothing about submitting changes.
 */
export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  error,
  action,
  minLength,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  error?: string
  /** Sits opposite the label, e.g. the forgot-password link. */
  action?: React.ReactNode
  minLength?: number
}) {
  const t = useTranslations('auth')
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          // Revealing only changes how the value is drawn; the field keeps its
          // autocomplete identity so password managers stay wired up.
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="pe-9"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? t('password.hide') : t('password.show')}
          // The field is only 32px tall, so the hit area grows past the icon with
          // a pseudo-element instead of pushing the label and hint apart. An
          // absolutely positioned box is already the ::after's containing block.
          className="absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-e-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring after:absolute after:-inset-1 after:content-['']"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldErrorText id={errorId} message={error} />
    </div>
  )
}
