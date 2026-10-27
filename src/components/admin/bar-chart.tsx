import { cn } from 'cn'

export type BarChartPoint = {
  label: string
  primary: number
  secondary?: number
}

/**
 * Dependency-free responsive bar chart. Two optional series are rendered as
 * paired bars so admins can compare two metrics (e.g. views vs unlocks) over
 * time. Values are exposed through native `title` tooltips.
 */
export function BarChart({
  points,
  primaryLabel = 'Series 1',
  secondaryLabel,
  className,
}: {
  points: BarChartPoint[]
  primaryLabel?: string
  secondaryLabel?: string
  className?: string
}) {
  const max = Math.max(1, ...points.flatMap((point) => [point.primary, point.secondary ?? 0]))

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-44 items-end gap-1.5">
        {points.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              <div
                className="w-1/2 rounded-t bg-primary transition-colors hover:bg-pulse-lime-hover"
                style={{
                  height: `${(point.primary / max) * 100}%`,
                  minHeight: point.primary > 0 ? 2 : 0,
                }}
                title={`${primaryLabel}: ${point.primary}`}
              />
              {point.secondary !== undefined ? (
                <div
                  className="w-1/2 rounded-t bg-muted-foreground/40 transition-colors hover:bg-muted-foreground/60"
                  style={{
                    height: `${(point.secondary / max) * 100}%`,
                    minHeight: point.secondary > 0 ? 2 : 0,
                  }}
                  title={`${secondaryLabel ?? 'Series 2'}: ${point.secondary}`}
                />
              ) : null}
            </div>
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">
              {point.label}
            </span>
          </div>
        ))}
      </div>
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
