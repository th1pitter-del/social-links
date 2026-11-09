import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { Markdown } from '@/components/markdown'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getPageContent } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.contact')
  return { title: t('metaTitle'), alternates: { canonical: '/contact' } }
}

export default async function ContactPage() {
  const [content, t] = await Promise.all([
    getPageContent('contact'),
    getTranslations('pages.contact'),
  ])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="mt-8">
          <Markdown content={content} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
