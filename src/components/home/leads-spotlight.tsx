'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, Check, Download, ShieldCheck } from 'lucide-react'
import { cn } from 'cn'

import { useRotator } from '@/components/home/use-rotator'

/** Sample leads for the demo inbox; no real address is stored here. */
const LEADS = [
  { email: 'lina.park@mail.com', initials: 'LP', time: '09:41' },
  { email: 'marcus.reed@mail.com', initials: 'MR', time: '09:12' },
  { email: 'sofia.almeida@mail.com', initials: 'SA', time: '08:54' },
  { email: 'youssef.h@mail.com', initials: 'YH', time: '08:07' },
]

/**
 * The email-lead feature shown as the inbox it fills: consent chips, a rotating
 * "new" row that marks the latest address, and a CSV export affordance. The
 * panel is decorative; the copy beside it carries the meaning.
 */
export function LeadsSpotlight({ href }: { href: string }) {
  const t = useTranslations('home.leads')
  const rotator = useRotator(LEADS.length, 3400)

  /* This project's react-hooks/refs rule reads the callback ref and the handlers
     as ref values because they travel on the same object, and reports every
     property access on it while rendering. Nothing here touches `ref.current`;
     the exception is scoped to the element that wires the rotator up. */
  /* eslint-disable react-hooks/refs */
  return (
    <section id="leads">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12">
          <div className="max-w-lg">
            <p className="text-sm font-medium text-accent-text">{t('eyebrow')}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t('body')}</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[t('bullet1'), t('bullet2'), t('bullet3')].map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/12 text-accent-text ring-1 ring-primary/20">
                    <Check className="size-3" />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <Link
              href={href}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
            >
              {t('cta')}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div
            ref={rotator.setNode}
            onPointerEnter={rotator.pause}
            onPointerLeave={rotator.resume}
            onFocusCapture={rotator.pause}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                rotator.resume()
              }
            }}
            aria-hidden
            className="relative overflow-hidden rounded-2xl border bg-card lg:order-first"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_0%_0%,rgba(201,247,42,0.14),transparent)] dark:bg-[radial-gradient(60%_60%_at_0%_0%,rgba(213,255,47,0.10),transparent)]" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {t('demoTag')}
                </span>
                <span className="rounded-full border bg-background/50 px-2 py-0.5 text-[0.65rem] normal-case">
                  {t('count', { count: 128 })}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {LEADS.map((lead, index) => {
                  const active = index === rotator.active
                  return (
                    <div
                      key={lead.email}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-[background-color,border-color] duration-500 motion-reduce:transition-none',
                        active
                          ? 'border-primary/30 bg-primary/6'
                          : 'border-border bg-background/40',
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted/60 text-[0.65rem] font-semibold text-muted-foreground">
                        {lead.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lead.email}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                          <ShieldCheck className="size-3 text-accent-text" />
                          {t('consent')}
                          <span className="text-muted-foreground/60">·</span>
                          <span className="tabular-nums">{lead.time}</span>
                        </p>
                      </div>
                      {active ? (
                        <span
                          key={rotator.active}
                          className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-semibold text-primary-foreground motion-safe:animate-[demo-fade_0.4s_ease-out]"
                        >
                          {t('newBadge')}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[0.7rem] text-muted-foreground">{t('note')}</p>
                <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border bg-background/60 px-2.5 py-1.5 text-xs font-medium">
                  <Download className="size-3.5 text-accent-text" />
                  {t('export')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
  /* eslint-enable react-hooks/refs */
}
