import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { SignInForm } from '@/components/auth/sign-in-form'
import { getSession, homePathForRole } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signIn')
  return { title: t('title') }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string }>
}) {
  const { redirect: redirectTo, reset } = await searchParams
  const session = await getSession()
  if (session) {
    // Only follow same-site relative targets from the query string.
    const target =
      redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : homePathForRole(session.user.role)
    redirect(target)
  }
  const t = await getTranslations('auth.signIn')

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <SignInForm redirectTo={redirectTo} reset={reset === '1'} />
    </div>
  )
}
