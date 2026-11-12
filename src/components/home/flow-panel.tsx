'use client'

import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { DemoStage, useDemoCycle } from '@/components/motion/demo-cycle'

/**
 * The security claims and the stage diagram as one panel: the claims on the left
 * are also the diagram's controls, so pointing at "server-side tracking" walks
 * the rail to the stage that does it. The stage advances on its own until a
 * pointer or the keyboard takes over, and the detail sits in a fixed slot so the
 * panel never jumps between stages.
 */
export function FlowPanel({
  title,
  body,
  claims,
  diagramTitle,
  nodes,
}: {
  title: string
  body: string
  claims: string[]
  diagramTitle: string
  nodes: { label: string; detail: string }[]
}) {
  const t = useTranslations('motion')
  const cycle = useDemoCycle({ phaseCount: nodes.length, intervalMs: 2600 })
  const ratio = cycle.phase / Math.max(1, nodes.length - 1)

  return (
    <div
      onPointerEnter={cycle.pause}
      onPointerLeave={cycle.resume}
      className="relative overflow-hidden rounded-3xl border bg-card"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_0%_100%,rgba(201,247,42,0.12),transparent)] dark:bg-[radial-gradient(50%_80%_at_0%_100%,rgba(213,255,47,0.09),transparent)]"
      />
      <div className="relative grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="p-6 sm:p-9">
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-4 text-muted-foreground">{body}</p>

          <ul className="mt-6 space-y-1.5">
            {claims.map((claim, index) => {
              const active = cycle.phase === index + 1
              return (
                <li key={claim}>
                  <button
                    type="button"
                    onClick={() => {
                      cycle.goTo(index + 1)
                      cycle.pause()
                    }}
                    onPointerEnter={() => cycle.goTo(index + 1)}
                    onFocus={() => cycle.goTo(index + 1)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start text-sm transition-[background-color,border-color] duration-300 motion-reduce:transition-none',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      active
                        ? 'border-primary/30 bg-muted/50'
                        : 'border-transparent hover:border-border hover:bg-muted/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-px grid size-6 shrink-0 place-items-center rounded-lg text-[0.65rem] font-semibold tabular-nums transition-colors duration-300',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        'leading-relaxed transition-colors duration-300',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {claim}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="border-t bg-muted/25 p-5 sm:p-8 lg:border-s lg:border-t-0">
          <DemoStage cycle={cycle} label={diagramTitle}>
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{diagramTitle}</p>
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
                  className="absolute start-[12.5%] top-3 z-0 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/40 to-primary transition-[width] duration-500 ease-out motion-reduce:transition-none rtl:bg-gradient-to-l"
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
                      onPointerEnter={() => cycle.goTo(index)}
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

              <div className="mt-5 min-h-[4.25rem] rounded-xl bg-muted/50 p-3.5">
                <p
                  key={cycle.phase}
                  className="text-sm leading-relaxed text-muted-foreground motion-safe:animate-[demo-fade_0.3s_ease-out]"
                >
                  {nodes[cycle.phase]?.detail}
                </p>
              </div>
            </div>
          </DemoStage>
        </div>
      </div>
    </div>
  )
}
