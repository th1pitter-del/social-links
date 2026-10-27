'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function SignInForm({ redirectTo, reset }: { redirectTo?: string; reset?: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState)
  const t = useTranslations('auth.signIn')

  return (
    <form action={formAction} className="space-y-5">
      {reset ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {t('resetSuccess')}
        </p>
      ) : null}

      <input type="hidden" name="redirectTo" value={redirectTo ?? '/dashboard'} />

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('password')}</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            {t('forgot')}
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {state.fieldErrors?.password ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/sign-up" className="font-medium text-foreground hover:underline">
          {t('createAccount')}
        </Link>
      </p>
    </form>
  )
}
