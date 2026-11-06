import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { ContentPage } from '@/components/content-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getPageContent } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.privacy')
  return { title: t('metaTitle'), description: t('intro') }
}

export default async function PrivacyPage() {
  const [content, t, locale] = await Promise.all([
    getPageContent('privacy'),
    getTranslations('pages.privacy'),
    getLocale(),
  ])

  return (
    <>
      <SiteHeader />
      <ContentPage
        kind="privacy"
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
