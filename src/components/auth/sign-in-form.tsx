'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'

import { AuthNotice, FieldErrorText } from '@/components/auth/auth-messages'
import { PasswordField } from '@/components/auth/password-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function SignInForm({
  redirectTo,
  reset,
  demo,
}: {
  redirectTo?: string
  reset?: boolean
  demo?: { label: string; email: string; password: string } | null
}) {
  const [state, formAction, pending] = useActionState(signInAction, initialState)
  const t = useTranslations('auth.signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const emailError = state.fieldErrors?.email

  function applyDemoCredential(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <form action={formAction} className="space-y-5">
      {reset ? <AuthNotice tone="success">{t('resetSuccess')}</AuthNotice> : null}

      {/* Empty means "no explicit target" so the action can land by role. */}
      <input type="hidden" name="redirectTo" value={redirectTo ?? ''} />

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        autoComplete="current-password"
        error={state.fieldErrors?.password}
        action={
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('forgot')}
          </Link>
        }
      />

      {state.error ? <AuthNotice tone="error">{state.error}</AuthNotice> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>

      {demo ? (
        <div className="rounded-lg border border-dashed p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            {t('demoTitle')}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium">{demo.label}</p>
              <p className="truncate text-muted-foreground">{demo.email}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyDemoCredential(demo.email, demo.password)}
            >
              {t('demoUse')}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('demoHint')}</p>
        </div>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/sign-up" className="font-medium text-foreground hover:underline">
          {t('createAccount')}
        </Link>
      </p>
    </form>
  )
}
