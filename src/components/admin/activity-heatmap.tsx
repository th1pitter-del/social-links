"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"

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

/**
 * The grid is column-major (7 rows), so the next day sits below the current
 * cell and a horizontal move has to follow the page's reading direction.
 */
function stepFor(key: string) {
  if (key === "ArrowDown") return 1
  if (key === "ArrowUp") return -1
  const rtl = document.documentElement.dir === "rtl"
  if (key === "ArrowRight") return rtl ? -1 : 1
  if (key === "ArrowLeft") return rtl ? 1 : -1
  return 0
}

export function ActivityHeatmap({ values, startDate }: { values: number[]; startDate: Date }) {
  const t = useTranslations("admin.overview")
  const locale = useLocale()
  // A tap also fires pointerenter, so the same state serves mouse and touch;
  // leaving the grid restores the all-activity summary.
  const [active, setActive] = useState<number | null>(null)

  const cells = Array.from({ length: DAYS * WEEKS }, (_, index) => ({ index, value: values[index] ?? 0 }))
  const total = cells.reduce((sum, cell) => sum + cell.value, 0)
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })

  const dayOf = (index: number) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return dayFormatter.format(date)
  }

  const readout =
    active === null
      ? t("heatmapSummary", { count: total, days: cells.length })
      : `${dayOf(active)} · ${t("heatmapTooltip", { count: cells[active].value })}`

  return (
    <div className="space-y-3">
      <div
        className="grid grid-flow-col grid-rows-7 gap-1"
        onPointerLeave={() => setActive(null)}
      >
        {cells.map((cell) => (
          <button
            key={cell.index}
            type="button"
            // One tab stop for the whole grid; the readout below names the day
            // and its count, so the values stay reachable without 84 stops.
            tabIndex={cell.index === 0 ? 0 : -1}
            onFocus={() => setActive(cell.index)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              const step = stepFor(event.key)
              if (!step) return
              event.preventDefault()
              const next = Math.min(cells.length - 1, Math.max(0, (active ?? cell.index) + step))
              setActive(next)
              const target = event.currentTarget.parentElement?.children[next] as HTMLElement | undefined
              target?.focus()
            }}
            onPointerEnter={() => setActive(cell.index)}
            onClick={() => setActive(cell.index)}
            aria-label={`${dayOf(cell.index)} · ${t("heatmapTooltip", { count: cell.value })}`}
            className={cn(
              "relative size-3 cursor-pointer rounded-[2px] transition-colors after:absolute after:-inset-0.5 after:content-['']",
              getIntensity(cell.value),
              active === cell.index && "outline-2 -outline-offset-1 outline-foreground",
            )}
          />
        ))}
      </div>
      {/* Not a live region: each cell already carries the same day and count in
          its accessible name, and announcing every pointer move is noise. */}
      <div className="min-h-5 text-[11px] text-muted-foreground tabular-nums">
        {readout}
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
