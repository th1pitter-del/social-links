'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AtSign,
  ChevronRight,
  ExternalLink,
  FileText,
  FileLock2,
  Flag,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  Menu,
  PanelTop,
  Scissors,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'

import { cn } from 'cn'
import { signOutAction } from '@/lib/actions/auth'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type IconType = ComponentType<{ className?: string }>

type NavItem = { href: string; label: string; icon: IconType; badge?: number }
type NavGroup = { title: string; items: NavItem[] }

export type AdminShellUser = { id: string; name: string; email: string }

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A'
  )
}

function isActive(pathname: string, href: string) {
  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({
  user,
  siteName,
  openReports,
  children,
}: {
  user: AdminShellUser
  siteName: string
  openReports: number
  children: ReactNode
}) {
  const t = useTranslations('adminShell')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const groups: NavGroup[] = [
    {
      title: t('groups.overview'),
      items: [{ href: '/admin', label: t('nav.dashboard'), icon: LayoutDashboard }],
    },
    {
      title: t('groups.moderation'),
      items: [
        { href: '/admin/reports', label: t('nav.abuseReports'), icon: Flag, badge: openReports },
        { href: '/admin/links', label: t('nav.links'), icon: Link2 },
        { href: '/admin/short-links', label: t('nav.shortLinks'), icon: Scissors },
        { href: '/admin/bio', label: t('nav.bioPages'), icon: AtSign },
        { href: '/admin/users', label: t('nav.users'), icon: Users },
      ],
    },
    {
      title: t('groups.content'),
      items: [
        { href: '/admin/content', label: t('nav.siteContent'), icon: FileText },
        { href: '/admin/platforms', label: t('nav.platforms'), icon: Globe },
        { href: '/admin/media', label: t('nav.mediaLibrary'), icon: Images },
        { href: '/admin/files', label: t('nav.lockedFiles'), icon: FileLock2 },
      ],
    },
    {
      title: t('groups.monetization'),
      items: [
        { href: '/admin/ads', label: t('nav.ads'), icon: Megaphone },
        { href: '/admin/header-links', label: t('nav.headerLinks'), icon: PanelTop },
      ],
    },
    {
      title: t('groups.system'),
      items: [

        { href: '/admin/settings', label: t('nav.settings'), icon: Settings },
        { href: '/admin/audit', label: t('nav.auditLog'), icon: ScrollText },
      ],
    },
  ]

  const allItems = groups.flatMap((group) => group.items)
  const current = [...allItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActive(pathname, item.href))
  const currentGroup = current
    ? groups.find((group) => group.items.some((item) => item.href === current.href))?.title
    : undefined
  const CurrentIcon = current?.icon

  return (
    <div className="admin-theme flex min-h-screen w-full flex-1 bg-background text-foreground">
      <form id="admin-signout" action={signOutAction} className="hidden" />

      {mobileOpen ? (
        <button
          type="button"
          aria-label={t('closeNavigation')}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:translate-x-0',
          mobileOpen
            ? 'translate-x-0'
            : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{t('adminConsole')}</p>
            <p className="truncate text-[11px] text-sidebar-foreground">{siteName}</p>
          </div>
          <button
            type="button"
            aria-label={t('closeNavigation')}
            onClick={() => setMobileOpen(false)}
            className="ms-auto rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/70 uppercase">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cn(
                              'ms-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              active ? 'bg-black/15 text-primary-foreground' : 'bg-error text-white',
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-sidebar-foreground">{user.email}</p>
            </div>
            <button
              type="submit"
              form="admin-signout"
              aria-label={t('signOut')}
              title={t('signOut')}
              className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="relative sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <button
            type="button"
            aria-label={t('openNavigation')}
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:flex">
            {CurrentIcon ? <CurrentIcon className="size-5" /> : <LayoutDashboard className="size-5" />}
          </span>

          <div className="min-w-0">
            <nav
              aria-label={t('breadcrumbAdmin')}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
            >
              <Link href="/admin" className="hidden transition-colors hover:text-foreground sm:inline">
                {t('breadcrumbAdmin')}
              </Link>
              <ChevronRight className="hidden size-3 shrink-0 text-muted-foreground/50 rtl:rotate-180 sm:inline" />
              <span className="truncate tracking-wide uppercase">{currentGroup ?? t('groups.overview')}</span>
            </nav>
            <p className="truncate text-sm font-semibold text-foreground">
              {current?.label ?? t('nav.dashboard')}
            </p>
          </div>

          <div className="ms-auto flex items-center gap-1.5">
            <LanguageSwitcher area="admin" />
            <ThemeSwitcher />
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-accent-text sm:flex"
            >
              <ExternalLink className="size-4" />
              {t('viewSite')}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-transparent p-1 pe-2 transition-colors hover:border-border hover:bg-muted">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-[11px] text-primary-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-64">
                <div className="mb-1 flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
                    {t('admin')}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    <User />
                    {t('profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
                    <Settings />
                    {t('adminSettings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild variant="destructive">
                  <button type="submit" form="admin-signout" className="w-full">
                    <LogOut />
                    {t('signOut')}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-6 2xl:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(201,247,42,0.08),transparent)]"
          />
          <div className="relative mx-auto w-full max-w-[1600px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
