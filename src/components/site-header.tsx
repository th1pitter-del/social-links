import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react'

import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BrandMark className="size-6" src={site.logoUrl || null} />
          <span>{site.name}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            {nav('howItWorks')}
          </Link>
          <Link href="/#features" className="transition-colors hover:text-foreground">
            {nav('features')}
          </Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">
            {nav('faq')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <>
              <form id="site-signout" action={signOutAction} className="hidden" />
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  <LayoutDashboard className="size-4" />
                  {common('dashboard')}
                </Link>
              </Button>
              {user.role === 'ADMIN' ? (
                <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                  <Link href="/admin">
                    <ShieldCheck className="size-4" />
                    {common('admin')}
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                form="site-signout"
                aria-label={common('signOut')}
                title={common('signOut')}
              >
                <LogOut className="size-4" />
                <span className="hidden lg:inline">{common('signOut')}</span>
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
        </div>
      </div>
    </header>
  )
}
