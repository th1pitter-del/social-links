'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from 'cn'
import { SETTINGS_GROUPS } from './settings-config'

export function SettingsNav() {
  const pathname = usePathname()
  const t = useTranslations('admin.settings')

  return (
    <>
      <aside className="hidden lg:sticky lg:top-24 lg:block">
        <nav
          aria-label={t('navAria')}
          className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm"
        >
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t('navLabel')}
          </p>
          {SETTINGS_GROUPS.map((group) => {
            const href = `/admin/settings/${group.id}`
            const active = pathname === href
            return (
              <Link
                key={group.id}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-accent-text'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <group.icon className="size-4 shrink-0" />
                <span className="truncate">{t(`groups.${group.id}.title`)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {SETTINGS_GROUPS.map((group) => {
          const href = `/admin/settings/${group.id}`
          const active = pathname === href
          return (
            <Link
              key={group.id}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium',
                active
                  ? 'border-primary/40 bg-primary/10 text-accent-text'
                  : 'border-border text-muted-foreground',
              )}
            >
              <group.icon className="size-4 shrink-0" />
              {t(`groups.${group.id}.title`)}
            </Link>
          )
        })}
      </div>
    </>
  )
}
