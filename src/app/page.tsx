import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Blocks,
  Globe2,
  Lock,
  Mail,
  Megaphone,
  Music4,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [t, common, session] = await Promise.all([
    getTranslations('home'),
    getTranslations('common'),
    getSession(),
  ])
  const signedIn = Boolean(session)

  const steps = [
    { title: t('steps.create.title'), body: t('steps.create.body') },
    { title: t('steps.share.title'), body: t('steps.share.body') },
    { title: t('steps.unlock.title'), body: t('steps.unlock.body') },
  ]

  const actions = [
    { icon: Video, label: t('actionLabels.youtube') },
    { icon: Globe2, label: t('actionLabels.visit') },
    { icon: Megaphone, label: t('actionLabels.follow') },
    { icon: Music4, label: t('actionLabels.music') },
    { icon: Mail, label: t('actionLabels.email') },
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
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <BadgeCheck className="size-3.5 text-accent-text" />
                {t('badge')}
              </span>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                {t('titleBefore')}{' '}
                <span className="bg-gradient-to-r from-[#4f6208] via-[#66800e] to-[#7a9412] bg-clip-text text-transparent dark:from-[#e8ff91] dark:via-[#d5ff2f] dark:to-[#c5f522]">
                  {t('titleHighlight')}
                </span>
                {t('titleAfter')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
              <p className="mt-3 text-sm font-medium text-accent-text">{t('firstLinkFree')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
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

            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border bg-card p-5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                    {index + 1}
                  </span>
                  <h2 className="mt-4 font-medium">{step.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{t('flow.title')}</h2>
              <p className="mt-4 text-muted-foreground">{t('flow.body')}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  t('flow.serverBullet'),
                  t('flow.signedBullet'),
                  t('flow.progressBullet'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-text" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t('flow.progressTitle')}</span>
                <span className="text-muted-foreground">{t('flow.progressValue')}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 bg-primary" />
              </div>
              <div className="rounded-xl border p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <BadgeCheck className="size-4 text-success" /> {t('flow.stepDone')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t('flow.completed')}</p>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Lock className="size-4 text-accent-text" /> {t('flow.stepNext')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t('flow.required')}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">{t('featuresTitle')}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Feature
                icon={<Blocks className="size-5" />}
                title={t('features.actions.title')}
                body={t('features.actions.body')}
              />
              <Feature
                icon={<Lock className="size-5" />}
                title={t('features.delivery.title')}
                body={t('features.delivery.body')}
              />
              <Feature
                icon={<BarChart3 className="size-5" />}
                title={t('features.analytics.title')}
                body={t('features.analytics.body')}
              />
              <Feature
                icon={<Mail className="size-5" />}
                title={t('features.email.title')}
                body={t('features.email.body')}
              />
              <Feature
                icon={<ShieldCheck className="size-5" />}
                title={t('features.abuse.title')}
                body={t('features.abuse.body')}
              />
              <Feature
                icon={<Globe2 className="size-5" />}
                title={t('features.mobile.title')}
                body={t('features.mobile.body')}
              />
            </div>

            <div className="mt-12">
              <p className="text-sm font-medium text-muted-foreground">{t('supportedActions')}</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {actions.map((action) => (
                  <li
                    key={action.label}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
                  >
                    <action.icon className="size-4 text-muted-foreground" />
                    {action.label}
                  </li>
                ))}
              </ul>
              <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
                {t('verificationNote')}
              </p>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
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
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-accent-text ring-1 ring-primary/20">
        {icon}
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
