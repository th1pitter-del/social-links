'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { useInView, useReducedMotion } from '@/components/motion/reveal'

/**
 * A looping marketing demonstration: the phase advances on its own, and a pointer
 * or a tap takes over the moment the visitor wants to inspect.
 *
 * Shared by every demonstration surface so they behave identically:
 *  - stops when off-screen, so nothing animates invisibly;
 *  - with prefers-reduced-motion the loop never runs, and the visitor still moves
 *    it by hand, because stepping through on request is not unsolicited motion;
 *  - pointer steering is mouse-only (a dragging finger would fight scrolling) and
 *    every phase stays reachable by keyboard through the dots and transport.
 */
export function useDemoCycle({
  phaseCount,
  intervalMs = 2600,
}: {
  phaseCount: number
  intervalMs?: number
}) {
  const reducedMotion = useReducedMotion()
  const { setNode, inView } = useInView<HTMLDivElement>()
  const [phase, setPhase] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (reducedMotion || scrubbing || !playing || !inView) return
    const timer = window.setInterval(() => {
      setPhase((current) => (current + 1) % phaseCount)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [inView, intervalMs, phaseCount, playing, reducedMotion, scrubbing])

  /** Pointer steering for mouse users: the horizontal position *is* the phase. */
  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'mouse') return
      const node = event.currentTarget
      const bounds = node.getBoundingClientRect()
      if (bounds.width === 0) return
      const ratio = (event.clientX - bounds.left) / bounds.width
      const progress = getComputedStyle(node).direction === 'rtl' ? 1 - ratio : ratio
      setPhase(Math.min(phaseCount - 1, Math.max(0, Math.floor(progress * phaseCount))))
    },
    [phaseCount],
  )

  return {
    phaseCount,
    phase,
    reducedMotion,
    inView,
    scrubbing,
    playing,
    canScrub: !reducedMotion,
    goTo: setPhase,
    replay: () => {
      setPlaying(true)
      setPhase(0)
    },
    pause: () => setPlaying(false),
    resume: () => setPlaying(true),
    beginScrub: () => setScrubbing(true),
    endScrub: () => setScrubbing(false),
    onPointerMove,
    /** Attach with ref={cycle.setNode}. */
    setNode,
  }
}

export type DemoCycle = ReturnType<typeof useDemoCycle>

/**
 * The element a demonstration lives in. It carries the in-view callback ref and
 * the pointer steering, so every demo gets the same behaviour from one place.
 */
export function DemoStage({
  cycle,
  label,
  className,
  children,
}: {
  cycle: DemoCycle
  label: string
  className?: string
  children: React.ReactNode
}) {
  /* This project's react-hooks/refs rule reads the callback ref and the handlers
     as ref values because they travel on the same object, and reports every
     property access on it while rendering. Nothing here touches `ref.current`;
     the exception is scoped to the element that wires the cycle up. */
  /* eslint-disable react-hooks/refs */
  const stage = (
    <div
      ref={cycle.setNode}
      onPointerMove={cycle.canScrub ? cycle.onPointerMove : undefined}
      onPointerEnter={cycle.canScrub ? cycle.beginScrub : undefined}
      onPointerLeave={cycle.canScrub ? cycle.endScrub : undefined}
      role="group"
      aria-label={label}
      className={className}
    >
      {children}
    </div>
  )
  /* eslint-enable react-hooks/refs */
  return stage
}

/**
 * The frame every demonstration lives in: a label that states it is only an
 * example, one dot per phase, and the transport controls.
 */
export function DemoShell({
  cycle,
  label,
  phaseLabel,
  children,
  className,
}: {
  cycle: DemoCycle
  label: string
  phaseLabel: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <DemoStage
      cycle={cycle}
      label={label}
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md',
        className,
      )}
    >
      {/* On a phone the label gets its own line instead of being squeezed to
          nothing by the controls - it is the sentence that says this is a demo. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b bg-muted/40 px-4 py-2">
        <p className="flex min-w-0 basis-full items-center gap-2 text-xs font-medium text-muted-foreground sm:basis-auto">
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 rounded-full bg-primary',
              cycle.playing && !cycle.scrubbing && 'motion-safe:animate-pulse',
            )}
          />
          <span className="truncate">{label}</span>
        </p>
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:ms-0">
          <PhaseDots cycle={cycle} />
          <TransportButtons cycle={cycle} />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {phaseLabel}
      </p>
      {children}
    </DemoStage>
  )
}

function PhaseDots({ cycle }: { cycle: DemoCycle }) {
  const t = useTranslations('motion')
  return (
    <span className="flex items-center">
      {Array.from({ length: cycle.phaseCount }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => cycle.goTo(index)}
          aria-label={t('phase', { current: index + 1, total: cycle.phaseCount })}
          aria-current={cycle.phase === index ? 'step' : undefined}
          // Visible and tappable at every width: on a phone these dots are the
          // only way to reach a specific phase. The 20px box is the touch target,
          // the dot inside it is the indicator.
          className="flex size-5 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <span
            aria-hidden
            className={cn(
              'block h-1.5 rounded-full transition-[width,background-color] duration-300',
              cycle.phase === index
                ? 'w-3.5 bg-primary'
                : 'w-1.5 bg-border hover:bg-muted-foreground/50',
            )}
          />
        </button>
      ))}
    </span>
  )
}

function TransportButtons({ cycle }: { cycle: DemoCycle }) {
  const t = useTranslations('motion')
  return (
    <span className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={() => (cycle.playing ? cycle.pause() : cycle.resume())}
        aria-label={cycle.playing ? t('pause') : t('play')}
      >
        {cycle.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        onClick={cycle.replay}
        aria-label={t('replay')}
      >
        <RotateCcw className="size-3.5" />
      </Button>
    </span>
  )
}
