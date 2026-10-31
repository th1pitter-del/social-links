import { cn } from 'cn'

export type FunnelStage = {
  label: string
  value: number
  /** Percent of the widest stage, so every bar shares one scale. */
  share: number
  note?: string
}

/**
 * Views, starts and completions as three bars on one scale, so the drop-off is a
 * shape instead of three numbers to compare by eye. The fill is width-based, not
 * translated, because it has to grow from the leading edge in Arabic too.
 */
export function FunnelStages({
  stages,
  locale,
  className,
}: {
  stages: FunnelStage[]
  locale: string
  className?: string
}) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-3', className)}>
      {stages.map((stage, index) => (
        <div
          key={stage.label}
          style={index ? { animationDelay: `${index * 60}ms` } : undefined}
          className="space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-backwards"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-xs font-medium text-muted-foreground">{stage.label}</p>
            <p className="shrink-0 text-2xl font-semibold tracking-tight tabular-nums">
              {stage.value.toLocaleString(locale)}
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${stage.share}%` }}
            />
          </div>
          {stage.note ? (
            <p className="text-[0.7rem] text-muted-foreground tabular-nums">{stage.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
