'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'

import { cn } from 'cn'

export function ThemeSwitcher({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('common')

  return (
    <button
      type="button"
      aria-label={t('toggleTheme')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  )
}
