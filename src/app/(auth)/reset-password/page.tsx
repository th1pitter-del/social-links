import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.reset')
  return { title: t('title') }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const t = await getTranslations('auth.reset')

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <ResetPasswordForm token={token ?? ''} />
    </div>
  )
}
