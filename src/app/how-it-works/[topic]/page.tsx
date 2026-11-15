import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { MarketingPage } from '@/components/marketing-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { HOW_IT_WORKS_TOPICS, readCard, readSections, topicHref } from '@/lib/marketing'
import { pageMetadata } from '@/lib/seo'

type PageProps = { params: Promise<{ topic: string }> }

export function generateStaticParams() {
  return HOW_IT_WORKS_TOPICS.map((topic) => ({ topic: topic.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params
  const found = HOW_IT_WORKS_TOPICS.find((item) => item.slug === topic)
  if (!found) return {}
  const t = await getTranslations('pages.howItWorks')
  return pageMetadata({
    title: t(`topics.${found.key}.metaTitle`),
    description: t(`topics.${found.key}.metaDescription`),
    path: `/how-it-works/${found.slug}`,
  })
}

export default async function HowItWorksTopicPage({ params }: PageProps) {
  const { topic } = await params
  const found = HOW_IT_WORKS_TOPICS.find((item) => item.slug === topic)
  if (!found) notFound()

  const [t, nav, m] = await Promise.all([
    getTranslations('pages.howItWorks'),
    getTranslations('nav'),
    getTranslations('pages.marketing'),
  ])

  const related = HOW_IT_WORKS_TOPICS.filter((item) => item.key !== found.key).map((item) => ({
    href: topicHref('how-it-works', item),
    label: nav(item.navKey),
    body: readCard(t.raw(`cards.${item.key}`)).body,
    icon: item.icon,
  }))

  return (
    <>
      <SiteHeader />
      <MarketingPage
        eyebrow={t(`topics.${found.key}.eyebrow`)}
        title={t(`topics.${found.key}.title`)}
        intro={t(`topics.${found.key}.intro`)}
        sections={readSections(t.raw(`topics.${found.key}.sections`))}
        related={related}
        relatedLabel={m('relatedLabel')}
        back={{ href: '/how-it-works', label: nav('howItWorks') }}
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
