'use client'

import Link from 'next/link'
import {
  CircleHelp,
  Download,
  ListChecks,
  Menu,
  Minimize2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} satisfies Record<string, LucideIcon>

export type SiteNavIcon = keyof typeof navIcons

export type SiteNavLink = {
  href: string
  label: string
  icon: SiteNavIcon
  /** Partner links leave the site, so they open in a new tab and keep their own brand color. */
  external?: boolean
  toneClass?: string
}

function NavAnchor({
  link,
  inMenu = false,
  className,
}: {
  link: SiteNavLink
  inMenu?: boolean
  className?: string
}) {
  const Icon = navIcons[link.icon]
  const classes = cn(
    'flex items-center gap-1.5 whitespace-nowrap rounded-md transition-colors',
    // asChild makes these anchors the items themselves and pointer hover does not
    // focus them, so the row needs its own highlight. Theme tokens are useless here:
    // --accent equals --popover in dark mode (#1d1e1b) and bg-foreground/10 computes
    // to transparent, so the surfaces are spelled out (design-spec hover tokens).
    inMenu && 'hover:bg-[#f0f1ea] dark:hover:bg-[#2a2b27]',
    link.toneClass ?? 'hover:text-foreground',
    className,
  )
  const content = <Icon className="size-4 shrink-0" aria-hidden="true" />

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
        {link.label}
      </a>
    )
  }

  return (
    <Link href={link.href} className={classes}>
      {content}
      {link.label}
    </Link>
  )
}

/** The header links as an inline row, from xl up. */
export function SiteNavLinks({ links, menuLabel }: { links: SiteNavLink[]; menuLabel: string }) {
  return (
    <nav
      className="hidden shrink-0 items-center gap-4 text-sm text-muted-foreground xl:flex"
      aria-label={menuLabel}
    >
      {links.map((link) => (
        <NavAnchor key={link.href} link={link} />
      ))}
    </nav>
  )
}

/** The same links behind a menu button, for the row widths where they do not fit. */
export function SiteNavMenu({ links, menuLabel }: { links: SiteNavLink[]; menuLabel: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label={menuLabel}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex w-60 flex-col gap-1 text-sm">
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <NavAnchor link={link} inMenu className="w-full" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
