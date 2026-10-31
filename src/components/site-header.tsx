import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'

import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { SiteNavLinks, SiteNavMenu, type SiteNavLink } from '@/components/site-nav'
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

  const links: SiteNavLink[] = [
    { href: '/#how-it-works', label: nav('howItWorks'), icon: 'listChecks' },
    { href: '/#features', label: nav('features'), icon: 'sparkles' },
    { href: '/faq', label: nav('faqShort'), icon: 'circleHelp' },
    {
      href: 'https://www.videocompressor4you.com/',
      label: nav('videoCompressor'),
      icon: 'minimize',
      external: true,
      toneClass: 'text-[#5182EF] hover:text-[#5182EF]/75',
    },
    {
      href: 'https://www.downloadsocialmediavideo.com/',
      label: nav('videoDownloader'),
      icon: 'download',
      external: true,
      toneClass: 'text-[#4CBA95] hover:text-[#4CBA95]/75',
    },
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        {/* min-w-0 + truncate: the site name is admin-set, so a long one has to
            give way here rather than push the nav and actions out of the row. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <BrandMark className="size-6 shrink-0" src={site.logoUrl || null} />
          <span className="hidden truncate sm:inline">{site.name}</span>
        </Link>
        <SiteNavLinks menuLabel={nav('menu')} links={links} />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <>
              <form id="site-signout" action={signOutAction} className="hidden" />
              {/* Icon-only: the row also carries the brand, the language and theme
                  controls, the primary action and — from xl — five nav labels, and
                  the widest locale set does not fit their text next to that. */}
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden sm:inline-flex"
                aria-label={common('dashboard')}
                title={common('dashboard')}
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
              {user.role === 'ADMIN' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:inline-flex"
                  aria-label={common('admin')}
                  title={common('admin')}
                >
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                form="site-signout"
                className="hidden sm:inline-flex"
                aria-label={common('signOut')}
                title={common('signOut')}
              >
                <LogOut className="size-4" />
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/links/new">{common('createLink')}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/sign-in">{common('signIn')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/create">{common('getStarted')}</Link>
              </Button>
            </>
          )}
          {/* Last child, so the menu sits at the row's end wherever the inline nav is hidden. */}
          <SiteNavMenu menuLabel={nav('menu')} links={links} />
        </div>
      </div>
    </header>
  )
}
