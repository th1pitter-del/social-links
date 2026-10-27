import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { SignUpForm } from '@/components/auth/sign-up-form'
import { getSession } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signUp')
  return { title: t('title') }
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }
  const t = await getTranslations('auth.signUp')

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <SignUpForm />
    </div>
  )
}
