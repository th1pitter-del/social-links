import { cn } from "cn"
import { formatPercent } from '@/lib/format'

export function KpiHero({
  title,
  value,
  label,
  percentage,
  locale,
  className,
}: {
  title: string
  value: string | number
  label: string
  percentage?: number
  /** Locale for the ring's percentage readout. */
  locale: string
  className?: string
}) {
  const pct = percentage ?? 0
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-black/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-black/5"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">{title}</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight sm:text-6xl">{value}</p>
          <p className="mt-2 text-sm font-medium opacity-80">{label}</p>
        </div>
        <div className="relative hidden shrink-0 sm:block">
          <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r={radius} stroke="rgba(5,5,5,0.15)" strokeWidth="8" fill="none" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(5,5,5,0.9)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold">{formatPercent(locale, pct)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}