import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { navIcons } from '@/components/site-nav-icons'
import { SiteNavMenu, type SiteNavItem } from '@/components/site-nav'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { signOutAction } from '@/lib/actions/auth'
import { getActiveHeaderLinks } from '@/lib/ads-data'
import { HEADER_ICONS, HEADER_ICON_DEFAULT } from '@/lib/ads'
import { getSession } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'
import { cn } from 'cn'

export { BrandMark }

export async function SiteHeader() {
  const [site, nav, common, session, headerLinks] = await Promise.all([
    getSiteSettings(),
    getTranslations('nav'),
    getTranslations('common'),
    getSession(),
    getActiveHeaderLinks(),
  ])

  const user = session?.user

  // The public header menu is fully admin-managed (Header links manager).
  // Built-in rows carry a labelKey resolved through the nav translations.
  const links: SiteNavItem[] = headerLinks.map((link) => ({
    href: link.url,
    label: link.labelKey ? nav(link.labelKey as 'howItWorks') : link.label,
    icon: (HEADER_ICONS.includes(link.icon as (typeof HEADER_ICONS)[number])
      ? link.icon
      : HEADER_ICON_DEFAULT) as SiteNavItem['icon'],
    external: link.newTab,
    toneColor: link.color ?? undefined,
  }))

  // Large screens show these inline in the header; below lg they only exist in
  // the hamburger menu. Sign-out stays a POST form: the form is rendered here
  // because a server action cannot cross into the client menu, and both the
  // inline icon button and the menu's row reach it by id from anywhere.
  const adminLink: SiteNavItem[] =
    user && user.role === 'ADMIN'
      ? [{ href: '/admin', label: common('admin'), icon: 'shieldCheck' }]
      : []

  const account: SiteNavItem[] = user
    ? [
        { href: '/dashboard', label: common('dashboard'), icon: 'layoutDashboard' },
        ...adminLink,
        { formId: 'site-signout', label: common('signOut'), icon: 'logOut' },
      ]
    : []

  const linkClass = (item: SiteNavItem) =>
    cn(
      'whitespace-nowrap text-sm font-medium transition-colors',
      item.toneColor &&
        'text-(--menu-tint)! hover:text-(--menu-tint)/75!',
      item.toneClass ?? 'text-muted-foreground hover:text-foreground',
    )

  const linkStyle = (item: SiteNavItem) =>
    item.toneColor
      ? ({ '--menu-tint': item.toneColor } as React.CSSProperties)
      : undefined

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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        {/* min-w-0 + truncate: the site name is admin-set, so a long one has to
            give way here rather than push the nav and actions out of the row. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <BrandMark className="size-6 shrink-0" src={site.logoUrl || null} />
          <span className="hidden truncate sm:inline">{site.name}</span>
        </Link>
        {/* Normal/large screens: every nav and account control lives inline in
            the row. The account links repeat what the small-screen menu offers,
            with sign-out compressed to an icon so the longest locale still fits. */}
        <nav aria-label={nav('sections')} className="hidden items-center gap-5 lg:flex">
          {links.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle(item)}
                className={cn(linkClass(item), 'flex items-center gap-1.5')}
              >
                {labelled(item)}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href ?? '/'}
                style={linkStyle(item)}
                className={cn(linkClass(item), 'flex items-center gap-1.5')}
              >
                {labelled(item)}
              </Link>
            ),
          )}
          {user
            ? account.map((item) =>
                item.formId ? (
                  <Button
                    key={item.label}
                    variant="ghost"
                    size="icon"
                    type="submit"
                    form={item.formId}
                    aria-label={item.label}
                    title={item.label}
                    className="size-8 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href ?? '/'}
                    className="text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ),
              )
            : null}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <>
              <form id="site-signout" action={signOutAction} className="hidden" />
              <Button size="sm" asChild className="shrink-0">
                <Link href="/dashboard/links/new">{common('createLink')}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden shrink-0 sm:inline-flex">
                <Link href="/sign-in">{common('signIn')}</Link>
              </Button>
              <Button size="sm" asChild className="shrink-0">
                <Link href="/create">{common('getStarted')}</Link>
              </Button>
            </>
          )}
          {/* Medium/small screens only: the menu is the sole home for the nav and
              account controls once the inline row no longer fits. */}
          <div className="lg:hidden">
            <SiteNavMenu
              account={account}
              accountLabel={common('account')}
              links={links}
              menuLabel={nav('menu')}
              navLabel={nav('sections')}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
