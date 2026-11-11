'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, ArrowUpRight, FileText, Link2 } from 'lucide-react'

import { BrandIcon } from '@/components/brand-icon'
import { useInView, useReducedMotion } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import {
  bioButtonVisual,
  bioHeadingStyle,
  resolveBioTheme,
} from '@/lib/bio-themes'
import { cn } from 'cn'

type FanFrame = {
  /** Centre of the card, as a percentage of the stage. */
  x: number
  y: number
  rotate: number
  /** Card width as a share of the stage. */
  width: number
}

type FanCard = {
  /** A preset from `bio-themes`; each card previews a different look. */
  theme: string
  fan: FanFrame
  /** The three-card fan for phones; cards without one are hidden there. */
  phone?: FanFrame
  drift: { x: number; y: number; rotate: number }
  /** Ambient loop length in ms and its phase offset, so no two cards sync. */
  duration: number
  delay: number
  /** Cards behind the centre one sit in shadow, as in the reference. */
  dim?: number
  z: number
}

// A five-card fan traced from the reference: one larger centre card with the
// earlier cards peeking out either side, each rotated a little further.
const CARDS: FanCard[] = [
  {
    theme: 'luxury',
    fan: { x: 15.9, y: 52.7, rotate: -7, width: 18.3 },
    drift: { x: -1.2, y: 0.8, rotate: -1.1 },
    duration: 12_400,
    delay: -3_200,
    dim: 0.74,
    z: 1,
  },
  {
    theme: 'midnight',
    fan: { x: 31.2, y: 52, rotate: -3.5, width: 19.7 },
    phone: { x: 22.5, y: 53.5, rotate: -6, width: 31 },
    drift: { x: -1, y: -0.9, rotate: 1 },
    duration: 10_900,
    delay: -5_100,
    dim: 0.88,
    z: 2,
  },
  {
    theme: 'sunset',
    fan: { x: 51, y: 51, rotate: 0, width: 23 },
    phone: { x: 50, y: 52, rotate: 0, width: 36 },
    drift: { x: 0.6, y: -1.1, rotate: 0.7 },
    duration: 13_200,
    delay: -1_400,
    z: 4,
  },
  {
    theme: 'glass-card',
    fan: { x: 68.4, y: 51.5, rotate: 3.5, width: 19.7 },
    phone: { x: 77.5, y: 53.5, rotate: 6, width: 31 },
    drift: { x: 1.1, y: 0.9, rotate: -0.9 },
    duration: 11_700,
    delay: -6_100,
    dim: 0.88,
    z: 2,
  },
  {
    theme: 'neo-brutalist',
    fan: { x: 84.4, y: 52.4, rotate: 7, width: 18.3 },
    drift: { x: 1.3, y: 0.7, rotate: 1.2 },
    duration: 12_800,
    delay: -4_400,
    dim: 0.74,
    z: 1,
  },
]

type CardCopy = {
  bio: string
  video: string
  guide: string
  playlist: string
}

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia('(min-width: 640px)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** The desktop fan is the art-directed default; phones get the three-card fan. */
function useWideStage() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia('(min-width: 640px)').matches,
    () => true,
  )
}

/**
 * A miniature bio page in one of the product's real presets. Same pieces as the
 * live page - avatar, name, handle, link buttons - with the theme's own palette,
 * typography and button shapes, so the fan reads as five themes, not five mocks.
 */
