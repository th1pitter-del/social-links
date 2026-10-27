import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Markdown } from '@/components/markdown'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getPageContent } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.faq')
  return { title: t('metaTitle') }
}

export default async function FaqPage() {
  const [content, t] = await Promise.all([getPageContent('faq'), getTranslations('pages.faq')])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="mt-10">
          <Markdown content={content} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
