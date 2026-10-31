'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { AuthNotice } from '@/components/auth/auth-messages'
import { PasswordField } from '@/components/auth/password-field'
import { Button } from '@/components/ui/button'
import { resetPasswordAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState)
  const t = useTranslations('auth.reset')
  const [password, setPassword] = useState('')

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <AuthNotice tone="error">{t('invalid')}</AuthNotice>
        <Button asChild variant="outline">
          <Link href="/forgot-password">{t('requestNew')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <PasswordField
        id="password"
        name="password"
        label={t('newPassword')}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={8}
        hint={t('passwordHint')}
        error={state.fieldErrors?.password}
      />

      {state.error ? <AuthNotice tone="error">{state.error}</AuthNotice> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>
    </form>
  )
}
