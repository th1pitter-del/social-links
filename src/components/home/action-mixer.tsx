'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { cn } from 'cn'

import { PlatformGlyph, brandAccentFor } from '@/components/brand-icon'
import { actionIcon } from '@/lib/action-icons'
import { useInView, useReducedMotion } from '@/components/motion/reveal'

export type DemoPlatform = {
  key: string
  label: string
  icon: string
  actions: { key: string; label: string; icon: string }[]
}

/*
 * The ring of platforms advances one logo at a time, so the stage has a fixed size
 * in every state: the open or closed platform cannot move the rest of the page.
 * Everything below the rail - the trunk room and the rows of actions - is reserved
 * up front from the largest platform the deployment has switched on.
 */
const NEIGHBOURS = 2
const TRAVEL_MS = 620
const DRAW_MS = 300
const LEAF_MS = 170
const STAGGER_MS = 30
const RETRACT_MS = 260
/** The branches stay open for three to four seconds before the ring moves on. */
const HOLD_MS = 3400
const TRUNK_ROOM = 76
const LEAF_H = 30
const LEAF_GAP = 8
const GRID_PAD = 6
const EASE = 'cubic-bezier(0.22, 0.61, 0.24, 1)'

type Phase = 'travel' | 'hold' | 'retract'
type Metrics = { slots: number; logo: number; step: number; railH: number }
type Grid = { cols: number; leafW: number; rows: number; height: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * The centre logo is the largest thing on the stage and the emphasis falls away
 * from it. The composition is five logos wide from a tablet up and three on a
 * phone, where five marks of any size would be illegible side by side.
 */
function metricsFor(width: number): Metrics {
  const slots = width >= 640 ? NEIGHBOURS : 1
  const logo = Math.round(clamp(width * 0.145, 64, 120))
  const smallest = logo / (1 + 0.55 * slots)
  // The rail dissolves its own outer edge, so the fifth logo is fitted inside
  // that fade rather than inside the container: five logos stay legible, and a
  // partial mark is only ever the one arriving from beyond them.
  const clear = Math.max(12, width * 0.05)
  const step = Math.min(
    Math.round(logo * 1.5),
    Math.floor((width / 2 - clear - smallest / 2) / slots),
  )
  return { slots, logo, step, railH: logo }
}

function gridFor(count: number, width: number, railH: number): Grid {
  const cols = width >= 900 ? 4 : width >= 560 ? 3 : 2
  const rows = Math.max(1, Math.ceil(count / cols))
  const leafW = Math.floor((width - GRID_PAD * 2 - (cols - 1) * LEAF_GAP) / cols)
  return {
    cols,
    leafW,
    rows,
    height: railH + TRUNK_ROOM + rows * (LEAF_H + LEAF_GAP) - LEAF_GAP + 10,
  }
}

/** Side logos shrink away from the centre without ever inverting their order. */
function scaleFor(slot: number) {
  return 1 / (1 + 0.55 * Math.abs(slot))
}

/** The shortest signed distance from the centre of the ring, so the row wraps. */
function slotFor(index: number, center: number, count: number) {
  if (count === 0) return 0
  const forward = (((index - center) % count) + count) % count
  return forward > count / 2 ? forward - count : forward
}

/**
 * Down out of the logo, then a bend that arrives on the leaf from directly above,
 * so each line reads as grown from the platform rather than drawn near it.
 */
function rootPath(ox: number, oy: number, lx: number, ly: number) {
  const drop = (ly - oy) * 0.55
  return `M ${ox} ${oy} C ${ox} ${oy + drop} ${lx} ${ly - drop} ${lx} ${ly}`
}

/** The nodule where a root meets a leaf - it arrives with the leaf, not with the line. */
function nodeStyle(reducedMotion: boolean, drawn: boolean, delay: number): CSSProperties {
  return {
    opacity: drawn ? 0.9 : 0,
    transitionProperty: 'opacity',
    transitionDuration: `${reducedMotion ? 0 : LEAF_MS}ms`,
    transitionDelay: drawn && !reducedMotion ? `${delay}ms` : '0ms',
  }
}

/**
 * Which actions a link can ask for, taken from the platforms and options actually
 * configured in the database - not a hard-coded marketing list.
 *
 * The ring turns by itself: one platform reaches the centre, its actions grow out of
 * it on drawn roots in that brand's own colour, hold for a few seconds, retract, and
 * the ring moves on. A pointer on a side logo stops the walk so it can be inspected
 * and a click or a tap walks it to the centre and keeps it open while it is read;
 * leaving hands the sequence back. Nothing has to be hovered to be seen, and reduced
 * motion gets the same composition with the roots already grown and nothing walking.
 */
export function ActionMixer({ platforms }: { platforms: DemoPlatform[] }) {
  const locale = useLocale()
  const { resolvedTheme } = useTheme()
  // The ring is symmetric, so only the direction it turns in changes with the
  // page: in RTL the next platform arrives from the left.
  const flow = locale === 'ar' ? -1 : 1
  const reducedMotion = useReducedMotion()
  const { setNode, inView } = useInView<HTMLDivElement>()

  const [center, setCenter] = useState(0)
  const [phase, setPhase] = useState<Phase>('travel')
  const [grown, setGrown] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [width, setWidth] = useState(0)

  const stageRef = useRef<HTMLDivElement | null>(null)

  const count = platforms.length
  // A platform disabled in admin since this render can leave the saved index past
  // the end of the list; the ring reads the last one instead of rendering nothing.
  const centerIndex = count === 0 ? 0 : Math.min(center, count - 1)
  const active = platforms[centerIndex] ?? null
  const held = phase === 'hold'
  // Off-screen there is nothing to watch, so the ring stops burning frames; with
  // reduced motion it never walks at all and the roots are simply grown.
  const walking = !reducedMotion && inView && count > 1
  // The roots stay mounted through the retract so they can draw back down; the
  // next platform only takes the stage once the old one has left it.
  const open = phase !== 'travel' || reducedMotion
  // A pointer parked on a side logo, or a platform someone is reading, stops the
  // ring handing the stage to the next one - but never the move already in flight,
  // so the logo that is travelling still arrives and opens instead of freezing
  // half-way with nothing grown.
  const frozen = phase !== 'travel' && (inspecting || pinned)
  const drawn = grown || reducedMotion

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    // Reported on observe, so nothing is measured during render.
    const observer = new ResizeObserver(() => setWidth(stage.clientWidth))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // One effect owns the whole walk: it schedules the single transition out of the
  // current phase, which is why a click during an automatic move cannot leave two
  // animations competing for the same logo. The idle line turns over with each new
  // platform, never in the middle of one that is open.
  useEffect(() => {
    if (!walking || frozen || !active) return
    const ms = phase === 'travel' ? TRAVEL_MS : phase === 'hold' ? HOLD_MS : RETRACT_MS
    const timer = window.setTimeout(() => {
      if (phase === 'travel') {
        setPhase('hold')
        setGrown(true)
      } else if (phase === 'hold') {
        setPhase('retract')
        setGrown(false)
      } else {
        setPhase('travel')
        setCenter((current) => (current + 1) % count)
      }
    }, ms)
    return () => window.clearTimeout(timer)
  }, [walking, frozen, phase, centerIndex, count, active])

  const release = () => {
    if (!pinned) return
    setPinned(false)
    if (held) {
      setPhase('retract')
      setGrown(false)
    }
  }

  const walkTo = (index: number, { keep }: { keep: boolean }) => {
    if (index === centerIndex) {
      // Entering the platform that is already open must not re-arm the growth, and
      // must not retract it either: the roots are driven by the phase, not by this.
      if (keep && pinned) release()
      else if (keep) setPinned(true)
      return
    }
    setPinned(keep)
    setCenter(index)
    setPhase('travel')
    setGrown(false)
  }

  const leaveStage = () => {
    setInspecting(false)
    release()
  }

  const metrics = metricsFor(width || 600)
  const accent = active ? brandAccentFor(active.key, resolvedTheme !== 'light') : undefined
  const grid = gridFor(active?.actions.length ?? 1, width || 600, metrics.railH)
  const reserve = gridFor(
    platforms.reduce((max, platform) => Math.max(max, platform.actions.length), 1),
    width || 600,
    metrics.railH,
  )
  const originX = (width || 600) / 2

  const roots = useMemo(() => {
    if (!active || width === 0) return []
    const total = active.actions.length
    return active.actions.map((action, index) => {
      const row = Math.floor(index / grid.cols)
      const col = index % grid.cols
      // A short last row sits under the logo instead of hanging off one side, so
      // the composition stays balanced however many actions a platform has.
      const inRow = Math.min(grid.cols, total - row * grid.cols)
      const blockW = inRow * grid.leafW + (inRow - 1) * LEAF_GAP
      const x = (width - blockW) / 2 + col * (grid.leafW + LEAF_GAP)
      const y = metrics.railH + TRUNK_ROOM + row * (LEAF_H + LEAF_GAP)
      return {
        action,
        index,
        depth: row,
        x,
        y,
        d: rootPath(originX, metrics.railH, x + grid.leafW / 2, y),
      }
    })
  }, [active, grid.cols, grid.leafW, metrics.railH, originX, width])

  if (!active) return null

  return (
    <div className="mt-12">
      <div
        ref={(node) => {
          setNode(node)
          stageRef.current = node
        }}
        onPointerLeave={leaveStage}
        className="relative"
        style={
          {
            // Open or closed, the field keeps the same outer dimensions.
            height: reserve.height,
            '--brand': accent ?? 'color-mix(in oklab, var(--foreground) 55%, transparent)',
          } as CSSProperties
        }
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 overflow-clip',
            '[mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]',
          )}
          style={{ height: metrics.railH }}
          onBlur={() => setInspecting(false)}
        >
          {platforms.map((platform, index) => {
            const slot = slotFor(index, centerIndex, count)
            const distance = Math.abs(slot)
            const isActive = index === centerIndex
            // Past the reserved window a logo leaves at the edge of the stage and
            // returns at the other, which no transition could draw without a jump;
            // it fades and shrinks on the way, so the wrap is never visible.
            const outside = distance > metrics.slots
            const scale = scaleFor(Math.min(distance, metrics.slots))
            return (
              <button
                key={platform.key}
                type="button"
                aria-label={platform.label}
                title={platform.label}
                aria-expanded={isActive}
                aria-controls="action-roots"
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') setInspecting(!isActive)
                }}
                onFocus={() => {
                  setInspecting(true)
                  walkTo(index, { keep: false })
                }}
                onClick={() => walkTo(index, { keep: true })}
                className={cn(
                  'absolute left-1/2 flex items-center justify-center rounded-full',
                  'transition-[transform,opacity,background-color] focus-visible:outline-2',
                  'focus-visible:outline-offset-4 focus-visible:outline-ring',
                  outside && 'pointer-events-none',
                )}
                style={{
                  top: 0,
                  width: metrics.logo,
                  height: metrics.logo,
                  opacity: outside ? 0 : 1 / (1 + 0.45 * distance),
                  transform: `translate(-50%, 0) translateX(${flow * slot * metrics.step}px) scale(${scale})`,
                  transitionDuration: reducedMotion ? '0ms' : `${TRAVEL_MS}ms`,
                  transitionTimingFunction: EASE,
                  backgroundColor: isActive
                    ? 'color-mix(in oklab, var(--brand) 16%, transparent)'
                    : 'transparent',
                }}
              >
                <span
                  style={{ width: metrics.logo * 0.46, height: metrics.logo * 0.46 }}
                  className="shrink-0"
                >
                  <PlatformGlyph
                    platform={platform.key}
                    icon={platform.icon}
                    className="size-full text-muted-foreground/80"
                  />
                </span>
              </button>
            )
          })}
        </div>

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full fill-none"
          style={{ stroke: 'var(--brand)', color: 'var(--brand)' }}
        >
          {open &&
            roots.map((root) => (
              <path
                key={`${active.key}-${root.action.key}`}
                d={root.d}
                pathLength={1}
                strokeWidth={1.25}
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: drawn ? 0 : 1,
                  opacity: drawn ? 1 : 0,
                  // Further roots sit back a little, so the fan reads as one plant.
                  strokeOpacity: 0.85 - root.depth * 0.22,
                  transitionProperty: 'stroke-dashoffset, opacity',
                  transitionDuration: `${reducedMotion ? 0 : DRAW_MS}ms`,
                  transitionDelay: drawn && !reducedMotion ? `${root.index * STAGGER_MS}ms` : '0ms',
                }}
              />
            ))}
          {open && (
            <circle
              cx={originX}
              cy={metrics.railH}
              r={2}
              stroke="none"
              fill="currentColor"
              style={nodeStyle(reducedMotion, drawn, 0)}
            />
          )}
          {open &&
            roots.map((root) => (
              <circle
                key={`node-${active.key}-${root.action.key}`}
                cx={root.x + grid.leafW / 2}
                cy={root.y}
                r={1.75}
                stroke="none"
                fill="currentColor"
                style={nodeStyle(reducedMotion, drawn, DRAW_MS + root.index * STAGGER_MS)}
              />
            ))}
        </svg>

        <ul id="action-roots" className="absolute inset-x-0 top-0 h-full">
          {open &&
            roots.map((root) => {
              const Icon = actionIcon(root.action.icon)
              return (
                <li
                  key={`${active.key}-${root.action.key}`}
                  title={root.action.label}
                  className="absolute flex items-center justify-center gap-1.5 px-1 text-xs font-medium text-foreground transition-[opacity,transform] ease-out motion-reduce:transition-none"
                  style={{
                    left: root.x,
                    top: root.y,
                    width: grid.leafW,
                    height: LEAF_H,
                    opacity: drawn ? 1 : 0,
                    transform: drawn ? 'none' : 'translateY(-5px) scale(0.97)',
                    transitionDuration: `${reducedMotion ? 0 : LEAF_MS}ms`,
                    transitionDelay:
                      drawn && !reducedMotion ? `${DRAW_MS + root.index * STAGGER_MS}ms` : '0ms',
                  }}
                >
                  <Icon
                    className="size-3.5 shrink-0"
                    style={{ color: 'var(--brand)' }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">{root.action.label}</span>
                </li>
              )
            })}
        </ul>
      </div>
    </div>
  )
}
