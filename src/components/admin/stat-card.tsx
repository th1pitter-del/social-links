import type { ComponentType, ReactNode } from 'react'
import { getLocale } from 'next-intl/server'

import { cn } from 'cn'
import { formatNumber } from '@/lib/format'

const TONES = {
  indigo: {
    tile: 'bg-primary/15 text-accent-text ring-1 ring-primary/40',
    wash: 'from-primary/[0.08]',
    bar: 'from-primary to-[#a8c61e]',
  },
  violet: {
    tile: 'bg-pulse-lime-soft/25 text-accent-text ring-1 ring-pulse-lime-soft/50',
    wash: 'from-pulse-lime-soft/[0.12]',
    bar: 'from-pulse-lime-soft to-primary',
  },
  emerald: {
    tile: 'bg-success/15 text-emerald-700 ring-1 ring-success/30 dark:text-success',
    wash: 'from-success/[0.08]',
    bar: 'from-success to-[#3dbe78]',
  },
  amber: {
    tile: 'bg-warning/15 text-amber-700 ring-1 ring-warning/30 dark:text-warning',
    wash: 'from-warning/[0.08]',
    bar: 'from-warning to-[#d9a84e]',
  },
  rose: {
    tile: 'bg-error/15 text-rose-700 ring-1 ring-error/30 dark:text-error',
    wash: 'from-error/[0.08]',
    bar: 'from-error to-[#e04d55]',
  },
  sky: {
    tile: 'bg-muted text-muted-foreground ring-1 ring-border',
    wash: 'from-muted/60',
    bar: 'from-muted-foreground/60 to-muted-foreground/30',
  },
  slate: {
    tile: 'bg-muted text-muted-foreground ring-1 ring-border',
    wash: 'from-muted/60',
    bar: 'from-muted-foreground/40 to-muted-foreground/20',
  },
} as const

export type StatTone = keyof typeof TONES

export async function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'indigo',
}: {
  label: string
  value: ReactNode
  icon: ComponentType<{ className?: string }>
  hint?: string
  tone?: StatTone
}) {
  const colors = TONES[tone]
  const display =
    typeof value === 'number' ? formatNumber(await getLocale(), value) : value

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br to-card p-5 shadow-sm transition-shadow hover:shadow-md',
        colors.wash,
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 start-0 w-1 bg-gradient-to-b', colors.bar)}
      />
      <div className="flex items-start justify-between gap-3 ps-1.5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{display}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            colors.tile,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}
