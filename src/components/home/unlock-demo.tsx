'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2, ExternalLink, Hand, Lock, MousePointerClick, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ActionGlyph } from '@/components/brand-icon'
import { BrandMark } from '@/components/brand-mark'
import { DemoShell, useDemoCycle } from '@/components/motion/demo-cycle'
import { cn } from 'cn'

/** A demonstration action, flattened by the server page so nothing crosses the client boundary unpicklable. */
export type DemoStep = {
  label: string
  platform: string | null
  icon: string
}

/**
 * The hero shows the product instead of describing it: this is the real unlock
 * card's own layout, tokens and wording (it reuses the `unlock.*` messages),
 * walked through the same six phases a visitor actually goes through.
 *
 * Nothing here talks to the server and no counters are faked - the frame labels
 * it an example. A mouse steps through it by moving across the card, a tap uses
 * the transport, and reduced motion parks it on the delivered state.
 */
export function UnlockDemo({
  steps,
  linkTitle,
  linkBody,
  siteName,
  logoUrl,
  revealLabel,
  revealValue,
  demoLabel,
}: {
  steps: DemoStep[]
  linkTitle: string
  linkBody: string
  siteName: string
  logoUrl?: string | null
  revealLabel: string
  revealValue: string
  demoLabel: string
}) {
  const t = useTranslations('unlock')
  const tm = useTranslations('motion')
  const total = steps.length
  // 0 not started · 1 session open · 2..(total+1) each step verified · last = delivered
  const cycle = useDemoCycle({ phaseCount: total + 3, intervalMs: 2400 })
  const started = cycle.phase >= 1
  const doneCount = Math.max(0, Math.min(total, cycle.phase - 1))
  const delivered = cycle.phase === total + 2
  const activeButton = delivered ? 'open' : cycle.phase === total + 1 ? 'unlock' : 'start'
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const phaseLabel = delivered
    ? tm('phaseUnlocked')
    : started
      ? t('stepsCount', { done: doneCount, total })
      : tm('phaseIdle')

  return (
    <DemoShell cycle={cycle} label={demoLabel} phaseLabel={phaseLabel}>
      <div className="grid gap-0 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Left: the protected content, exactly as the real card presents it. */}
        <div className="border-b p-4 sm:border-b-0 sm:border-e">
          <div className="relative h-28 overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-pulse-lime-soft/10 to-primary/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <BrandMark className="size-8" src={logoUrl || null} />
              <p className="max-w-full truncate px-3 text-[0.65rem] font-medium tracking-wide uppercase opacity-60">
                {siteName}
              </p>
            </div>
            {/* A sheen that travels once per loop: the cover is the only moving
                part of this half, so it never competes with the step list. */}
            <span
              key={cycle.phase}
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-y-0 -inset-x-1/3 bg-gradient-to-r from-transparent via-background/45 to-transparent',
                'motion-safe:animate-[demo-sheen_1.1s_ease-out] motion-reduce:hidden',
              )}
            />
          </div>
          <p className="mt-3 text-sm leading-snug font-medium">{linkTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{linkBody}</p>
          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-500 ease-out',
              delivered ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                <Unlock className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0">
                  <span className="block text-[0.7rem] font-medium text-emerald-700 dark:text-emerald-400">
                    {revealLabel}
                  </span>
                  <span className="block truncate font-mono text-[0.7rem] text-muted-foreground">
                    {revealValue}
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: the ordered steps and the call to action. */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold">{t('stepsTitle')}</h2>
            <span className="text-[0.7rem] text-muted-foreground tabular-nums">
              {t('stepsCount', { done: doneCount, total })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('stepsTitle')}
            className="mt-2 flex h-1 w-full items-center overflow-hidden rounded-full bg-muted"
          >
            {/* Width, not the shadcn indicator's translateX: a translated fill
                slides the wrong way in RTL, and this page serves Arabic too. */}
            <div
              className={cn(
                'h-full rounded-full bg-primary',
                // The loop restarts at zero; draining that over the fill's own
                // duration would leave the bar full while the counter already
                // reads 0 of 3. Only forward progress animates.
                percent === 0 ? 'transition-none' : 'transition-[width] duration-700 ease-out',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          <ol className="mt-3 overflow-hidden rounded-xl border">
            {steps.map((step, index) => {
              const done = index < doneCount
              const current = started && index === doneCount
              return (
                <li
                  key={`${step.platform}-${step.icon}-${index}`}
                  className={cn(
                    'flex items-center gap-2.5 border-b px-3 py-2.5 text-xs transition-colors duration-500 last:border-b-0',
                    done && 'bg-emerald-500/5',
                    current && 'bg-primary/5',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold transition-colors duration-500',
                      done
                        ? 'bg-emerald-500 text-white'
                        : current
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? <CheckCircle2 className="size-3.5" /> : index + 1}
                  </span>
                  <ActionGlyph
                    platform={step.platform}
                    icon={step.icon}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground')}>
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[0.65rem] transition-opacity duration-300',
                      done
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                      (done || current) && 'opacity-100',
                    )}
                  >
                    {done ? t('completed') : tm('next')}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* One slot, three buttons: cross-fading them keeps the card the same
              height, so the section never shifts while the loop runs. They walk
              the same call to action the real card shows - start, then the step
              that is next, then unlock, then open what was unlocked. The demo
              itself is controlled by the transport and the dots, which is why
              these stay out of the tab order. */}
          <div className="relative mt-3 h-9" aria-hidden="true">
            <Button
              size="sm"
              className={cn(
                'absolute inset-0 transition-opacity duration-300',
                activeButton === 'unlock' ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <Unlock />
              {t('unlockButton')}
            </Button>
            <Button
              size="sm"
              className={cn(
                'absolute inset-0 transition-opacity duration-300',
                activeButton === 'open' ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <ExternalLink />
              {t('openContent')}
            </Button>
            <Button
              size="sm"
              className={cn(
                'absolute inset-0 transition-opacity duration-300',
                activeButton === 'start' ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {started ? <CheckCircle2 /> : <Lock />}
              {started ? t('openStep') : t('start')}
            </Button>
          </div>

          {/* Pointer steering is a mouse affordance, so a visitor on a touch
              device is told about the control they actually have instead of
              being invited to hover something they cannot use. */}
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            <span className="flex items-center gap-1.5 no-hover:hidden">
              <MousePointerClick className="size-3.5 shrink-0" />
              {tm('scrubHint')}
            </span>
            <span className="hidden items-center gap-1.5 no-hover:flex">
              <Hand className="size-3.5 shrink-0" />
              {tm('tapHint')}
            </span>
          </p>
        </div>
      </div>
    </DemoShell>
  )
}
