'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import { cn } from 'cn'
import { navIcons, type SiteNavIcon } from '@/components/site-nav-icons'
import {
  CUSTOM_MENU_ICON_DEFAULT,
  customPageHref,
  isCustomMenuIcon,
  menuLabel,
  type CustomMenuNode,
} from '@/lib/custom-content'
import type { Locale } from '@/i18n/config'

function iconFor(key: string) {
  const icon = isCustomMenuIcon(key) ? key : CUSTOM_MENU_ICON_DEFAULT
  return navIcons[icon as SiteNavIcon] ?? navIcons[CUSTOM_MENU_ICON_DEFAULT]
}

/**
 * The admin-managed section of the dashboard sidebar. It renders below the
 * built-in navigation and never replaces it: with no published menus it
 * renders nothing at all.
 */
export function CustomSidebarMenu({
  items,
  collapsed,
  onNavigate,
}: {
  items: CustomMenuNode[]
  collapsed: boolean
  onNavigate: () => void
}) {
  const t = useTranslations('dashboardShell')
  const pathname = usePathname()
  const locale = useLocale() as Locale

  const activeParent = items.find(
    (item) =>
      (item.page && pathname === customPageHref(item.page.slug)) ||
      item.children.some((child) => child.page && pathname === customPageHref(child.page.slug)),
  )
  // Only explicit toggles are stored; a group on the active page opens itself.
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  if (items.length === 0) return null

  function isOpen(id: string) {
    return toggled[id] ?? activeParent?.id === id
  }

  function toggle(id: string) {
    const next = !isOpen(id)
    setToggled((current) => ({ ...current, [id]: next }))
  }

  return (
    <div className="mb-5 last:mb-0">
      <p
        className={cn(
          'px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase',
          collapsed ? 'lg:hidden' : '',
        )}
      >
        {t('customPagesGroup')}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const label = menuLabel(item, locale)
          const Icon = iconFor(item.icon)
          const expanded = isOpen(item.id)
          const parentActive = Boolean(item.page) && pathname === customPageHref(item.page!.slug)
          const childActive = item.children.some(
            (child) => child.page && pathname === customPageHref(child.page.slug),
          )
          const rowActive = parentActive || childActive
          const rowTone = rowActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'

          if (item.children.length === 0) {
            return (
              <li key={item.id}>
                <Link
                  href={item.page ? customPageHref(item.page.slug) : '/dashboard'}
                  title={label}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    collapsed ? 'lg:justify-center lg:px-0' : '',
                    rowActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className={cn('truncate', collapsed ? 'lg:hidden' : '')}>{label}</span>
                </Link>
              </li>
            )
          }

          // When the sidebar is collapsed the whole group becomes its icon;
          // the toggle and children stay in the mobile drawer.
          return (
            <li key={item.id}>
              <div className={cn('flex items-center rounded-lg transition-colors', rowTone)}>
                {item.page ? (
                  <Link
                    href={customPageHref(item.page.slug)}
                    onClick={onNavigate}
                    title={label}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                      collapsed ? 'lg:justify-center lg:px-0' : '',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className={cn('truncate', collapsed ? 'lg:hidden' : '')}>{label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    title={label}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium',
                      collapsed ? 'lg:justify-center lg:px-0' : '',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className={cn('truncate', collapsed ? 'lg:hidden' : '')}>{label}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={expanded}
                  aria-label={label}
                  className={cn(
                    'me-1.5 rounded-md p-1 hover:bg-black/10',
                    collapsed ? 'lg:hidden' : '',
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'size-3.5 shrink-0 transition-transform rtl:-scale-x-100',
                      expanded ? 'rotate-180' : '',
                    )}
                  />
                </button>
              </div>
              {expanded ? (
                <ul className={cn('mt-0.5 space-y-0.5', collapsed ? 'lg:hidden' : '')}>
                  {item.children.map((child) => {
                    const childLabel = menuLabel(child, locale)
                    const ChildIcon = iconFor(child.icon)
                    const active =
                      Boolean(child.page) && pathname === customPageHref(child.page!.slug)
                    return (
                      <li key={child.id}>
                        <Link
                          href={child.page ? customPageHref(child.page.slug) : '/dashboard'}
                          onClick={onNavigate}
                          title={childLabel}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg py-1.5 pe-3 ps-8 text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <ChildIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{childLabel}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
