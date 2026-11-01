'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from 'cn'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformGlyph } from '@/components/brand-icon'
import { localeDirection, type Locale } from '@/i18n/config'

export type DemoPlatform = {
  key: string
  label: string
  icon: string
  actions: { key: string; label: string; icon: string }[]
}

/**
 * Which actions a link can ask for, taken from the platforms and options actually
 * configured in the database - not a hard-coded marketing list. Hovering or
 * focusing a platform tab previews its actions the way a creator browses them, and
 * clicking pins the tab for keyboard and touch users.
 */
export function ActionMixer({ platforms }: { platforms: DemoPlatform[] }) {
  const t = useTranslations('motion')
  // Radix Tabs reads arrow-key direction from this prop, not from the document,
  // so Arabic needs it stated or the tab order runs backwards.
  const direction = localeDirection(useLocale() as Locale)
  const [value, setValue] = useState(platforms[0]?.key ?? '')
  if (platforms.length === 0) return null

  return (
    <Tabs value={value} onValueChange={setValue} className="mt-4" dir={direction}>
      {/* The strip scrolls by drag, wheel or arrow keys; a native bar inside a
          framed card reads as a broken widget, and the clipped last tab already
          says there is more to see. */}
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {platforms.map((platform) => (
          <TabsTrigger
            key={platform.key}
            value={platform.key}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') setValue(platform.key)
            }}
            onFocus={() => setValue(platform.key)}
            className="gap-2 rounded-lg data-[state=active]:bg-muted"
          >
            <PlatformGlyph
              platform={platform.key}
              icon={platform.icon}
              className="size-4 shrink-0"
            />
            <span className="whitespace-nowrap">{platform.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {platforms.map((platform) => (
        <TabsContent key={platform.key} value={platform.key} className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {platform.actions.map((action, index) => (
              <li
                key={action.key}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm',
                  'motion-safe:animate-[demo-fade_0.35s_ease-out_both] motion-reduce:animate-none',
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <PlatformGlyph
                  platform={platform.key}
                  icon={action.icon}
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {action.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('mixerHint', { count: platform.actions.length })}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  )
}
