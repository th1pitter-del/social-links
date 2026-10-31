import { cn } from "cn"

export function ModelDistribution({
  items,
  valueLabel,
}: {
  items: { label: string; value: number; percent: number }[]
  /** Names the base the percentages are cut from, e.g. "3 completed steps". */
  valueLabel?: string
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        // The count and the share are printed, not hidden behind the pointer,
        // so the row says the same thing on a phone as on a desktop.
        <div
          key={item.label}
          className="-mx-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {item.value} · {item.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-primary transition-[width] duration-500 ease-out")}
              style={{ width: `${item.percent}%` }}
            />
          </div>
        </div>
      ))}
      {valueLabel ? <p className="pt-2 text-xs text-muted-foreground">{valueLabel}</p> : null}
    </div>
  )
}
