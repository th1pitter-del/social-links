'use client'

import type * as React from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  CircleHelp,
  Download,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Minimize2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { localeDirection, type Locale } from '@/i18n/config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from 'cn'

/**
 * Icons are looked up by key because the header is a Server Component and cannot
 * pass a component reference across the client boundary.
 */
const navIcons = {
  listChecks: ListChecks,
  sparkles: Sparkles,
  circleHelp: CircleHelp,
  minimize: Minimize2,
  download: Download,
  layoutDashboard: LayoutDashboard,
  shieldCheck: ShieldCheck,
  logOut: LogOut,
} satisfies Record<string, LucideIcon>

export type SiteNavIcon = keyof typeof navIcons

export type SiteNavItem = {
  label: string
  icon: SiteNavIcon
  /** Destination for a link. Omitted when the row submits a server-rendered form. */
  href?: string
  /** Partner links leave the site, so they open in a new tab and keep their own brand color. */
  external?: boolean
  /** id of the <form> to submit; sign-out has to stay a POST action, not a link. */
  formId?: string
  toneClass?: string
}

type NavRowProps = { item: SiteNavItem } & React.ComponentPropsWithoutRef<'a'> & {
  ref?: React.Ref<HTMLElement>
}

/**
 * Rendered inside DropdownMenuItem asChild, so every prop Radix puts on the slot
 * (role, tabIndex, id, the select/keyboard handlers and the item ref) has to reach
 * the DOM node. Dropping them made the rows unhighlightable and arrow keys threw
 * "Cannot read properties of null (reading 'focus')" inside Radix.
 */
function NavRow({ item, className, ref, ...rest }: NavRowProps) {
  const Icon = navIcons[item.icon]
  const classes = cn(
    // min-h-9: 28px rows feel cramped under a finger, and the menu is now the only
    // place these controls exist on a phone.
    'flex w-full items-center gap-2 rounded-md px-2 py-2 min-h-9 whitespace-nowrap transition-colors',
    // Pointer hover does not focus an asChild item, so the row needs its own
    // highlight. Theme tokens are useless here: --accent equals --popover in dark
    // mode (#1d1e1b) and bg-foreground/10 computes to transparent, so the surfaces
    // are spelled out (design-spec hover tokens). The dark focus rule wins over the
    // shared item's focus:bg-accent because .dark * raises its specificity.
    'hover:bg-[#f0f1ea] focus:bg-[#f0f1ea] dark:hover:bg-[#2a2b27] dark:focus:bg-[#2a2b27]',
    item.toneClass ?? 'hover:text-foreground',
    className,
  )
  const content = (
    <>
      {/* text-inherit! keeps the icon on the row's own colour: the shared item
          styles every descendant on focus, which would otherwise turn just the
          icon white while the label stays on its brand colour. */}
      <Icon className="size-4 shrink-0 text-inherit!" aria-hidden="true" />
      {item.label}
    </>
  )

  if (item.external) {
    return (
      <a {...rest} ref={ref as React.Ref<HTMLAnchorElement>} href={item.href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    )
  }

  if (item.formId) {
    return (
      <button
        {...(rest as React.ComponentPropsWithoutRef<'button'>)}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="submit"
        form={item.formId}
        className={classes}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      {...(rest as React.ComponentProps<typeof Link>)}
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={item.href ?? '/'}
      className={classes}
    >
      {content}
    </Link>
  )
}

function NavGroup({
  label,
  items,
  labelledBy,
}: {
  label?: string
  items: SiteNavItem[]
  labelledBy: string
}) {
  return (
    <DropdownMenuGroup aria-labelledby={label ? labelledBy : undefined}>
      {label ? (
        <DropdownMenuLabel id={labelledBy}>{label}</DropdownMenuLabel>
      ) : null}
      {items.map((item) => (
        <DropdownMenuItem key={item.label} asChild>
          <NavRow item={item} />
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}

/**
 * Every secondary control of the public header: the five nav links and, for
 * signed-in users, the account actions. One trigger at every viewport width
 * keeps the row short enough that no locale can overflow the 1168px content
 * budget, and the menu has the room the row never had for icon + label.
 */
export function SiteNavMenu({
  menuLabel,
  navLabel,
  links,
  accountLabel,
  account,
}: {
  menuLabel: string
  navLabel: string
  links: SiteNavItem[]
  accountLabel?: string
  account?: SiteNavItem[]
}) {
  // Radix pins dir="ltr" on the portalled content unless the root says otherwise,
  // which left the Arabic panel anchored to the wrong edge with icons on the left.
  const direction = localeDirection(useLocale() as Locale)

  return (
    <DropdownMenu dir={direction}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={menuLabel}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={menuLabel}
        className="flex w-60 flex-col gap-1 text-sm"
      >
        <NavGroup label={navLabel} items={links} labelledBy="site-nav-menu-navigation" />
        {account?.length ? (
          <>
            <DropdownMenuSeparator />
            <NavGroup
              label={accountLabel}
              items={account}
              labelledBy="site-nav-menu-account"
            />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
