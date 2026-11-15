import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MarketingPage } from '@/components/marketing-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { HOW_IT_WORKS_TOPICS, readCard, topicHref } from '@/lib/marketing'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.howItWorks')
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/how-it-works',
  })
}

export default async function HowItWorksPage() {
  const [t, nav, m] = await Promise.all([
    getTranslations('pages.howItWorks'),
    getTranslations('nav'),
    getTranslations('pages.marketing'),
  ])

  const cards = HOW_IT_WORKS_TOPICS.map((topic) => ({
    href: topicHref('how-it-works', topic),
    label: nav(topic.navKey),
    body: readCard(t.raw(`cards.${topic.key}`)).body,
    icon: topic.icon,
  }))

  return (
    <>
      <SiteHeader />
      <MarketingPage
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        cards={cards}
        cardCta={m('cardCta')}
        cta={{
          title: m('ctaTitle'),
          body: m('ctaBody'),
          button: m('ctaButton'),
        }}
      />
      <SiteFooter />
    </>
  )
}
