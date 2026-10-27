import { cn } from "cn"

export function ModelDistribution({
  items,
}: {
  items: { label: string; value: number; percent: number }[]
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="text-muted-foreground">{item.percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-primary")}
              style={{ width: `${item.percent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}