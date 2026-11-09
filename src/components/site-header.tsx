import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BioMenuAccount } from '@/components/bio-menu-account'
import { BrandMark } from '@/components/brand-mark'
import { FloatingHeader } from '@/components/floating-header'
import { LanguageSwitcher } from '@/components/language-switcher'
import { navIcons } from '@/components/site-nav-icons'
import { SiteNavMenu, type SiteNavItem } from '@/components/site-nav'
import { SiteUserMenu } from '@/components/site-user-menu'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { signOutAction } from '@/lib/actions/auth'
import type { Locale } from '@/i18n/config'
import { getActiveHeaderLinks } from '@/lib/ads-data'
import {
  HEADER_ICONS,
  HEADER_ICON_DEFAULT,
  isHeaderMenuKey,
  type HeaderLinkData,
} from '@/lib/ads'
import { getSession } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'
import { cn } from 'cn'

export { BrandMark }

export async function SiteHeader({ variant = 'default' }: { variant?: 'default' | 'bio' }) {
  const [site, nav, common, session, headerLinks, locale] = await Promise.all([
    getSiteSettings(),
    getTranslations('nav'),
    getTranslations('common'),
    getSession(),
    getActiveHeaderLinks(),
    getLocale(),
  ])

  const user = session?.user
  const isBio = variant === 'bio'
  // A bio page sells the bio product, so its CTA opens bio creation (sign-up for
  // guests, the bio editor once signed in) instead of the unlock-link form.
  const cta = isBio
    ? { href: user ? '/dashboard/profile' : '/sign-up', label: common('createBio') }
    : user
      ? { href: '/dashboard/links/new', label: common('createLink') }
      : { href: '/create', label: common('getStarted') }
  // The public header menu is fully admin-managed (Header links manager).
  // Built-in and admin-keyed rows resolve their label through the nav catalogs,
  // so every locale reads the menu in its own language.
  const toNavItem = (link: HeaderLinkData): SiteNavItem => {
    // Admin-typed text for this visitor's language wins, then the site catalog,
    // then the stored English label.
    const override = link.labels?.[locale as Locale]?.trim()
    const translated =
      link.labelKey && isHeaderMenuKey(link.labelKey) && nav.has(link.labelKey)
        ? nav(link.labelKey)
        : ''
    return {
      href: link.url,
      label: override || translated || link.label,
      icon: (HEADER_ICONS.includes(link.icon as (typeof HEADER_ICONS)[number])
        ? link.icon
        : HEADER_ICON_DEFAULT) as SiteNavItem['icon'],
      external: link.newTab,
      toneColor: link.color ?? undefined,
    }
  }

  // Parents come from the enabled rows; a sub-link whose parent is missing or
  // disabled is dropped with it rather than surfacing as a bare top-level row.
  const childrenByParent = new Map<string, HeaderLinkData[]>()
  for (const link of headerLinks) {
    if (!link.parentId) continue
    if (!headerLinks.some((parent) => parent.id === link.parentId)) continue
    const siblings = childrenByParent.get(link.parentId) ?? []
    siblings.push(link)
    childrenByParent.set(link.parentId, siblings)
  }
  const links: SiteNavItem[] = headerLinks
    .filter((link) => !link.parentId)
    .map((link) => {
      const item = toNavItem(link)
      const children = childrenByParent.get(link.id)
      return children?.length ? { ...item, children: children.map(toNavItem) } : item
    })

  // Account actions never sit loose in the nav row: they live in the user menu,
  // at every width. Sign-out stays a POST form rendered here — a server action
  // cannot cross into the client menu, so the row reaches it by id.
  const adminLink: SiteNavItem[] =
    user && user.role === 'ADMIN'
      ? [{ href: '/admin', label: common('admin'), icon: 'shieldCheck' }]
      : []

  const account: SiteNavItem[] = user
    ? [
        { href: '/dashboard', label: common('dashboard'), icon: 'layoutDashboard' },
        ...adminLink,
        {
          formId: 'site-signout',
          label: common('signOut'),
          icon: 'logOut',
          destructive: true,
        },
      ]
    : []

  const linkClass = (item: SiteNavItem) =>
    cn(
      'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors',
      item.toneColor &&
        'text-(--menu-tint)! hover:text-(--menu-tint)/75!',
      item.toneClass ??
        'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
    )

  const linkStyle = (item: SiteNavItem) =>
    item.toneColor
      ? ({ '--menu-tint': item.toneColor } as React.CSSProperties)
      : undefined

  const subLinkClass = (item: SiteNavItem) =>
    cn(
      'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
      item.toneColor &&
        'text-(--menu-tint)! hover:text-(--menu-tint)/75!',
      item.toneClass ??
        'text-foreground hover:bg-[#f0f1ea] dark:hover:bg-[#2a2b27]',
    )

  // Icons are admin-chosen, so the inline row shows them like the hamburger does.
  // text-inherit keeps the glyph on the link's own colour, including the hover
  // fade that the tone classes apply to the parent.
  const labelled = (item: SiteNavItem) => {
    const Icon = navIcons[item.icon]
    return (
      <>
        <Icon className="size-4 shrink-0 text-inherit" aria-hidden="true" />
        <span>{item.label}</span>
      </>
    )
  }

  const inlineLink = (item: SiteNavItem, extra?: React.ReactNode) =>
    item.external ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle(item)}
        className={linkClass(item)}
      >
        {labelled(item)}
        {extra}
      </a>
    ) : (
      <Link href={item.href ?? '/'} style={linkStyle(item)} className={linkClass(item)}>
        {labelled(item)}
        {extra}
      </Link>
    )

  const subLink = (item: SiteNavItem) =>
    item.external ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle(item)}
        className={subLinkClass(item)}
      >
        {labelled(item)}
      </a>
    ) : (
      <Link href={item.href ?? '/'} style={linkStyle(item)} className={subLinkClass(item)}>
        {labelled(item)}
      </Link>
    )

  return (
    <FloatingHeader transparent={isBio}>
      {/* Logo left, navigation centred, actions right. Once the inline row is
          shown, equal side columns keep the links on the container's centre
          line regardless of how wide the logo or account actions grow. */}
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 xl:grid-cols-[1fr_auto_1fr]">
        {/* min-w-0 + truncate: the site name is admin-set, so a long one has to
            give way here rather than push the nav and actions out of the row. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <BrandMark className="size-6 shrink-0" src={site.logoUrl || null} />
          <span className="hidden truncate sm:inline">{site.name}</span>
        </Link>
        {/* Wide screens: the admin-managed menus live inline in the row. Account
            actions do not — they are in the user menu at every width. */}
        <nav
          aria-label={nav('sections')}
          className="hidden items-center justify-center gap-0.5 xl:flex"
        >
          {links.map((item, index) => {
            const key = `${item.label}-${index}`
            if (!item.children?.length) {
              return (
                <span key={key} className="contents">
                  {inlineLink(item)}
                </span>
              )
            }
            // Hover/focus opens the submenu, so keyboard users reach the links
            // by tabbing from the parent row. The padding keeps the pointer
            // inside the group while it crosses into the panel.
            return (
              <div key={key} className="group relative">
                {inlineLink(
                  item,
                  <ChevronDown
                    className="size-3.5 shrink-0 text-inherit transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
                    aria-hidden="true"
                  />,
                )}
                <div className="invisible absolute start-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                    <div className="flex flex-col">
                      {item.children.map((child, childIndex) => (
                        <div key={`${child.label}-${childIndex}`}>{subLink(child)}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {/* Bio pages keep the account menu inside the hamburger at every
              width and the CTA in the row; the rest of the site keeps its
              user menu here below xl. */}
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <>
              <form id="site-signout" action={signOutAction} className="hidden" />
              {isBio ? null : (
                <SiteUserMenu
                  accountLabel={common('account')}
                  email={user.email ?? ''}
                  items={account}
                  menuLabel={common('account')}
                  roleLabel={user.role === 'ADMIN' ? common('admin') : common('member')}
                  userLabel={user.name ?? common('member')}
                />
              )}
              <Button size="sm" asChild className="shrink-0">
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            </>
          ) : (
            <>
              {isBio ? null : (
                <Button variant="ghost" size="sm" asChild className="hidden shrink-0 sm:inline-flex">
                  <Link href="/sign-in">{common('signIn')}</Link>
                </Button>
              )}
              <Button size="sm" asChild className="shrink-0">
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            </>
          )}
          {/* Below the inline row's width: the menu is the sole home for the
              admin-managed nav links. Bio pages keep it at every width because
              it also carries the account controls. */}
          <div className={cn(!isBio && 'xl:hidden')}>
            <SiteNavMenu
              extra={
                isBio ? (
                  <BioMenuAccount
                    account={account}
                    signedIn={Boolean(user)}
                    userLabel={user?.name ?? common('member')}
                  />
                ) : undefined
              }
              links={links}
              menuLabel={nav('menu')}
              navLabel={nav('sections')}
            />
          </div>
        </div>
      </div>
    </FloatingHeader>
  )
}
