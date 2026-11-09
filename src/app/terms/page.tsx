import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { ContentPage } from '@/components/content-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getPageContent } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.terms')
  return { title: t('metaTitle'), description: t('intro'), alternates: { canonical: '/terms' } }
}

export default async function TermsPage() {
  const [content, t, locale] = await Promise.all([
    getPageContent('terms'),
    getTranslations('pages.terms'),
    getLocale(),
  ])

  return (
    <>
      <SiteHeader />
      <ContentPage
        kind="terms"
        title={t('title')}
        eyebrow={t('eyebrow')}
        intro={t('intro')}
        content={content}
        tocLabel={t('toc')}
        readTimeLabel={t('readTime')}
        updatedLabel={t('updated')}
        helpTitle={t('helpTitle')}
        helpBody={t('helpBody')}
        helpCta={t('helpCta')}
        locale={locale}
      />
      <SiteFooter />
    </>
  )
}
