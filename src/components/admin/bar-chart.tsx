'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from 'cn'

import { formatNumber, formatPercent } from '@/lib/format'

export type BarChartPoint = {
  label: string
  primary: number
  secondary?: number
}

/**
 * Responsive paired-bar chart with one explorable column instead of native
 * `title` tooltips: those need a second of hovering, do not exist on touch, and
 * never announce themselves. The readout line under the chart names the day,
 * both counts and the day's share of the window, which is the extra detail a
 * hovering pointer should reveal.
 */
export function BarChart({
  points,
  primaryLabel,
  secondaryLabel,
  startDate,
  className,
}: {
  points: BarChartPoint[]
  primaryLabel: string
  secondaryLabel?: string
  /** When given, each column is named by its real date instead of its index. */
  startDate?: Date
  className?: string
}) {
  const t = useTranslations('admin.overview')
  const locale = useLocale()
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(1, ...points.flatMap((point) => [point.primary, point.secondary ?? 0]))
  const totalPrimary = points.reduce((sum, point) => sum + point.primary, 0)
  const hasSecondary = secondaryLabel !== undefined

  const dayFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  })
  // Cloned and shifted with setDate, not with milliseconds: a DST boundary in
  // the window must not name a day twice or skip one.
  const dayOf = (index: number) => {
    if (!startDate) return points[index]?.label ?? `${index + 1}`
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return dayFormatter.format(date)
  }

  const valueParts = (point: BarChartPoint) => {
    const parts = [`${primaryLabel} ${formatNumber(locale, point.primary)}`]
    if (hasSecondary && point.secondary !== undefined) {
      parts.push(`${secondaryLabel} ${formatNumber(locale, point.secondary)}`)
    }
    return parts
  }

  const readout = () => {
    const current = active === null || !points[active] ? null : points[active]
    if (!current) {
      const totalSecondary = points.reduce((sum, point) => sum + (point.secondary ?? 0), 0)
      const totals: BarChartPoint = hasSecondary
        ? { label: '', primary: totalPrimary, secondary: totalSecondary }
        : { label: '', primary: totalPrimary }
      return [t('chartDays', { days: points.length }), ...valueParts(totals)].join(' · ')
    }
    const parts = [dayOf(active!), ...valueParts(current)]
    if (totalPrimary > 0) {
      parts.push(
        t('chartShareOfTotal', {
          percent: formatPercent(locale, Math.round((current.primary / totalPrimary) * 100)),
        }),
      )
    }
    return parts.join(' · ')
  }

  // The columns follow the document direction, so does the keyboard.
  function stepFor(key: string) {
    if (key === 'ArrowDown') return 1
    if (key === 'ArrowUp') return -1
    const rtl = document.documentElement.dir === 'rtl'
    if (key === 'ArrowRight') return rtl ? -1 : 1
    if (key === 'ArrowLeft') return rtl ? 1 : -1
    return 0
  }

  return (
    <div className={cn('space-y-3', className)} onPointerLeave={() => setActive(null)}>
      <div className="flex h-44 items-end gap-1.5">
        {points.map((point, index) => (
          <button
            key={`${point.label}-${index}`}
            type="button"
            // One tab stop for the whole series; the readout carries the values.
            tabIndex={index === 0 ? 0 : -1}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              const step = stepFor(event.key)
              if (!step) return
              event.preventDefault()
              const next = Math.min(
                points.length - 1,
                Math.max(0, (active ?? index) + step),
              )
              setActive(next)
              const target = event.currentTarget.parentElement?.children[next] as
                | HTMLElement
                | undefined
              target?.focus()
            }}
            onPointerEnter={() => setActive(index)}
            onClick={() => setActive(index)}
            aria-label={`${dayOf(index)} · ${valueParts(point).join(' · ')}`}
            className={cn(
              'flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-md',
              'transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground',
              active === index && 'bg-muted/50',
            )}
          >
            <div className="flex h-full w-full items-end justify-center gap-0.5 px-0.5">
              <span
                className={cn(
                  'w-1/2 rounded-t bg-primary transition-colors',
                  active === index && 'bg-pulse-lime-hover',
                )}
                style={{
                  height: `${(point.primary / max) * 100}%`,
                  minHeight: point.primary > 0 ? 2 : 0,
                }}
              />
              {point.secondary !== undefined ? (
                <span
                  className={cn(
                    'w-1/2 rounded-t bg-muted-foreground/40 transition-colors',
                    active === index && 'bg-muted-foreground/60',
                  )}
                  style={{
                    height: `${(point.secondary / max) * 100}%`,
                    minHeight: point.secondary > 0 ? 2 : 0,
                  }}
                />
              ) : null}
            </div>
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">
              {point.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">{readout()}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          {primaryLabel}
        </span>
        {secondaryLabel ? (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted-foreground/40" />
            {secondaryLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
