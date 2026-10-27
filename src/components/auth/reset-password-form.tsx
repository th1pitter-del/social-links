'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordAction, type AuthFormState } from '@/lib/actions/auth'

const initialState: AuthFormState = {}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState)
  const t = useTranslations('auth.reset')

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t('invalid')}</p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">{t('requestNew')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        {state.fieldErrors?.password ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>
    </form>
  )
}
