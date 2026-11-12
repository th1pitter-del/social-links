'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Check, TrendingUp } from 'lucide-react'
import { cn } from 'cn'

import { useInView, useReducedMotion } from '@/components/motion/reveal'
import { formatNumber } from '@/lib/format'

/** Sample day counts for the demo chart; the totals below are derived from them. */
const DAYS = [38, 52, 44, 61, 49, 72, 58, 66, 83, 71, 64, 88, 76, 94]
const PEAK = Math.max(...DAYS)
const COMPLETED = DAYS.reduce((sum, value) => sum + value, 0)
const VIEWS = 3284
const STARTS = 1486

function useCountUp(target: number, active: boolean, duration = 1200) {
  const reducedMotion = useReducedMotion()
  const [value, setValue] = useState(target)

  useEffect(() => {
    if (!active || reducedMotion) return

    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [active, target, duration, reducedMotion])

  return value
}

/**
 * The analytics feature shown as the dashboard it produces: a 14-day chart that
 * grows into place the first time it scrolls into view, a headline metric that
 * counts up with it, and bars that answer the pointer. The sample panel is
 * decorative; the copy beside it carries the meaning.
 */
export function AnalyticsSpotlight({ href }: { href: string }) {
  const t = useTranslations('home.analytics')
  const locale = useLocale()
  const { setNode, inView } = useInView<HTMLDivElement>('-12% 0px -12% 0px')
  const completed = useCountUp(COMPLETED, inView)

  return (
    <section id="analytics">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
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
            ref={setNode}
            aria-hidden
            className="relative overflow-hidden rounded-2xl border bg-card"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_0%,rgba(201,247,42,0.15),transparent)] dark:bg-[radial-gradient(60%_60%_at_90%_0%,rgba(213,255,47,0.11),transparent)]" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {t('demoTag')}
                </span>
                <span>{t('period')}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                    {formatNumber(locale, completed)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('metric')}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-accent-text ring-1 ring-primary/20">
                  <TrendingUp className="size-3.5" />
                  {t('delta')}
                </span>
              </div>

              <div className="mt-5 border-b border-border">
                <div className="flex h-32 items-end gap-1 sm:gap-1.5">
                  {DAYS.map((value, index) => {
                    const height = Math.round((value / PEAK) * 100)
                    const isPeak = value === PEAK
                    return (
                      <div
                        key={index}
                        className="group/bar relative flex h-full flex-1 items-end"
                      >
                        <div
                          className={cn(
                            'relative w-full rounded-t-[3px] transition-[height,background-color] duration-700 ease-out motion-reduce:transition-none',
                            isPeak
                              ? 'bg-primary/75 group-hover/bar:bg-primary'
                              : 'bg-primary/25 group-hover/bar:bg-primary/60',
                          )}
                          style={{
                            height: inView ? `${height}%` : '5%',
                            transitionDelay: `${index * 40}ms`,
                          }}
                        >
                          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded border bg-card px-1.5 py-0.5 text-[0.6rem] font-medium tabular-nums text-foreground opacity-0 shadow-sm transition-opacity group-hover/bar:opacity-100">
                            {formatNumber(locale, value)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 divide-x divide-border text-center rtl:divide-x-reverse">
                {[
                  { label: t('views'), value: VIEWS },
                  { label: t('starts'), value: STARTS },
                  { label: t('completed'), value: COMPLETED },
                ].map((item) => (
                  <div key={item.label} className="px-2">
                    <dt className="text-[0.6rem] tracking-wider text-muted-foreground uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums">
                      {formatNumber(locale, item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
