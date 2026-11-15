import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { navIcons, type SiteNavIcon } from '@/components/site-nav-icons'
import { Button } from '@/components/ui/button'
import type { MarketingSection } from '@/lib/marketing'

type MarketingCard = {
  href: string
  label: string
  body: string
  icon: SiteNavIcon
}

function CardIcon({ icon }: { icon: SiteNavIcon }) {
  const Icon = navIcons[icon]
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-accent-text">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

/**
 * Shared shell for the About and How it works pages: a hero that matches the
 * content pages, optional cards to child pages, numbered sections, sibling
 * links, and the closing lime-tinted invitation.
 */
export function MarketingPage({
  eyebrow,
  title,
  intro,
  sections = [],
  cards = [],
  cardCta = '',
  related = [],
  relatedLabel,
  back,
  cta,
}: {
  eyebrow: string
  title: string
  intro: string
  sections?: MarketingSection[]
  cards?: MarketingCard[]
  cardCta?: string
  related?: MarketingCard[]
  relatedLabel?: string
  back?: { href: string; label: string }
  cta: { title: string; body: string; button: string; href?: string }
}) {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(60%_55%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
        />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:py-20">
          {back ? (
            <Link
              href={back.href}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {back.label}
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {eyebrow}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
            {intro}
          </p>
        </div>
      </section>

      {cards.length > 0 ? (
        <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/25"
              >
                <CardIcon icon={card.icon} />
                <h2 className="mt-5 text-xl font-semibold tracking-tight">{card.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                  {cardCta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sections.length > 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
          <div className="space-y-10">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="border-t border-border pt-10 first:border-t-0 first:pt-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className="text-sm font-semibold text-accent-text tabular-nums"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                    {section.title}
                  </h2>
                </div>
                <p className="mt-4 text-base leading-8 text-muted-foreground sm:ps-11">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="mx-auto w-full max-w-3xl px-4 pb-12 sm:pb-16">
          {relatedLabel ? (
            <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {relatedLabel}
            </h2>
          ) : null}
          <div className="mt-4 divide-y divide-border rounded-2xl border bg-card">
            {related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
              >
                <CardIcon icon={item.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block truncate text-sm text-muted-foreground">{item.body}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden border-t bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_80%_at_50%_0%,rgba(201,247,42,0.14),transparent)] dark:bg-[radial-gradient(55%_80%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
        />
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 py-16 text-center sm:py-20">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {cta.title}
          </h2>
          <p className="mt-4 max-w-md text-base text-muted-foreground">{cta.body}</p>
          <Button size="lg" asChild className="mt-8 w-full sm:w-auto">
            <Link href={cta.href ?? '/create'}>
              {cta.button}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
