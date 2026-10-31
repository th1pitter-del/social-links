import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { SiteNavMenu, type SiteNavItem } from '@/components/site-nav'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { signOutAction } from '@/lib/actions/auth'
import { getSession } from '@/lib/session'
import { getSiteSettings } from '@/lib/settings'

export { BrandMark }

export async function SiteHeader() {
  const [site, nav, common, session] = await Promise.all([
    getSiteSettings(),
    getTranslations('nav'),
    getTranslations('common'),
    getSession(),
  ])

  const user = session?.user

  const links: SiteNavItem[] = [
    { href: '/#how-it-works', label: nav('howItWorks'), icon: 'listChecks' },
    { href: '/#features', label: nav('features'), icon: 'sparkles' },
    { href: '/faq', label: nav('faqShort'), icon: 'circleHelp' },
    {
      href: 'https://www.videocompressor4you.com/',
      label: nav('videoCompressor'),
      icon: 'minimize',
      external: true,
      // ! because the shared dropdown item paints focus:text-accent-foreground,
      // and Radix focuses a row as soon as the pointer enters it.
      toneClass: 'text-[#5182EF]! hover:text-[#5182EF]/75!',
    },
    {
      href: 'https://www.downloadsocialmediavideo.com/',
      label: nav('videoDownloader'),
      icon: 'download',
      external: true,
      toneClass: 'text-[#4CBA95]! hover:text-[#4CBA95]/75!',
    },
  ]

  // The row cannot fit these labels next to the CTA in every locale, so they live
  // in the menu where icon + label has room. Sign-out stays a POST form: the form
  // is rendered here because a server action cannot cross into the client menu,
  // and the menu's button reaches it by id from anywhere in the document.
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        {/* min-w-0 + truncate: the site name is admin-set, so a long one has to
            give way here rather than push the nav and actions out of the row. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <BrandMark className="size-6 shrink-0" src={site.logoUrl || null} />
          <span className="hidden truncate sm:inline">{site.name}</span>
        </Link>
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
          {/* Last child, and visible at every width: the menu is the only home for
              the nav and account controls, so it never swaps with an inline row. */}
          <SiteNavMenu
            account={account}
            accountLabel={common('account')}
            links={links}
            menuLabel={nav('menu')}
            navLabel={nav('sections')}
          />
        </div>
      </div>
    </header>
  )
}
