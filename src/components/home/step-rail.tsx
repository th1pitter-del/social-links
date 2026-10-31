'use client'

import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

/**
 * The three steps of the product as one connected rail instead of three matching
 * cards: the connector fills to the active step, and moving the pointer along the
 * rail is what selects a step, so the gesture teaches the sequence it describes.
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

  return (
    <DemoStage cycle={cycle} label={title} className="space-y-5">
      <div className="relative grid gap-3 sm:grid-cols-3">
        {/* The rail itself, sitting behind the nodes. */}
        <span
          aria-hidden
          className="absolute inset-x-4 top-4 hidden h-px bg-border sm:block"
        />
        <span
          aria-hidden
          className="absolute start-4 top-4 hidden h-px bg-primary transition-[width] duration-700 ease-out sm:block"
          style={{ width: `calc((100% - 2rem) * ${cycle.phase / Math.max(1, steps.length - 1)})` }}
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
              className={cn(
                'relative flex cursor-pointer flex-col items-start gap-2 rounded-xl p-1 text-start transition-colors duration-300',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
            >
              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-lg text-sm font-semibold transition-[background-color,color,transform] duration-300',
                  reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  active && 'motion-safe:scale-105',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'font-medium transition-colors duration-300',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.title}
              </span>
              {/* Below sm the rail is a stack, so each step carries its own text
                  instead of sharing one panel that would be far from it. */}
              <span
                className={cn(
                  'text-sm text-muted-foreground sm:hidden',
                  active ? 'block' : 'hidden',
                )}
              >
                {step.body}
              </span>
            </button>
          )
        })}
      </div>

      <div className="min-h-16 rounded-xl border bg-card p-4 sm:min-h-0">
        <p className="text-sm text-muted-foreground sm:hidden">{t('railTapHint')}</p>
        {/* Hidden on mobile (the step itself carries the text there) and keyed so
            the swap re-runs its fade. */}
        <p
          key={cycle.phase}
          className={cn(
            'hidden text-sm sm:block',
            'motion-safe:animate-[demo-fade_0.35s_ease-out]',
          )}
        >
          {steps[cycle.phase]?.body}
        </p>
        <p className="sr-only" aria-live="polite">
          {t('stepOf', { current: cycle.phase + 1, total: steps.length })}
        </p>
      </div>
    </DemoStage>
  )
}
