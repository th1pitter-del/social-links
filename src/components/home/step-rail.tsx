'use client'

import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

/**
 * The three steps of the product as nodes threaded on one rail: the connector
 * fills to the active node, that node's badge is the only solid one, and its
 * card is the only one lit - so the sequence is followed with the eye rather
 * than read from a caption below. Each card carries its own text, which means
 * the mobile stack and the desktop rail say the same thing.
 *
 * Tap or click pins a step (the loop stops so it can be read); the transport in
 * the page's other demos is not needed here because the rail is small enough to
 * control directly.
 */
export function StepRail({
  steps,
  title,
}: {
  steps: { title: string; body: string }[]
  title: string
}) {
  const t = useTranslations('motion')
  const cycle = useDemoCycle({ phaseCount: steps.length, intervalMs: 4200 })

  // The rail runs badge-center to badge-center: 4px of button padding plus half
  // of the 32px badge.
  const ratio = cycle.phase / Math.max(1, steps.length - 1)

  return (
    <DemoStage cycle={cycle} label={title}>
      <div className="relative grid gap-3 sm:grid-cols-3">
        {/* The track, and the filled part of it. Both sit at the badges' own
            height, so they pass behind them instead of cutting across the
            cards. */}
        <span
          aria-hidden
          className="absolute inset-x-5 top-5 z-10 hidden h-0.5 -translate-y-1/2 rounded-full bg-border sm:block"
        />
        <span
          aria-hidden
          className="absolute start-5 top-5 z-10 hidden h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/40 to-primary rtl:bg-gradient-to-l transition-[width] duration-700 ease-out motion-reduce:transition-none sm:block"
          style={{ width: `calc((100% - 2.5rem) * ${ratio})` }}
        />

        {steps.map((step, index) => {
          const active = index === cycle.phase
          const reached = index <= cycle.phase
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => {
                cycle.goTo(index)
                cycle.pause()
              }}
              aria-current={active ? 'step' : undefined}
              className="group relative flex cursor-pointer flex-col items-start gap-3 p-1 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {/* Only the current node wears the full accent: the ones already
                  passed stay marked, but recede. */}
              <span
                className={cn(
                  'relative z-20 flex size-8 items-center justify-center rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] duration-500 motion-reduce:transition-none',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : reached
                      ? 'bg-primary/15 text-accent-text'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'w-full rounded-xl border p-4 transition-[background-color,border-color,box-shadow] duration-500 motion-reduce:transition-none',
                  active
                    ? 'border-primary/45 bg-card shadow-lg shadow-primary/10'
                    : 'border-border bg-card/55 group-hover:border-primary/25',
                )}
              >
                <span
                  className={cn(
                    'block font-medium transition-colors duration-300',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t('railTapHint')}</p>
        <p className="sr-only" aria-live="polite">
          {t('stepOf', { current: cycle.phase + 1, total: steps.length })}
        </p>
      </div>
    </DemoStage>
  )
}
