import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { AdSlot } from '@/components/ads/ad-slot'
import { ActionMixer, type DemoPlatform } from '@/components/home/action-mixer'
import { FeatureBento } from '@/components/home/feature-bento'
import { FlowDiagram } from '@/components/home/flow-diagram'
import { StepRail } from '@/components/home/step-rail'
import { UnlockDemo, type DemoStep } from '@/components/home/unlock-demo'
import { Reveal } from '@/components/motion/reveal'
import { getSession } from '@/lib/session'
import { getEnabledPlatforms } from '@/lib/action-catalog'

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
  const [t, nav, common, unlockCopy, motionCopy, session, platformRows] =
    await Promise.all([
      getTranslations('home'),
      getTranslations('nav'),
      getTranslations('common'),
      getTranslations('unlock'),
      getTranslations('motion'),
      getSession(),
      getEnabledPlatforms(),
    ])
  const signedIn = Boolean(session)

  // The hero demonstration walks four different platforms on purpose: the
  // card is labelled as a simulation, and a varied set shows what the unlock
  // flow looks like across the networks creators actually use. Each one is
  // chosen for a distinct brand colour, since the rows wear those colours.
  const steps: DemoStep[] = [
    { label: t('demoSteps.youtube'), platform: 'youtube', icon: 'user_plus' },
    { label: t('demoSteps.twitch'), platform: 'twitch', icon: 'user_check' },
    { label: t('demoSteps.instagram'), platform: 'instagram', icon: 'user_plus' },
    { label: t('demoSteps.discord'), platform: 'discord', icon: 'message' },
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
                {/* Each claim names the stage of the flow it belongs to, so the
                    list and the diagram beside it read as one mechanism instead
                    of two unrelated blocks. Ordered by stage so the numbers ascend
                    and never look like a broken 1-2-3. */}
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    { text: t('flow.progressBullet'), node: 1 },
                    { text: t('flow.serverBullet'), node: 2 },
                    { text: t('flow.signedBullet'), node: 3 },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[0.65rem] font-semibold text-accent-text tabular-nums ring-1 ring-primary/20">
                        {item.node + 1}
                        <span className="sr-only">
                          {motionCopy('stageRef', { current: item.node + 1 })}
                        </span>
                      </span>
                      <span className="pt-1 text-muted-foreground">{item.text}</span>
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
              <p className="mt-3 max-w-2xl text-muted-foreground">{t('featuresIntro')}</p>
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
              <div className="rounded-2xl border bg-card p-5 sm:p-6">
                <h3 className="text-xl font-semibold tracking-tight">
                  {t('supportedActions')}
                </h3>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  {t('supportedActionsBody')}
                </p>
                <ActionMixer platforms={platforms} />
              </div>
            </Reveal>

            <p className="mt-8 max-w-3xl text-xs text-muted-foreground">{t('verificationNote')}</p>
          </div>
        </section>

        <section className="border-t">
          <Reveal>
            <div className="mx-auto w-full max-w-[1200px] px-4 py-16">
              {/* The closing ask gets the same framed treatment as the blocks
                  above it, with the accent light inside the frame rather than
                  bleeding across the whole page. */}
              <div className="relative overflow-hidden rounded-2xl border bg-card">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_130%_at_88%_100%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(50%_130%_at_88%_100%,rgba(213,255,47,0.12),transparent)]"
                />
                <div className="relative flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {t('ctaTitle')}
                    </h2>
                    <p className="mt-2 max-w-xl text-muted-foreground">{t('ctaBody')}</p>
                  </div>
                  <div className="shrink-0">
                    <Button size="lg" asChild>
                      <Link href="/create">
                        {t('ctaButton')}
                        <ArrowRight className="rtl:rotate-180" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <AdSlot placement="home-bottom" className="mx-auto w-full max-w-[1200px] px-4 pb-12" />
      </main>

      <SiteFooter />
    </>
  )
}
