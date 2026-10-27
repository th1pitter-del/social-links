'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Check, Globe } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  adminLocaleCookieName,
  localeCookieName,
  localeLabels,
  locales,
  type Locale,
  type LocaleArea,
} from '@/i18n/config'
import { cn } from 'cn'

const cookieNameFor = (area: LocaleArea) =>
  area === 'admin' ? adminLocaleCookieName : localeCookieName

export function LanguageSwitcher({
  className,
  area = 'site',
}: {
  className?: string
  area?: LocaleArea
}) {
  const locale = useLocale() as Locale
  const router = useRouter()
  const t = useTranslations('common')
  const [pending, startTransition] = useTransition()

  function changeLocale(next: Locale) {
    if (next === locale) return
    const cookie = `${cookieNameFor(area)}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = cookie
    startTransition(() => router.refresh())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('language')}
        disabled={pending}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60',
          className,
        )}
      >
        <Globe className="size-4" />
        <span className="hidden text-xs font-medium uppercase sm:inline">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => changeLocale(option)}
            className="justify-between"
          >
            <span>{localeLabels[option]}</span>
            {option === locale ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
