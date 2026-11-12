'use client'

import { Link2, Share2, Unlock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

const ICONS = [Link2, Share2, Unlock]

/**
 * The three moves as columns of one rail: the header rule fills as the sequence
 * advances, the active icon is the only solid one, and a pointer takes the walk
 * over while it is on a step. Every column carries its own text, so the stacked
 * phone layout says exactly what the rail says.
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
    <DemoStage cycle={cycle} label={title}>
      <div
        onPointerEnter={cycle.pause}
        onPointerLeave={cycle.resume}
        className="grid gap-6 sm:grid-cols-3 sm:gap-8"
      >
        {steps.map((step, index) => {
          const active = index === cycle.phase
          const reached = index <= cycle.phase
          const Icon = ICONS[index] ?? Link2
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => {
                cycle.goTo(index)
                cycle.pause()
              }}
              onPointerEnter={() => cycle.goTo(index)}
              aria-current={active ? 'step' : undefined}
              className="group relative flex cursor-pointer flex-col items-start rounded-xl text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="flex w-full items-center gap-3">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl ring-1 transition-[background-color,color,box-shadow,border-color] duration-500 motion-reduce:transition-none',
                    active
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-primary'
                      : 'bg-card text-muted-foreground ring-border group-hover:text-foreground group-hover:ring-primary/40',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums transition-colors duration-300',
                    active ? 'text-foreground' : 'text-muted-foreground/70',
                  )}
                >
                  0{index + 1}
                </span>
                <span aria-hidden className="h-px flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-primary/40 to-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: reached ? '100%' : '0%' }}
                  />
                </span>
              </span>
              <span
                className={cn(
                  'mt-4 block font-medium transition-colors duration-300',
                  active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {step.title}
              </span>
              <span
                className={cn(
                  'mt-1.5 block text-sm leading-relaxed transition-colors duration-300',
                  active ? 'text-foreground/75' : 'text-muted-foreground',
                )}
              >
                {step.body}
              </span>
            </button>
          )
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {t('stepOf', { current: cycle.phase + 1, total: steps.length })}
      </p>
    </DemoStage>
  )
}
