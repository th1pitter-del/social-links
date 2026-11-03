'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Lock,
  MousePointer2,
  Share2,
  Unlock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { platformTint, PlatformGlyph } from '@/components/brand-icon'
import { DemoShell, type DemoCycle } from '@/components/motion/demo-cycle'
import { useInView, useReducedMotion } from '@/components/motion/reveal'
import { cn } from 'cn'

/** A demonstration action, flattened by the server page so nothing crosses the client boundary unpicklable. */
export type DemoStep = {
  label: string
  platform: string | null
  icon: string
}

/**
 * One timeline owns the whole automatic demonstration, so two loops can never
 * run at once: each leg awaits the shared cancellable `wait`, and any await that
 * returns false (cancelled, off-screen, or taken over by the visitor) ends the
 * run instead of racing whatever replaces it.
 */
const TIMING = {
  firstPause: 1600,
  travel: 550,
  press: 350,
  betweenTasks: 950,
  readyHold: 1500,
  notice: 2400,
  /** How long a finished row keeps its green wash before settling to neutral. */
  flash: 900,
  /** Outlives the burst itself (1.6s + the widest stagger) so no piece is cut
      off mid-flight when the layer unmounts. */
  celebration: 1900,
  successHold: 2800,
  resetPause: 1000,
  /** Silence after a manual interaction before the timeline takes back over. */
  handback: 7000,
}

const CONFETTI_COLORS = ['bg-primary', 'bg-pulse-lime-soft', 'bg-success']

type PointerState = { x: number; y: number; click: boolean }
type NoticeState = { id: number; text: string; kind: 'success' | 'info' }
type ConfettiPart = { dx: number; dy: number; rot: number; delay: number; color: string }
type BurstState = { id: number; parts: ConfettiPart[] }

/**
 * The hero shows the product instead of describing it: the real unlock card's
 * own layout, tokens and wording (it reuses the `unlock.*` messages), walked by
 * a simulated pointer that completes every step, clicks Unlock, and celebrates.
 *
 * The visitor can take over at any moment by clicking a step or the button;
 * the timeline never overwrites manual progress and resumes from a consistent
 * state once the card has been idle. Nothing here talks to the server, and no
 * real social action is implied - the frame labels it an example.
 */
