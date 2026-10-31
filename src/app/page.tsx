import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { ActionMixer, type DemoPlatform } from '@/components/home/action-mixer'
import { FeatureBento } from '@/components/home/feature-bento'
import { FlowDiagram } from '@/components/home/flow-diagram'
import { StepRail } from '@/components/home/step-rail'
import { UnlockDemo, type DemoStep } from '@/components/home/unlock-demo'
import { Reveal } from '@/components/motion/reveal'
import { getSiteSettings } from '@/lib/settings'
import { getSession } from '@/lib/session'
import { getEnabledActionOptions, getEnabledPlatforms } from '@/lib/action-catalog'

export const dynamic = 'force-dynamic'

/**
 * The homepage demonstrates the product instead of only describing it: the hero
 * runs the real unlock card through its phases, the steps and the verification
 * flow are explorable with a pointer, and the features are composed per claim
 * rather than repeated as matching cards. Identity, palette and components are
 * the ones already in docs/design-spec.md - the motion is additive, gated on
 * prefers-reduced-motion, and never replaces the text it animates.
 */
export default async function HomePage() {
  const [t, nav, common, unlockCopy, session, site, actionOptions, platformRows] =
    await Promise.all([
      getTranslations('home'),
      getTranslations('nav'),
      getTranslations('common'),
      getTranslations('unlock'),
      getSession(),
      getSiteSettings(),
      getEnabledActionOptions(),
      getEnabledPlatforms(),
    ])
  const signedIn = Boolean(session)

  // The demonstration uses actions that are actually switched on, so the page
  // never advertises a capability the deployment does not have. Email steps are
  // left out: they ask for an address, which a looping preview cannot show.
  const realSteps = actionOptions
    .filter((option) => option.behavior === 'URL')
    .slice(0, 3)
    .map((option): DemoStep => ({
      label: option.label,
      platform: option.platform,
      icon: option.icon,
    }))

  const steps: DemoStep[] =
    realSteps.length === 3
      ? realSteps
      : [
          { label: t('actionLabels.youtube'), platform: 'youtube', icon: 'user_plus' },
          { label: t('actionLabels.follow'), platform: 'x', icon: 'user_plus' },
          { label: t('actionLabels.visit'), platform: null, icon: 'link' },
        ]

  const platforms: DemoPlatform[] = platformRows.map((platform) => ({
    key: platform.key,
    label: platform.label,
    icon: platform.icon,
    actions: platform.actionOptions.map((option) => ({
      key: option.key,
      label: option.label,
      icon: option.icon,
    })),
  }))

  const flowNodes = [
    { label: t('flow.nodes.visitor'), detail: t('flow.nodes.visitorDetail') },
    { label: t('flow.nodes.action'), detail: t('flow.nodes.actionDetail') },
    { label: t('flow.nodes.verify'), detail: t('flow.nodes.verifyDetail') },
    { label: t('flow.nodes.deliver'), detail: t('flow.nodes.deliverDetail') },
  ]

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
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

              <UnlockDemo
                steps={steps}
                linkTitle={t('demo.linkTitle')}
                linkBody={t('demo.linkBody')}
                siteName={site.name}
                logoUrl={site.logoUrl || null}
                revealLabel={t('demo.revealLabel')}
                revealValue={t('demo.revealValue')}
                demoLabel={t('demo.label')}
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20">
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

        <section id="verification" className="border-t">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{t('flow.title')}</h2>
                <p className="mt-4 text-muted-foreground">{t('flow.body')}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    { text: t('flow.serverBullet'), node: 2 },
                    { text: t('flow.signedBullet'), node: 3 },
                    { text: t('flow.progressBullet'), node: 1 },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-text" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <FlowDiagram title={t('flow.diagramTitle')} nodes={flowNodes} />
            </Reveal>
          </div>
        </section>

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight">{t('featuresTitle')}</h2>
            </Reveal>

            <FeatureBento
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
                mobile: { title: t('features.mobile.title'), body: t('features.mobile.body') },
              }}
              funnel={{
                views: t('funnel.views'),
                unlocks: t('funnel.unlocks'),
                completed: t('funnel.completed'),
              }}
              sampleContent={t('demo.sampleContent')}
              actions={[
                t('actionLabels.youtube'),
                t('actionLabels.follow'),
                t('actionLabels.music'),
                t('actionLabels.email'),
              ]}
              emailPlaceholder={unlockCopy('emailPlaceholder')}
              submitEmail={unlockCopy('submitEmail')}
              demoLabel={t('demo.label')}
              demoTag={t('demo.tag')}
            />

            <Reveal className="mt-14" delay={80}>
              <div>
                <h3 className="text-lg font-medium">{t('supportedActions')}</h3>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {t('supportedActionsBody')}
                </p>
                <ActionMixer platforms={platforms} />
              </div>
            </Reveal>

            <p className="mt-8 max-w-3xl text-xs text-muted-foreground">{t('verificationNote')}</p>
          </div>
        </section>

        <section className="relative overflow-hidden border-t">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_70%_at_85%_100%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(45%_70%_at_85%_100%,rgba(213,255,47,0.10),transparent)]"
          />
          <Reveal>
            <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{t('ctaTitle')}</h2>
                <p className="mt-2 text-muted-foreground">{t('ctaBody')}</p>
              </div>
              <Button size="lg" asChild>
                <Link href="/create">
                  {t('ctaButton')}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
