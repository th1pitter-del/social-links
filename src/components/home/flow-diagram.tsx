'use client'

import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

/**
 * What happens between a visitor clicking a link and the content arriving, drawn
 * in the same node-on-a-rail language as the steps above it: the connector fills
 * to the current stage, only that stage wears the full accent, and the numbers are
 * the ones the security claims beside the diagram point back to.
 *
 * Hovering a node stops the loop and shows that stage's detail, so the animation
 * is a way of reading the mechanism, not decoration over it.
 */
export function FlowDiagram({
  title,
  nodes,
}: {
  title: string
  nodes: { label: string; detail: string }[]
}) {
  const t = useTranslations('motion')
  const cycle = useDemoCycle({ phaseCount: nodes.length, intervalMs: 2000 })

  // Four equal columns with no gap, so a badge's centre sits at the middle of its
  // own column: the rail runs 12.5% → 87.5% and its filled part spans 75% at most.
  const ratio = cycle.phase / Math.max(1, nodes.length - 1)

  return (
    <DemoStage cycle={cycle} label={title} className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t('nodeOf', { current: cycle.phase + 1, total: nodes.length })}
        </p>
      </div>

      <div className="relative mt-5 grid grid-cols-4">
        <span
          aria-hidden
          className="absolute inset-x-[12.5%] top-3 z-0 h-0.5 -translate-y-1/2 rounded-full bg-border"
        />
        <span
          aria-hidden
          className="absolute start-[12.5%] top-3 z-0 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/40 to-primary rtl:bg-gradient-to-l transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `calc(75% * ${ratio})` }}
        />
        {nodes.map((node, index) => {
          const active = index === cycle.phase
          const reached = index <= cycle.phase
          return (
            <button
              key={node.label}
              type="button"
              onClick={() => {
                cycle.goTo(index)
                cycle.pause()
              }}
              onPointerEnter={cycle.canScrub ? () => cycle.goTo(index) : undefined}
              onFocus={() => cycle.goTo(index)}
              aria-current={active ? 'step' : undefined}
              className="group relative flex cursor-pointer flex-col items-center gap-2.5 rounded-lg px-1 pb-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  'relative z-10 flex size-6 items-center justify-center rounded-lg text-[0.65rem] font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-500 motion-reduce:transition-none',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : reached
                      ? 'bg-primary/15 text-accent-text'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-[0.7rem] leading-tight transition-colors duration-300',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {node.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* One fixed-height slot: the detail changes without the card jumping. */}
      <div className="mt-5 min-h-[4.25rem] rounded-xl bg-muted/50 p-3.5">
        <p
          key={cycle.phase}
          className={cn(
            'text-sm leading-relaxed text-muted-foreground',
            'motion-safe:animate-[demo-fade_0.3s_ease-out]',
          )}
        >
          {nodes[cycle.phase]?.detail}
        </p>
      </div>
    </DemoStage>
  )
}
