'use client'

import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

/**
 * What happens between a visitor clicking a link and the content arriving. The
 * pulse travelling the rail is the explanation: hovering a node stops the loop
 * and shows that stage's detail, so the animation is a way of reading the
 * mechanism, not decoration over it.
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

  return (
    <DemoStage cycle={cycle} label={title} className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-[0.7rem] text-muted-foreground tabular-nums">
          {t('nodeOf', { current: cycle.phase + 1, total: nodes.length })}
        </p>
      </div>

      <div className="relative mt-6 grid grid-cols-4 gap-2">
        <span aria-hidden className="absolute inset-x-3 top-2 h-px bg-border" />
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
              className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg px-1 py-0.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  'relative z-10 size-4 rounded-full border-2 bg-card transition-[border-color,transform,background-color] duration-300',
                  reached ? 'border-primary' : 'border-border',
                  active && 'scale-125 bg-primary',
                )}
              />
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
      <div className="mt-5 min-h-11 rounded-xl bg-muted/50 px-4 py-2.5">
        <p
          key={cycle.phase}
          className={cn(
            'text-xs text-muted-foreground',
            'motion-safe:animate-[demo-fade_0.3s_ease-out]',
          )}
        >
          {nodes[cycle.phase]?.detail}
        </p>
      </div>
    </DemoStage>
  )
}
