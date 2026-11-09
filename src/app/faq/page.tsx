import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { ContentPage, parseSections } from '@/components/content-page'
import { JsonLd } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { markdownToText } from '@/lib/seo'
import { getPageContent } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.faq')
  return {
    title: t('metaTitle'),
    description: t('intro'),
    alternates: { canonical: '/faq' },
  }
}

export default async function FaqPage() {
  const [content, t, locale] = await Promise.all([
    getPageContent('faq'),
    getTranslations('pages.faq'),
    getLocale(),
  ])

  const questions = parseSections(content, 'faq').filter((section) => section.title)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: new Intl.Locale(locale).toString(),
    mainEntity: questions.map((section) => ({
      '@type': 'Question',
      name: section.title,
      acceptedAnswer: { '@type': 'Answer', text: markdownToText(section.body) },
    })),
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <ContentPage
        kind="faq"
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
