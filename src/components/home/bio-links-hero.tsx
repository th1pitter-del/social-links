'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowRight, ArrowUpRight, FileText, Link2 } from 'lucide-react'
import { cn } from 'cn'

import { BrandIcon } from '@/components/brand-icon'
import { Button } from '@/components/ui/button'
import { useRotator } from '@/components/home/use-rotator'
import {
  bioButtonVisual,
  bioHeadingStyle,
  resolveBioTheme,
} from '@/lib/bio-themes'

/** The presets the carousel walks, in the order it shows them. */
const THEMES = ['luxury', 'midnight', 'sunset', 'glass-card', 'neo-brutalist'] as const

type CardCopy = {
  bio: string
  video: string
  guide: string
  playlist: string
}

/**
 * A miniature bio page in one of the product's real presets. Same pieces as the
 * live page - avatar, name, handle, link buttons - with the theme's own palette,
 * typography and button shapes, so each slide reads as a theme, not a mock.
 */
function BioCard({ themeId, copy }: { themeId: string; copy: CardCopy }) {
  const theme = resolveBioTheme(themeId)
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
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: '0.58',
        borderRadius: 14,
        boxShadow: '0 34px 80px -30px rgba(0, 0, 0, 0.8)',
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
 * One bio page at a time, on the right, in the same panel language as the rest
 * of the page. The carousel shows a preset for a few seconds and crossfades to
 * the next one; the dots let a visitor pick a theme, and holding the pointer on
 * the card stops the walk while it is read.
 */
export function BioLinksHero({ href }: { href: string }) {
  const t = useTranslations('home.bioSection')
  const rotator = useRotator(THEMES.length, 4800)
  const copy: CardCopy = {
    bio: t('cardBio'),
    video: t('cardVideo'),
    guide: t('cardGuide'),
    playlist: t('cardPlaylist'),
  }

  /* This project's react-hooks/refs rule reads the callback ref and the handlers
     as ref values because they travel on the same object, and reports every
     property access on it while rendering. Nothing here touches `ref.current`;
     the exception is scoped to the element that wires the rotator up. */
  /* eslint-disable react-hooks/refs */
  return (
    <section id="bio" className="relative">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl border bg-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_20%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(65%_45%_at_50%_20%,rgba(213,255,47,0.12),transparent)] lg:bg-[radial-gradient(45%_70%_at_78%_50%,rgba(201,247,42,0.16),transparent)] lg:dark:bg-[radial-gradient(45%_70%_at_78%_50%,rgba(213,255,47,0.12),transparent)]"
          />
          <div className="relative grid gap-6 p-5 sm:p-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:grid-rows-[auto_1fr] lg:items-center lg:gap-x-10 lg:gap-y-4">
            <div className="max-w-lg lg:col-start-1 lg:row-start-1 lg:self-end">
              <p className="text-sm font-medium text-accent-text">{t('eyebrow')}</p>
              <h2 className="mt-3 text-3xl leading-[1.08] font-semibold tracking-tight text-balance sm:mt-4 sm:text-4xl lg:text-5xl">
                {t('title')}
              </h2>
            </div>

            <div
              ref={rotator.setNode}
              onPointerEnter={rotator.pause}
              onPointerLeave={rotator.resume}
              onFocusCapture={rotator.pause}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  rotator.resume()
                }
              }}
              className="mx-auto w-full max-w-[19rem] sm:max-w-[18rem] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-[20rem] lg:self-center"
            >
              <div className="relative grid">
                {THEMES.map((themeId, index) => {
                  const active = index === rotator.active
                  return (
                    <div
                      key={themeId}
                      aria-hidden={!active}
                      className={cn(
                        'col-start-1 row-start-1 transition-[opacity,transform] duration-[900ms] ease-out motion-reduce:transition-none',
                        active
                          ? 'translate-y-0 scale-100 opacity-100'
                          : 'pointer-events-none translate-y-2 scale-[0.97] opacity-0',
                      )}
                    >
                      <BioCard themeId={themeId} copy={copy} />
                    </div>
                  )
                })}
              </div>

            </div>

            <div className="max-w-lg lg:col-start-1 lg:row-start-2 lg:self-start">
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('body')}
              </p>
              <Button asChild size="lg" className="mt-6 w-full sm:w-auto lg:mt-7">
                <Link href={href}>
                  {t('cta')}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
  /* eslint-enable react-hooks/refs */
}
