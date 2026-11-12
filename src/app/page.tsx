import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BadgeCheck,
} from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { BrandIcon } from '@/components/brand-icon'
import { Button } from '@/components/ui/button'
import { AdSlot } from '@/components/ads/ad-slot'
import { AnalyticsSpotlight } from '@/components/home/analytics-spotlight'
import { BioLinksHero } from '@/components/home/bio-links-hero'
import { FeatureSwitcher } from '@/components/home/feature-switcher'
import { FlowPanel } from '@/components/home/flow-panel'
import { LeadsSpotlight } from '@/components/home/leads-spotlight'
import { PlatformShowcase, type ShowcasePlatform } from '@/components/home/platform-showcase'
import { JsonLd } from '@/components/json-ld'
import { StepRail } from '@/components/home/step-rail'
import { UnlockDemo, type DemoStep } from '@/components/home/unlock-demo'
import { Reveal } from '@/components/motion/reveal'
import { getSession } from '@/lib/session'
import { getEnabledPlatforms } from '@/lib/action-catalog'
import { actionLabel, platformLabel } from '@/lib/action-label'
import { formatNumber } from '@/lib/format'
import { SITE_URL } from '@/lib/seo'
import { getSiteSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { alternates: { canonical: '/' } }

// Scattered marks behind the closing ask. Fixed positions so the band is the
// same on every render; kept off the centre line where the headline sits.
const CTA_GLYPHS = [
  { platform: 'youtube', className: 'absolute top-[16%] left-[5%] size-7 sm:size-9' },
  { platform: 'instagram', className: 'absolute top-[62%] left-[12%] size-6 sm:size-8' },
  { platform: 'tiktok', className: 'absolute top-[10%] left-[24%] size-5 sm:size-7' },
  { platform: 'x', className: 'absolute bottom-[14%] left-[30%] size-5 sm:size-6' },
  { platform: 'discord', className: 'absolute top-[18%] right-[7%] size-7 sm:size-9' },
  { platform: 'facebook', className: 'absolute top-[60%] right-[14%] size-6 sm:size-8' },
  { platform: 'spotify', className: 'absolute top-[9%] right-[25%] size-5 sm:size-7' },
  { platform: 'twitch', className: 'absolute right-[31%] bottom-[12%] size-5 sm:size-6' },
  { platform: 'telegram', className: 'absolute top-[44%] left-[2%] size-5 sm:size-6' },
  { platform: 'snapchat', className: 'absolute top-[42%] right-[3%] size-5 sm:size-6' },
  { platform: 'reddit', className: 'absolute top-[7%] left-[43%] size-4 sm:size-5' },
  { platform: 'pinterest', className: 'absolute right-[44%] bottom-[8%] size-4 sm:size-5' },
]

/**
 * The homepage demonstrates the product instead of only describing it: the hero
 * runs the real unlock card through its phases, the platform picker and the
 * feature previewer swap their panel under the pointer, and the flow's claims
 * walk the diagram they belong to. Identity, palette and components are the ones
 * already in docs/design-spec.md - the motion is additive, gated on
 * prefers-reduced-motion, and never replaces the text it animates.
 */
export default async function HomePage() {
  const [
    t,
    nav,
    common,
    unlockCopy,
    actionCopy,
    platformCopy,
    meta,
    site,
    session,
    platformRows,
    locale,
  ] = await Promise.all([
      getTranslations('home'),
      getTranslations('nav'),
      getTranslations('common'),
      getTranslations('unlock'),
      getTranslations('actions'),
      getTranslations('platforms'),
      getTranslations('meta'),
      getSiteSettings(),
      getSession(),
      getEnabledPlatforms(),
      getLocale(),
    ])
  const signedIn = Boolean(session)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: site.name,
    url: SITE_URL,
    description: site.hasCustomTagline ? site.tagline : meta('description'),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    inLanguage: new Intl.Locale(locale).toString(),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  // The hero walks four actions, each from a different platform, so the card
  // shows the breadth of the catalog at a glance.
  const steps: DemoStep[] = [
    { label: actionCopy('YOUTUBE_COMMENT'), platform: 'youtube', icon: 'message' },
    { label: actionCopy('DISCORD_JOIN'), platform: 'discord', icon: 'users' },
    { label: actionCopy('INSTAGRAM_FOLLOW'), platform: 'instagram', icon: 'user_plus' },
    { label: actionCopy('SPOTIFY_TRACK'), platform: 'spotify', icon: 'music' },
  ]

  const platforms: ShowcasePlatform[] = platformRows.map((platform) => ({
    key: platform.key,
    label: platformLabel(platform, platformCopy),
    icon: platform.icon,
    actions: platform.actionOptions.map((option) => ({
      key: option.key,
      label: actionLabel(option, actionCopy),
      icon: option.icon,
    })),
  }))

  const stats = [
    { value: t('stats.creatorsValue'), label: t('stats.creatorsLabel') },
    { value: t('stats.unlocksValue'), label: t('stats.unlocksLabel') },
    // Counted, not written: this is the same set of enabled platforms the picker
    // below lists, so an admin switching one on moves this number.
    { value: formatNumber(locale, platforms.length), label: t('stats.platformsLabel') },
  ]

  const flowNodes = [
    { label: t('flow.nodes.visitor'), detail: t('flow.nodes.visitorDetail') },
    { label: t('flow.nodes.action'), detail: t('flow.nodes.actionDetail') },
    { label: t('flow.nodes.verify'), detail: t('flow.nodes.verifyDetail') },
    { label: t('flow.nodes.deliver'), detail: t('flow.nodes.deliverDetail') },
  ]

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />

      <main className="flex-1">
        <AdSlot placement="home-top" className="mx-auto w-full max-w-[1200px] px-4 pt-6" />
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(201,247,42,0.18),transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
          />
          <div className="mx-auto w-full max-w-[1200px] px-4 pt-16 pb-20 sm:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="max-w-3xl">
                <span
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards"
                >
                  <BadgeCheck className="size-3.5 text-accent-text" />
                  {t('badge')}
                </span>
                <h1
                  className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-backwards motion-safe:duration-700"
                >
                  {t('titleBefore')}{' '}
                  <span className="bg-gradient-to-r from-[#4f6208] via-[#66800e] to-[#7a9412] bg-clip-text text-transparent dark:from-[#e8ff91] dark:via-[#d5ff2f] dark:to-[#c5f522]">
                    {t('titleHighlight')}
                  </span>
                  {t('titleAfter')}
                </h1>
                <p
                  className="mt-6 max-w-2xl text-lg text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-backwards motion-safe:duration-700 motion-safe:[animation-delay:80ms]"
                >
                  {t('subtitle')}
                </p>
                <p
                  className="mt-3 text-sm font-medium text-accent-text motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards motion-safe:[animation-delay:160ms]"
                >
                  {t('firstLinkFree')}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards motion-safe:[animation-delay:240ms]">
                  <Button size="lg" asChild>
                    <Link href={signedIn ? '/dashboard/links/new' : '/create'}>
                      {signedIn ? common('createLink') : t('createFirstLink')}
                      <ArrowRight className="rtl:rotate-180" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href={signedIn ? '/dashboard' : '/sign-in'}>
                      {signedIn ? common('dashboard') : t('signInCta')}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* A modest inset rather than a hard phone-shaped cap: the card
                  keeps most of its column and only tightens a little below `lg`. */}
              <div className="mx-auto w-full max-w-[22rem] sm:max-w-[38rem] lg:max-w-none">
                <UnlockDemo
                  steps={steps}
                  linkTitle={t('demo.linkTitle')}
                  linkBody={t('demo.linkBody')}
                  creator={t('demo.creator')}
                  demoTag={t('demo.tag')}
                  demoLabel={t('demo.label')}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
            {/* No frame and no divider: the numbers, the platform picker and the
                panels sit straight on the page background, so nothing competes
                with the brand colours or the lime wash above them. */}
            <Reveal>
              <dl className="grid gap-6 text-center sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse items-center gap-1">
                    <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                    <dd
                      dir="ltr"
                      className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={80}>
              <PlatformShowcase platforms={platforms} label={t('worksWith')} />
            </Reveal>
          </div>
        </section>

        <section id="how-it-works">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight">{nav('howItWorks')}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{t('stepsIntro')}</p>
            </Reveal>
            <Reveal className="mt-10" delay={100}>
              <StepRail
                title={nav('howItWorks')}
                steps={[
                  { title: t('steps.create.title'), body: t('steps.create.body') },
                  { title: t('steps.share.title'), body: t('steps.share.body') },
                  { title: t('steps.unlock.title'), body: t('steps.unlock.body') },
                ]}
              />
            </Reveal>
          </div>
        </section>

        <section id="verification">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
            <Reveal>
              <FlowPanel
                title={t('flow.title')}
                body={t('flow.body')}
                claims={[
                  t('flow.progressBullet'),
                  t('flow.serverBullet'),
                  t('flow.signedBullet'),
                ]}
                diagramTitle={t('flow.diagramTitle')}
                nodes={flowNodes}
              />
            </Reveal>
          </div>
        </section>

        <section id="features">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight">{t('featuresTitle')}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{t('featuresIntro')}</p>
            </Reveal>

            <FeatureSwitcher
              features={{
                actions: {
                  title: t('features.actions.title'),
                  body: t('features.actions.body'),
                },
                delivery: {
                  title: t('features.delivery.title'),
                  body: t('features.delivery.body'),
                },
                analytics: {
                  title: t('features.analytics.title'),
                  body: t('features.analytics.body'),
                },
                email: { title: t('features.email.title'), body: t('features.email.body') },
                abuse: { title: t('features.abuse.title'), body: t('features.abuse.body') },
              }}
              funnel={{
                views: t('funnel.views'),
                unlocks: t('funnel.unlocks'),
                completed: t('funnel.completed'),
              }}
              sampleContent={t('demo.sampleContent')}
              actions={[
                actionCopy('YOUTUBE_SUBSCRIBE'),
                actionCopy('INSTAGRAM_FOLLOW'),
                actionCopy('TIKTOK_FOLLOW'),
                actionCopy('SPOTIFY_TRACK'),
              ]}
              emailPlaceholder={unlockCopy('emailPlaceholder')}
              submitEmail={unlockCopy('submitEmail')}
              demoTag={t('demo.tag')}
            />
          </div>
        </section>

        <AdSlot placement="home-mid" className="mx-auto w-full max-w-[1200px] px-4" />

        <Reveal>
          <AnalyticsSpotlight href={signedIn ? '/dashboard' : '/sign-up'} />
        </Reveal>

        <Reveal>
          <LeadsSpotlight href={signedIn ? '/dashboard/leads' : '/sign-up'} />
        </Reveal>

        <BioLinksHero href={signedIn ? '/dashboard/profile' : '/sign-up'} />

        <section className="relative overflow-hidden border-t bg-card">
          {/* The closing ask is a full-width invitation rather than another
              framed card: one centred headline, one action. The platform marks
              that fade behind it are the same brands the unlocks ask for. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_80%_at_50%_0%,rgba(201,247,42,0.14),transparent)] dark:bg-[radial-gradient(55%_80%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 text-foreground/[0.08]">
            {CTA_GLYPHS.map((glyph) => (
              <BrandIcon
                key={glyph.platform}
                platform={glyph.platform}
                neutral
                className={glyph.className}
              />
            ))}
          </div>
          <Reveal>
            <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 py-20 text-center sm:py-24">
              <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {t.rich('ctaTitle', {
                  accent: (chunks) => <span className="text-accent-text">{chunks}</span>,
                })}
              </h2>
              <p className="mt-4 max-w-md text-base text-muted-foreground">{t('ctaBody')}</p>
              <Button size="lg" asChild className="mt-8 w-full sm:w-auto">
                <Link href="/create">
                  {t('ctaButton')}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>

        <AdSlot placement="home-bottom" className="mx-auto w-full max-w-[1200px] px-4 pb-12" />
      </main>

      <SiteFooter />
    </>
  )
}
