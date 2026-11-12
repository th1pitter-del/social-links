'use client'

import type { CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { cn } from 'cn'

import { PlatformGlyph, brandAccentFor } from '@/components/brand-icon'
import { actionIcon } from '@/lib/action-icons'
import { useRotator } from '@/components/home/use-rotator'

export type ShowcasePlatform = {
  key: string
  label: string
  icon: string
  actions: { key: string; label: string; icon: string }[]
}

/**
 * The platforms a link can ask for, as a selector instead of a diagram: picking
 * one (pointer, keyboard or the unattended walk) swaps the panel beside it for
 * that platform's actions. Every panel is mounted in the same grid cell, so the
 * frame is already as tall as the largest platform and switching never moves
 * the page. The count text is the accessible description of each choice.
 */
export function PlatformShowcase({
  platforms,
  label,
}: {
  platforms: ShowcasePlatform[]
  label: string
}) {
  const t = useTranslations('motion')
  const { resolvedTheme } = useTheme()
  const rotator = useRotator(platforms.length, 4600)
  const dark = resolvedTheme !== 'light'
  const selected = platforms[rotator.active]

  if (!selected) return null

  /* This project's react-hooks/refs rule reads the callback ref and the handlers
     as ref values because they travel on the same object, and reports every
     property access on it while rendering. Nothing here touches `ref.current`;
     the exception is scoped to the element that wires the rotator up. */
  /* eslint-disable react-hooks/refs */
  return (
    <div
      ref={rotator.setNode}
      onPointerEnter={rotator.pause}
      onPointerLeave={rotator.resume}
      onFocusCapture={rotator.pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) rotator.resume()
      }}
      className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10"
    >
      <div>
        <p className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={label}
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {platforms.map((platform, index) => {
            const active = index === rotator.active
            return (
              <button
                key={platform.key}
                type="button"
                role="tab"
                id={`platform-tab-${platform.key}`}
                aria-selected={active}
                aria-controls={`platform-panel-${platform.key}`}
                onPointerEnter={() => rotator.goTo(index)}
                onFocus={() => rotator.goTo(index)}
                onClick={() => rotator.goTo(index)}
                className={cn(
                  'group relative flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-start text-sm transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active
                    ? 'border-primary/40 bg-card shadow-sm shadow-primary/10'
                    : 'border-border/70 bg-card/40 hover:border-primary/25 hover:bg-card/70',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary transition-opacity duration-300',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <PlatformGlyph
                  platform={platform.key}
                  icon={platform.icon}
                  className="size-4.5 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{platform.label}</span>
                <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                  {platform.actions.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* The catalogue is longer than any one platform's panel, so the card
          keeps its own height instead of stretching into empty space. */}
      <div className="grid self-start">
        {platforms.map((platform) => {
          const active = platform.key === selected.key
          const accent = brandAccentFor(platform.key, dark) ?? 'var(--primary)'
          return (
            <div
              key={platform.key}
              role="tabpanel"
              id={`platform-panel-${platform.key}`}
              aria-labelledby={`platform-tab-${platform.key}`}
              aria-hidden={!active}
              className={cn(
                'col-start-1 row-start-1 relative overflow-hidden rounded-2xl border bg-card transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
                active
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-1 opacity-0',
              )}
              style={{ '--brand': accent } as CSSProperties}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(201,247,42,0.14),transparent)] dark:bg-[radial-gradient(70%_60%_at_100%_0%,rgba(213,255,47,0.10),transparent)]"
              />
              <div className="relative flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: 'color-mix(in oklab, var(--brand) 14%, transparent)' }}
                  >
                    <PlatformGlyph
                      platform={platform.key}
                      icon={platform.icon}
                      className="size-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{platform.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('mixerHint', { count: platform.actions.length })}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {platform.actions.map((action, index) => {
                    const Icon = actionIcon(action.icon)
                    return (
                      <li
                        key={action.key}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2.5 text-sm',
                          active && 'motion-safe:animate-[demo-fade_0.35s_ease-out_both]',
                        )}
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <Icon
                          className="size-4 shrink-0"
                          style={{ color: 'var(--brand)' }}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">{action.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  /* eslint-enable react-hooks/refs */
}
