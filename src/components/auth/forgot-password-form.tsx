'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState)
  const t = useTranslations('auth.forgot')

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      {state.message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {state.message}
        </p>
      ) : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

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