export function UnlockDemo({
  steps,
  linkTitle,
  linkBody,
  creator,
  demoTag,
  demoLabel,
}: {
  steps: DemoStep[]
  linkTitle: string
  linkBody: string
  creator: string
  demoTag: string
  demoLabel: string
}) {
  const t = useTranslations('unlock')
  const tm = useTranslations('motion')
  const total = steps.length
  const reducedMotion = useReducedMotion()
  const { setNode, inView } = useInView<HTMLDivElement>()

  const [doneFlags, setDoneFlags] = useState<boolean[]>(() => steps.map(() => false))
  // A row only advertises "Completed" for a moment after it is finished; the
  // flags below the tick carry that, so the settled list stays quiet.
  const [flashFlags, setFlashFlags] = useState<boolean[]>(() => steps.map(() => false))
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [burst, setBurst] = useState<BurstState | null>(null)
  const [pointer, setPointer] = useState<PointerState | null>(null)
  const [manual, setManual] = useState(false)
  const [playing, setPlaying] = useState(true)

  // The timeline reads progress through refs so a cancelled run can never
  // act on a stale snapshot of state the visitor just changed.
  const doneRef = useRef<boolean[]>(steps.map(() => false))
  const unlockedRef = useRef(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const noticeSeq = useRef(0)
  const burstSeq = useRef(0)
  const noticeTimer = useRef<number | null>(null)
  const burstTimer = useRef<number | null>(null)
  const handbackTimer = useRef<number | null>(null)
  const flashTimers = useRef(new Map<number, number>())
  const miscTimers = useRef(new Set<number>())

  const doneCount = doneFlags.filter(Boolean).length
  const allDone = doneCount === total
  const phase = unlocked ? total + 1 : doneCount
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      miscTimers.current.delete(id)
      fn()
    }, ms)
    miscTimers.current.add(id)
  }

  // The pointer cue is choreography, not a reaction to the real mouse, and it
  // is pure decoration - so reduced motion hides it and skips its travel.
  const movePointerTo = (node: Element | null) => {
    if (reducedMotion || !node || !bodyRef.current) {
      setPointer(null)
      return
    }
    const body = bodyRef.current.getBoundingClientRect()
    const target = node.getBoundingClientRect()
    setPointer({
      x: target.left - body.left + Math.max(24, target.width - 34),
      y: target.top - body.top + target.height / 2 - 8,
      click: false,
    })
  }

  const showNotice = (text: string, kind: 'success' | 'info' = 'success') => {
    setNotice({ id: ++noticeSeq.current, text, kind })
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), TIMING.notice)
  }

  const hideNotice = () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    setNotice(null)
  }

  const fireBurst = () => {
    if (reducedMotion) return
    // Enough pieces, spread and stagger to read as a celebration at a glance,
    // while the hero's own overflow keeps every one of them inside this card.
    const parts: ConfettiPart[] = Array.from({ length: 28 }, (_, i) => ({
      dx: Math.round((Math.random() - 0.5) * 380),
      dy: Math.round(-40 - Math.random() * 210),
      rot: Math.round((Math.random() - 0.5) * 520),
      delay: Math.round(Math.random() * 260),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
    setBurst({ id: ++burstSeq.current, parts })
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => setBurst(null), TIMING.celebration)
  }

  const clearBurst = () => {
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    setBurst(null)
  }

  const setFlash = (index: number, value: boolean) => {
    setFlashFlags((current) => {
      if (current[index] === value) return current
      const next = [...current]
      next[index] = value
      return next
    })
  }

  /** Show the row's "Completed" pill, then fade it out on its own schedule. */
  const flashDone = (index: number) => {
    setFlash(index, true)
    const existing = flashTimers.current.get(index)
    if (existing !== undefined) window.clearTimeout(existing)
    flashTimers.current.set(
      index,
      window.setTimeout(() => {
        flashTimers.current.delete(index)
        setFlash(index, false)
      }, TIMING.flash),
    )
  }

  const clearFlashes = () => {
    flashTimers.current.forEach((id) => window.clearTimeout(id))
    flashTimers.current.clear()
    setFlashFlags(steps.map(() => false))
  }

  const applyDone = (index: number, value: boolean) => {
    const next = [...doneRef.current]
    next[index] = value
    doneRef.current = next
    setDoneFlags(next)
    if (value) flashDone(index)
    else setFlash(index, false)
  }

  const applyAllDone = (value: boolean) => {
    doneRef.current = steps.map(() => value)
    setDoneFlags(doneRef.current)
    if (value) steps.forEach((_, index) => flashDone(index))
    else clearFlashes()
  }

  const applyUnlocked = (value: boolean) => {
    unlockedRef.current = value
    setUnlocked(value)
  }

  const celebrate = () => {
    applyUnlocked(true)
    setPressed(true)
    later(() => setPressed(false), 300)
    fireBurst()
    showNotice(tm('toastUnlocked'))
  }

  const scheduleHandback = () => {
    if (handbackTimer.current !== null) window.clearTimeout(handbackTimer.current)
    handbackTimer.current = window.setTimeout(() => setManual(false), TIMING.handback)
  }

  const takeOver = () => {
    if (handbackTimer.current !== null) window.clearTimeout(handbackTimer.current)
    setManual(true)
    setPointer(null)
    scheduleHandback()
  }

  const fullReset = () => {
    if (handbackTimer.current !== null) window.clearTimeout(handbackTimer.current)
    hideNotice()
    clearBurst()
    setPointer(null)
    setActiveStep(null)
    applyAllDone(false)
    applyUnlocked(false)
  }

  const completeStepByClick = (index: number) => {
    if (unlockedRef.current || doneRef.current[index]) return
    takeOver()
    applyDone(index, true)
    if (doneRef.current.every(Boolean)) showNotice(tm('toastAllDone'))
    else showNotice(tm('toastTaskDone', { label: steps[index].label }))
  }

  const handleUnlockClick = () => {
    takeOver()
    if (unlockedRef.current) return
    if (doneRef.current.every(Boolean)) {
      celebrate()
      return
    }
    setNudging(true)
    later(() => setNudging(false), 450)
    showNotice(tm('toastStepsFirst'), 'info')
  }

  // The share button is part of the card's presentation, not a live control:
  // it takes the card out of auto-play and says so rather than sharing anything.
  const handleShareClick = () => {
    takeOver()
    showNotice(tm('toastDemoOnly'), 'info')
  }

  // The frame's shared transport expects the shape of `useDemoCycle`; this
  // card drives its own timeline instead, and `canScrub: false` is what keeps
  // the pointer off the phase - hovering must never steer the demo.
  const cycle: DemoCycle = {
    phaseCount: total + 2,
    phase,
    reducedMotion,
    inView,
    scrubbing: false,
    playing,
    canScrub: false,
    goTo: (value) => {
      const next = typeof value === 'function' ? value(phase) : value
      takeOver()
      if (next <= 0) {
        applyAllDone(false)
        applyUnlocked(false)
      } else if (next >= total + 1) {
        applyAllDone(true)
        applyUnlocked(true)
      } else {
        applyAllDone(false)
        for (let i = 0; i < next; i++) applyDone(i, true)
        applyUnlocked(false)
      }
    },
    replay: () => {
      fullReset()
      setPlaying(true)
      setManual(false)
    },
    pause: () => setPlaying(false),
    resume: () => {
      setPlaying(true)
      setManual(false)
    },
    beginScrub: () => {},
    endScrub: () => {},
    onPointerMove: () => {},
    setNode,
  }

  useEffect(() => {
    const timers = miscTimers.current
    const flashes = flashTimers.current
    return () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
      if (handbackTimer.current !== null) window.clearTimeout(handbackTimer.current)
      flashes.forEach((id) => window.clearTimeout(id))
      flashes.clear()
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  // The timeline proper. Under reduced motion it never runs and no cue, burst
  // or sheen renders: the card stays exactly as the visitor left it, and every
  // step, dot and button still works, because motion on request is not
  // unsolicited motion.
  useEffect(() => {
    if (reducedMotion || manual || !playing || !inView) return

    let cancelled = false
    const pending = new Map<number, (ok: boolean) => void>()
    const wait = (ms: number) =>
      new Promise<boolean>((resolve) => {
        const id = window.setTimeout(() => {
          pending.delete(id)
          resolve(!cancelled)
        }, ms)
        pending.set(id, resolve)
      })

    const run = async () => {
      if (!(await wait(TIMING.firstPause))) return
      for (;;) {
        let index = doneRef.current.findIndex((flag) => !flag)
        while (index !== -1) {
          setActiveStep(index)
          movePointerTo(rowRefs.current[index] ?? ctaRef.current)
          if (!(await wait(TIMING.travel))) return
          setPointer((current) => (current ? { ...current, click: true } : current))
          if (!(await wait(TIMING.press))) return
          applyDone(index, true)
          showNotice(tm('toastTaskDone', { label: steps[index].label }))
          if (!(await wait(250))) return
          setPointer((current) => (current ? { ...current, click: false } : current))
          setActiveStep(null)
          index = doneRef.current.findIndex((flag) => !flag)
          if (index !== -1 && !(await wait(TIMING.betweenTasks))) return
        }

        if (unlockedRef.current) {
          // Resumed onto the delivered state (manual finish, or a tap on the
          // last dot): hold it, then hand the card back to the loop.
          if (!(await wait(TIMING.successHold))) return
        } else {
          showNotice(tm('toastAllDone'))
          if (!(await wait(TIMING.readyHold))) return
          movePointerTo(ctaRef.current)
          if (!(await wait(TIMING.travel))) return
          setPointer((current) => (current ? { ...current, click: true } : current))
          if (!(await wait(TIMING.press))) return
          setPointer((current) => (current ? { ...current, click: false } : current))
          celebrate()
          if (!(await wait(TIMING.successHold))) return
        }

        setPointer(null)
        setActiveStep(null)
        hideNotice()
        clearBurst()
        applyUnlocked(false)
        applyAllDone(false)
        if (!(await wait(TIMING.resetPause + TIMING.firstPause))) return
      }
    }
    run()

    return () => {
      cancelled = true
      pending.forEach((resolve, id) => {
        window.clearTimeout(id)
        resolve(false)
      })
      pending.clear()
    }
    // The helpers above only touch refs and setters, so capturing them from
    // one render is safe; re-running the timeline when their identity changes
    // would restart the loop mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, manual, playing, inView, total])

  const phaseLabel = unlocked
    ? tm('phaseUnlocked')
    : doneCount > 0
      ? t('stepsCount', { done: doneCount, total })
      : tm('phaseIdle')

  return (
    <div className="relative">
      {burst ? (
        // Sits over the card, not inside it: the celebration may leave the
        // card's rounded frame but stays within the hero section's bounds, and
        // `pointer-events-none` means it never eats a click.
        <div key={burst.id} aria-hidden className="pointer-events-none absolute inset-0 z-20">
          <span className="absolute left-[60%] top-[80%]">
            {burst.parts.map((part, i) => (
              <span
                key={i}
                className={cn(
                  'absolute block size-2 rounded-[3px] motion-safe:animate-[demo-confetti_1.6s_ease-out_forwards]',
                  part.color,
                )}
                style={
                  {
                    '--demo-x': `${part.dx}px`,
                    '--demo-y': `${part.dy}px`,
                    '--demo-r': `${part.rot}deg`,
                    animationDelay: `${part.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        </div>
      ) : null}

      <DemoShell
        cycle={cycle}
        label={demoLabel}
        phaseLabel={phaseLabel}
        className={cn(
          'transition-[box-shadow,border-color] duration-500 motion-reduce:transition-none',
          unlocked && 'border-primary/50 shadow-primary/15',
        )}
      >
        {/* The extra bottom padding is the notice's lane: it rides the bottom
            edge of the card, and without the reserve it lands on top of the
            call to action it is commenting on. */}
        <div ref={bodyRef} className="relative px-4 pt-4 pb-11">
          {/* A lime wash bleeding in from the upper-left, echoing the glow the
              hero section itself carries behind the card. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-14 h-32 w-48 rounded-full bg-primary/[0.07] blur-2xl dark:bg-primary/15"
          />
          {/* A second, dimmer pool behind the task list. Frosted rows need
              something to frost: over a flat surface `backdrop-blur` is a
              no-op, so the light has to exist under them. The light theme keeps
              both pools faint, or the white card stops reading as white. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -right-12 h-52 w-80 rounded-full bg-primary/[0.05] blur-3xl dark:bg-primary/10"
          />

          {/* Toast slot: absolutely positioned so the card never reflows while
              notifications come and go. It rides the bottom edge, over the
              (static) call-to-action's lower edge, rather than the top - the
              title, creator and step list all stay readable while it shows. */}
          {notice ? (
            <p
              key={notice.id}
              role="status"
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-1.5 z-30 mx-auto flex w-fit max-w-[85%] items-center gap-1.5 rounded-full border bg-popover/95 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm motion-safe:animate-[demo-fade_0.25s_ease-out]',
                notice.kind === 'success'
                  ? 'border-success/30 text-emerald-700 dark:text-success'
                  : 'border-border text-muted-foreground',
              )}
            >
              {notice.kind === 'success' ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <Info className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{notice.text}</span>
            </p>
          ) : null}

          {/* The simulated pointer, measured against the card body. */}
          {pointer ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-40 transition-transform duration-500 ease-out motion-reduce:hidden"
              style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}
            >
              <MousePointer2
                className={cn(
                  'size-4 fill-background text-foreground drop-shadow-sm transition-transform duration-150',
                  pointer.click && 'scale-75',
                )}
              />
              {pointer.click ? (
                <span
                  key={`${pointer.x}-${pointer.y}`}
                  className="absolute inset-0 rounded-full border border-primary motion-safe:animate-[demo-ripple_0.6s_ease-out]"
                />
              ) : null}
            </span>
          ) : null}

          {/* The header: content title, creator line and a secondary share
              control, on the same type scale the rest of the site uses
              (`font-semibold tracking-tight` headings, `text-sm` muted body,
              `text-[0.65rem]` chips). It is deliberately static - the pointer,
              toasts and confetti all live below or beside it, so the card's
              identity never bounces while the demo runs. */}
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base leading-tight font-semibold tracking-tight text-balance">
                {linkTitle}
              </h2>
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span className="truncate font-medium text-foreground">{creator}</span>
                <BadgeCheck
                  className="size-3.5 shrink-0 fill-primary text-primary-foreground"
                  aria-label={tm('verifiedCreator')}
                />
                <span className="shrink-0 rounded-full border bg-muted/40 px-2 py-0.5 text-[0.65rem] font-medium">
                  {demoTag}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleShareClick}
              aria-label={t('share')}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
          <p className="relative mt-2 text-sm text-muted-foreground">{linkBody}</p>

          {/* The task list flows directly out of the header - no divider, no
              nested card - so title, creator and steps read as one stack. */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                {t('stepsTitle')}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t('stepsCount', { done: doneCount, total })}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('stepsTitle')}
              className="mt-2 flex h-1 w-full items-center overflow-hidden rounded-full bg-muted"
            >
              {/* Width, not the shadcn indicator's translateX: a translated fill
                  slides the wrong way in RTL, and this page serves Arabic too. */}
              <div
                className={cn(
                  'h-full rounded-full bg-primary motion-reduce:transition-none',
                  // The loop restarts at zero; draining that over the fill's
                  // own duration would leave the bar full while the counter
                  // already reads 0 of 4. Only forward progress animates.
                  percent === 0 ? 'transition-none' : 'transition-[width] duration-700 ease-out',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>

            <ol className="mx-auto mt-3 w-[92%] space-y-2">
              {steps.map((step, index) => {
                const done = doneFlags[index]
                const current = activeStep === index
                const clickable = !done && !unlocked
                const flash = flashFlags[index]
                const tint = platformTint(step.platform)
                return (
                  <li
                    key={`${step.platform}-${step.icon}-${index}`}
                    ref={(element) => {
                      rowRefs.current[index] = element
                    }}
                    className="overflow-hidden rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => completeStepByClick(index)}
                      disabled={!clickable}
                      style={
                        tint
                          ? ({
                              '--tint-l': tint.light,
                              '--tint-d': tint.dark,
                              '--ramp-l': tint.rampLight,
                              '--ramp-d': tint.rampDark,
                            } as React.CSSProperties)
                          : undefined
                      }
                      className={cn(
                        // Glass: the brand wash stays a background-color and the
                        // top-down ramp a background-image, so both paint
                        // together and the blur frosts whatever sits behind them.
                        'relative flex w-full items-center justify-center gap-3 px-4 py-3.5 text-sm backdrop-blur-md transition-[filter,background-color] duration-500 motion-reduce:transition-none',
                        // A finished task drops its brand wash and settles to
                        // the neutral surface instead: only what is still to do
                        // keeps a color.
                        done
                          ? 'bg-muted/50 bg-gradient-to-b from-black/5 to-transparent dark:from-white/10'
                          : tint
                            ? 'bg-[var(--tint-l)] bg-gradient-to-b from-[var(--ramp-l)] to-transparent dark:bg-[var(--tint-d)] dark:from-[var(--ramp-d)]'
                            : 'bg-transparent',
                        // The tick itself is the news; the row only washes green
                        // for a moment to show where it happened, then settles
                        // to the neutral surface with the badge left behind.
                        done && flash && 'bg-success/15',
                        // The step being demonstrated lifts its own brand colour
                        // rather than turning lime, so the platform stays legible
                        // at the moment it matters most; the accent belongs to
                        // the border and the pointer.
                        current && !done && 'brightness-110 dark:brightness-135',
                        clickable && 'cursor-pointer hover:brightness-105 dark:hover:brightness-125',
                      )}
                    >
                      <PlatformGlyph
                        platform={step.platform}
                        icon={step.icon}
                        neutral
                        className={cn(
                          // The row is already washed in this platform's colour,
                          // so the glyph wears the text colour instead: brand on
                          // brand would leave nothing to see.
                          'size-6 shrink-0 transition-colors duration-500 motion-reduce:transition-none',
                          done ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      />
                      <span
                        className={cn(
                          'min-w-0 truncate font-medium',
                          // Struck through as well as greyed: the two together
                          // are what makes a finished task read as finished at
                          // a glance, rather than as a row that lost its colour.
                          done && 'text-muted-foreground line-through decoration-muted-foreground/50',
                        )}
                      >
                        {step.label}
                      </span>
                      {/* The completed badge sits at the trailing edge in a slot
                          that takes no part in the row's layout, so the icon and
                          label stay truly centered and the row never changes
                          height as tasks finish. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 end-4 flex items-center"
                      >
                        <span
                          className={cn(
                            'flex size-5 items-center justify-center rounded-full bg-success/15 text-emerald-600 ring-1 ring-success/30 dark:text-success',
                            done
                              ? 'motion-safe:animate-[demo-check_0.24s_ease-out]'
                              : 'opacity-0',
                          )}
                        >
                          <Check className="size-3 shrink-0 strokeWidth={3}" />
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {/* One slot, two buttons: cross-fading them keeps the card the same
                height, so the section never shifts while the loop runs. The
                hidden one leaves the tab order. The slot matches a task row
                (14px padding + 24px glyph) so the call to action reads as the
                fifth row rather than a smaller control. */}
            <div ref={ctaRef} className="relative mx-auto mt-3 h-[3.25rem] w-[92%]">
              <Button
                size="sm"
                // Neutral until the tasks are all in, lime the moment the
                // reward is real: the color itself is the progress signal, so
                // no dimming or label is needed on top of it.
                variant={allDone ? 'default' : 'secondary'}
                onClick={handleUnlockClick}
                tabIndex={unlocked ? -1 : 0}
                aria-disabled={!allDone}
                className={cn(
                  'absolute inset-0 h-full rounded-xl text-sm [&_svg]:size-4',
                  'transition-[opacity,transform,background-color,color] duration-500',
                  unlocked ? 'pointer-events-none opacity-0' : 'opacity-100',
                  pressed && 'scale-95',
                  nudging && 'motion-safe:animate-[demo-shake_0.4s_ease-in-out]',
                )}
              >
                {allDone && !unlocked ? <Unlock /> : <Lock />}
                {t('unlockButton')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  takeOver()
                  // "Open content" in the demo hands the card back to the
                  // timeline from a clean state; it never navigates anywhere.
                  fullReset()
                  setManual(false)
                }}
                tabIndex={unlocked ? 0 : -1}
                className={cn(
                  'absolute inset-0 h-full rounded-xl text-sm [&_svg]:size-4',
                  'transition-opacity duration-300',
                  unlocked ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <ExternalLink />
                {t('openContent')}
              </Button>
            </div>
          </div>
        </div>
      </DemoShell>
    </div>
  )
}
