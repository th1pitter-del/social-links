import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'

export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  )
}
