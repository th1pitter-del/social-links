'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { AuthNotice, FieldErrorText } from '@/components/auth/auth-messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState)
  const t = useTranslations('auth.forgot')
  const emailError = state.fieldErrors?.email

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        <FieldErrorText id="email-error" message={emailError} />
      </div>

      {/* The action answers the same way whether or not the address is registered,
          so this is the only confirmation the form can honestly show. */}
      {state.message ? <AuthNotice tone="success">{state.message}</AuthNotice> : null}
      {state.error ? <AuthNotice tone="error">{state.error}</AuthNotice> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          {t('back')}
        </Link>
      </p>
    </form>
  )
}
