'use client'

import { useLocale } from 'next-intl'
import { ChevronDown } from 'lucide-react'

import { NavRow, type SiteNavItem } from '@/components/site-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { localeDirection, type Locale } from '@/i18n/config'

/**
 * Signed-in account menu for the public header: the dashboard, admin and
 * sign-out actions live here instead of as loose links in the nav row. The
 * trigger follows the dashboard/admin shells (avatar initials + name) and the
 * rows reuse the hamburger's NavRow, so one set of items serves both surfaces.
 *
 * Server-mountable: it takes plain strings plus the shared item shape, and the
 * sign-out row reaches the server-rendered POST form by id, because a server
 * action cannot cross into a client component.
 */
export function SiteUserMenu({
  userLabel,
  email,
  roleLabel,
  accountLabel,
  menuLabel,
  items,
}: {
  userLabel: string
  email: string
  roleLabel: string
  accountLabel: string
  menuLabel: string
  items: SiteNavItem[]
}) {
  const direction = localeDirection(useLocale() as Locale)

  return (
    <DropdownMenu dir={direction}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 border border-transparent px-1.5 pe-2 data-[state=open]:border-border data-[state=open]:bg-muted"
          aria-label={menuLabel}
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">
              {initials(userLabel)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[12rem] truncate text-sm font-medium sm:inline">
            {userLabel}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-60" aria-label={accountLabel}>
        <div className="mb-1 flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
          <Avatar>
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials(userLabel)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{userLabel}</p>
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </div>
          <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {roleLabel}
          </span>
        </div>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            asChild
            variant={item.destructive ? 'destructive' : undefined}
          >
            <NavRow item={item} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  )
}
