import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LinkForm } from '@/components/link-form'
import { getEnabledActionOptions } from '@/lib/action-catalog'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta')
  return { title: t('newLink') }
}

export default async function NewLinkPage() {
  const t = await getTranslations('dashboard.newLink')
  const actionTypes = await getEnabledActionOptions()

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <LinkForm mode="create" centered actionTypes={actionTypes} />
    </div>
  )
}
