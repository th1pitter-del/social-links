'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles } from 'lucide-react'

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

  function applyDemoCredential(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <form action={formAction} className="space-y-5">
      {reset ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {t('resetSuccess')}
        </p>
      ) : null}

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
        />
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
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {state.fieldErrors?.password ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

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
