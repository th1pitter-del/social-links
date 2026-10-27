"use client"

import { useTranslations } from "next-intl"

import { cn } from "cn"

const DAYS = 7
const WEEKS = 12

function getIntensity(value: number) {
  if (value >= 20) return "bg-primary"
  if (value >= 10) return "bg-primary/80"
  if (value >= 5) return "bg-primary/60"
  if (value >= 1) return "bg-primary/40"
  return "bg-muted"
}

export function ActivityHeatmap({ values }: { values: number[] }) {
  const t = useTranslations("admin.overview")
  const cells = Array.from({ length: DAYS * WEEKS }, (_, index) => {
    const value = values[index] ?? 0
    return { index, value }
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={cn("size-3 rounded-[2px] transition-colors", getIntensity(cell.value))}
            title={t("heatmapTooltip", { count: cell.value })}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{t("heatmapLess")}</span>
        <div className="flex items-center gap-1">
          <span className="size-2.5 rounded-[2px] bg-muted" />
          <span className="size-2.5 rounded-[2px] bg-primary/40" />
          <span className="size-2.5 rounded-[2px] bg-primary/60" />
          <span className="size-2.5 rounded-[2px] bg-primary/80" />
          <span className="size-2.5 rounded-[2px] bg-primary" />
        </div>
        <span>{t("heatmapMore")}</span>
      </div>
    </div>
  )
}