function Card({ card, wide, copy }: { card: FanCard; wide: boolean; copy: CardCopy }) {
  const frame = wide ? card.fan : (card.phone ?? card.fan)
  const theme = resolveBioTheme(card.theme)
  const palette = theme.palette
  const heading = bioHeadingStyle(theme)
  const button = bioButtonVisual(theme.id, null)
  const backdrop =
    theme.backdrop === 'none'
      ? `radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, ${palette.accent} 26%, transparent), transparent 70%)`
      : theme.backdrop

  const links = [
    { platform: 'youtube', icon: null, label: copy.video },
    { platform: null, icon: 'file', label: copy.guide },
    { platform: 'spotify', icon: null, label: copy.playlist },
  ]

  return (
    <div
      data-card={card.theme}
      className={cn(
        'absolute origin-center overflow-hidden',
        !card.phone && 'hidden sm:block',
      )}
      style={{
        left: `${frame.x}%`,
        top: `${frame.y}%`,
        width: `${frame.width}%`,
        aspectRatio: '0.58',
        transform: `translate(-50%, -50%) rotate(${frame.rotate}deg)`,
        borderRadius: 'clamp(8px, 2cqw, 14px)',
        boxShadow:
          card.z > 2
            ? '0 30px 70px -28px rgba(0, 0, 0, 0.78)'
            : '0 22px 50px -26px rgba(0, 0, 0, 0.65)',
        filter: card.dim ? `brightness(${card.dim})` : undefined,
        zIndex: card.z,
        willChange: 'transform',
      }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          backgroundColor: palette.background,
          color: palette.text,
          fontFamily: theme.bodyFont,
          containerType: 'inline-size',
        }}
      >
        <div
          className="relative flex h-[32%] shrink-0 items-center justify-center"
          style={{
            backgroundImage: backdrop,
            backgroundSize: theme.backdropSize ?? 'cover',
            backgroundRepeat: 'no-repeat',
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <span
            className="absolute top-[4cqw] left-[4cqw] flex items-center gap-[1.6cqw] rounded-full border px-[2.2cqw] py-[1.2cqw]"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text,
            }}
          >
            <BrandIcon platform="youtube" neutral className="size-[3.2cqw]" />
            <BrandIcon platform="instagram" neutral className="size-[3.2cqw]" />
          </span>
          <span
            className="absolute bottom-0 left-1/2 grid size-[20cqw] -translate-x-1/2 translate-y-1/2 place-items-center rounded-full text-[7.4cqw] font-bold"
            style={{
              backgroundColor: palette.accent,
              color: palette.onAccent,
              boxShadow: `0 0 0 2px ${palette.surface}`,
            }}
          >
            LP
          </span>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col px-[7cqw] pt-[12cqw] pb-[6cqw]"
          style={{ backgroundColor: palette.surface }}
        >
          <p
            className="truncate text-center leading-tight"
            style={{ ...heading, fontSize: '8cqw', color: palette.text }}
          >
            Lina Park
          </p>
          <p
            className="mt-[1.4cqw] flex items-center justify-center gap-[1.4cqw] text-[5.4cqw]"
            style={{ color: palette.muted }}
          >
            <Link2 className="size-[3.8cqw] shrink-0" />
            <span className="truncate">/bio/lina</span>
          </p>
          <p
            className="mt-[3.6cqw] line-clamp-2 text-center text-[5.4cqw] leading-[1.35]"
            style={{ color: palette.muted }}
          >
            {copy.bio}
          </p>

          <div className="mt-[4.2cqw] flex flex-col gap-[2cqw]">
            {links.map((link) => (
              <div
                key={link.label}
                className="flex items-center gap-[2.4cqw] border px-[3.2cqw] py-[2.6cqw] text-[5.4cqw]"
                style={{
                  backgroundColor: button.backgroundColor,
                  backgroundImage: button.backgroundImage,
                  color: button.color,
                  borderColor: button.borderColor,
                  borderRadius: Math.min(button.borderRadius, 999),
                  fontWeight: button.fontWeight ?? 600,
                }}
              >
                {link.icon === 'file' ? (
                  <FileText className="size-[4.2cqw] shrink-0" />
                ) : (
                  <BrandIcon
                    platform={link.platform}
                    neutral
                    className="size-[4.2cqw] shrink-0"
                  />
                )}
                <span className="truncate">{link.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-[2cqw] pt-[3cqw]">
            <span
              className="truncate text-[5.6cqw] leading-none font-bold"
              style={{ color: palette.accent }}
            >
              {theme.label}
            </span>
            <span
              className="grid size-[6.4cqw] shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: palette.accent, color: palette.onAccent }}
            >
              <ArrowUpRight className="size-[3.4cqw]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The fan only breathes: each card drifts a few pixels on its own clock. The
 * composition in the reference stays put, so the loop never reshuffles the row.
 */
export function BioLinksHero({ href }: { href: string }) {
  const t = useTranslations('home.bioSection')
  const reducedMotion = useReducedMotion()
  const wide = useWideStage()
  const { setNode, inView } = useInView<HTMLDivElement>('-8% 0px -8% 0px')
  const stageRef = useRef<HTMLDivElement | null>(null)
  const copy: CardCopy = {
    bio: t('cardBio'),
    video: t('cardVideo'),
    guide: t('cardGuide'),
    playlist: t('cardPlaylist'),
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || reducedMotion || !inView) return

    let animations: Animation[] = []

    const build = () => {
      const rect = stage.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      animations.forEach((animation) => animation.cancel())
      animations = CARDS.flatMap((card) => {
        const frame = wide ? card.fan : card.phone
        if (!frame) return []
        const element = stage.querySelector<HTMLElement>(
          `[data-card="${card.theme}"]`,
        )
        if (!element || element.offsetParent === null) return []

        const dx = (card.drift.x / 100) * rect.width
        const dy = (card.drift.y / 100) * rect.height
        const base = `translate(-50%, -50%) rotate(${frame.rotate}deg)`
        const moved = `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px)) rotate(${(frame.rotate + card.drift.rotate).toFixed(2)}deg)`

        return [
          element.animate([{ transform: base }, { transform: moved }], {
            duration: card.duration,
            delay: card.delay,
            direction: 'alternate',
            iterations: Infinity,
            easing: 'ease-in-out',
          }),
        ]
      })
    }

    build()
    const observer = new ResizeObserver(build)
    observer.observe(stage)

    return () => {
      observer.disconnect()
      animations.forEach((animation) => animation.cancel())
    }
  }, [inView, reducedMotion, wide])

  return (
    <section className="overflow-hidden bg-[#3b0a1e]">
      <div className="mx-auto grid w-full max-w-[1200px] gap-14 px-4 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:py-28">
        <div className="max-w-lg">
          <p className="text-sm font-medium text-[#ffb3c7]">{t('eyebrow')}</p>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-[#ffe3ec] sm:text-5xl lg:text-[3.4rem]">
            {t('title')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#f3c9d6] sm:text-lg">
            {t('body')}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full bg-[#ffd3e0] px-6 text-base text-[#3b0a1e] hover:bg-[#ffc2d4] focus-visible:ring-[#ffd3e0]/50"
          >
            <Link href={href}>
              {t('cta')}
              <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>

        <div
          ref={(node) => {
            stageRef.current = node
            setNode(node)
          }}
          aria-hidden
          className="relative mx-auto aspect-[7/6] w-full max-w-[560px] sm:aspect-[16/10] lg:aspect-[16/9]"
          style={{ containerType: 'inline-size' }}
        >
          {CARDS.map((card) => (
            <Card key={card.theme} card={card} wide={wide} copy={copy} />
          ))}

          {/* The side cards sink into the section on the reference while the
              centre card stays in front of the vignette. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[24%] bg-gradient-to-t from-[#3b0a1e] via-[#3b0a1e]/80 to-transparent" />
        </div>
      </div>
    </section>
  )
}
