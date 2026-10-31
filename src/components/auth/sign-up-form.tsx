'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { AuthNotice, FieldErrorText } from '@/components/auth/auth-messages'
import { PasswordField } from '@/components/auth/password-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUpAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState)
  const t = useTranslations('auth.signUp')
  const [password, setPassword] = useState('')

  const nameError = state.fieldErrors?.name
  const emailError = state.fieldErrors?.email

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'name-error' : undefined}
        />
        <FieldErrorText id="name-error" message={nameError} />
      </div>

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

      <PasswordField
        id="password"
        name="password"
        label={t('password')}
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

      <p className="text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/sign-in" className="font-medium text-foreground hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </form>
  )
}
