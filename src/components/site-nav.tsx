'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ChevronDown, Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { localeDirection, type Locale } from '@/i18n/config'
import { navIcons, type SiteNavIcon } from '@/components/site-nav-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from 'cn'

export type SiteNavItem = {
  label: string
  icon: SiteNavIcon
  /** Destination for a link. Omitted when the row submits a server-rendered form. */
  href?: string
  /** Partner links leave the site, so they open in a new tab and keep their own brand color. */
  external?: boolean
  /** id of the <form> to submit; sign-out has to stay a POST action, not a link. */
  formId?: string
  /** Brand color (hex) painted on the item via --menu-tint; default tone when unset. */
  toneColor?: string
  toneClass?: string
  /** Signs the user out, so the row is tinted as a destructive action. */
  destructive?: boolean
  /** Sub-links opened from this menu row, when the admin nested links under it. */
  children?: SiteNavItem[]
}

function rowClasses(item: SiteNavItem, className?: string) {
  return cn(
    // min-h-9: 28px rows feel cramped under a finger, and the menu is now the only
    // place these controls exist on a phone.
    'flex w-full items-center gap-2 rounded-md px-2 py-2 min-h-9 whitespace-nowrap transition-colors',
    // Pointer hover does not focus an asChild item, so the row needs its own
    // highlight. Theme tokens are useless here: --accent equals --popover in dark
    // mode (#1d1e1b) and bg-foreground/10 computes to transparent, so the surfaces
    // are spelled out (design-spec hover tokens). The dark focus rule wins over the
    // shared item's focus:bg-accent because .dark * raises its specificity.
    'hover:bg-[#f0f1ea] focus:bg-[#f0f1ea] dark:hover:bg-[#2a2b27] dark:focus:bg-[#2a2b27]',
    // ! because the shared dropdown item paints focus:text-accent-foreground,
    // and Radix focuses a row as soon as the pointer enters it.
    item.toneColor && 'text-(--menu-tint)! hover:text-(--menu-tint)/75! focus:text-(--menu-tint)!',
    item.destructive && 'text-destructive',
    item.toneClass ?? 'hover:text-foreground',
    className,
  )
}

function rowToneStyle(item: SiteNavItem): React.CSSProperties | undefined {
  return item.toneColor ? ({ '--menu-tint': item.toneColor } as React.CSSProperties) : undefined
}

function RowContent({ item }: { item: SiteNavItem }) {
  const Icon = navIcons[item.icon]
  return (
    <>
      {/* text-inherit! keeps the icon on the row's own colour: the shared item
          styles every descendant on focus, which would otherwise turn just the
          icon white while the label stays on its brand colour. */}
      <Icon className="size-4 shrink-0 text-inherit!" aria-hidden="true" />
      {item.label}
    </>
  )
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
export function NavRow({ item, className, ref, style, ...rest }: NavRowProps) {
  const toneStyle = item.toneColor ? { ...style, ...rowToneStyle(item) } : style
  const classes = rowClasses(item, className)
  const content = <RowContent item={item} />

  if (item.external) {
    return (
      <a {...rest} ref={ref as React.Ref<HTMLAnchorElement>} href={item.href} target="_blank" rel="noopener noreferrer" style={toneStyle} className={classes}>
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
        style={toneStyle}
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
      style={toneStyle}
      className={classes}
    >
      {content}
    </Link>
  )
}

/**
 * Rows for the hamburger panel. A parent expands its children in place instead
 * of opening a side flyout: on a phone a flyout lands under the thumb, can be
 * clipped by the screen edge, and gives no obvious way back. One group stays
 * open at a time so the panel never grows past the viewport.
 */
function NavGroup({
  label,
  items,
  labelledBy,
  openKey,
  onToggle,
}: {
  label: string
  items: SiteNavItem[]
  labelledBy: string
  openKey: string | null
  onToggle: (key: string | null) => void
}) {
  return (
    <DropdownMenuGroup aria-labelledby={labelledBy}>
      <DropdownMenuLabel id={labelledBy}>{label}</DropdownMenuLabel>
      {items.map((item, index) => {
        const key = `${item.label}-${index}`
        if (!item.children?.length) {
          return (
            <DropdownMenuItem key={key} asChild>
              <NavRow item={item} />
            </DropdownMenuItem>
          )
        }
        const open = openKey === key
        return (
          <div key={key}>
            <DropdownMenuItem
              aria-expanded={open}
              style={rowToneStyle(item)}
              className={cn(rowClasses(item), 'justify-between')}
              // Keep the panel open: this row expands its children instead of
              // navigating, so Radix must not treat the press as a selection.
              onSelect={(event) => {
                event.preventDefault()
                onToggle(open ? null : key)
              }}
            >
              <RowContent item={item} />
              <ChevronDown
                className={cn(
                  'ms-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                  open && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </DropdownMenuItem>
            {open ? (
              <div className="ms-4 border-s border-border/60 ps-1.5">
                {item.children.map((child, childIndex) => (
                  <DropdownMenuItem key={`${child.label}-${childIndex}`} asChild>
                    <NavRow item={child} />
                  </DropdownMenuItem>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </DropdownMenuGroup>
  )
}

/**
 * The hamburger menu for the public header below xl, holding the admin-managed
 * nav links. From xl the header renders those inline instead, so the menu is
 * hidden there. Account actions are not here: the user menu carries them at
 * every width (see site-user-menu.tsx).
 */
export function SiteNavMenu({
  menuLabel,
  navLabel,
  links,
  controls,
  extra,
}: {
  menuLabel: string
  navLabel: string
  links: SiteNavItem[]
  /** Switchers the header row hides below sm, so the site name gets the room. */
  controls?: React.ReactNode
  /** Controls that only exist in the menu (bio header account actions). */
  extra?: React.ReactNode
}) {
  // Radix pins dir="ltr" on the portalled content unless the root says otherwise,
  // which left the Arabic panel anchored to the wrong edge with icons on the left.
  const direction = localeDirection(useLocale() as Locale)
  const [openKey, setOpenKey] = React.useState<string | null>(null)

  return (
    <DropdownMenu
      dir={direction}
      // Reopening starts collapsed, so the panel always reads top to bottom.
      onOpenChange={(open) => {
        if (!open) setOpenKey(null)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={menuLabel}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        aria-label={menuLabel}
        className="flex max-h-[calc(100dvh-6rem)] w-64 max-w-[calc(100vw-1.5rem)] flex-col gap-1 overflow-y-auto text-sm"
      >
        <NavGroup
          label={navLabel}
          items={links}
          labelledBy="site-nav-menu-navigation"
          openKey={openKey}
          onToggle={setOpenKey}
        />
        {controls ? (
          // sm:hidden because the row shows these again from sm up; a bio page
          // keeps this menu at every width, and duplicates would read twice.
          <div className="mt-1 flex items-center gap-1.5 border-t border-border/60 px-2 pt-2 sm:hidden">
            {controls}
          </div>
        ) : null}
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
