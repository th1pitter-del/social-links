import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.forgot')
  return { title: t('title') }
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth.forgot')

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  )
}
