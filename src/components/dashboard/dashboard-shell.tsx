'use client'

import { useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  LayoutDashboard,
  Link2,
  FileText,
  Lock,
  LogOut,
  Mail,
  Menu,
  Plus,
  Shield,
  Sparkles,
  User,
  Users,
  BarChart3,
  Trophy,
  X,
} from 'lucide-react'

import { cn } from 'cn'
import { BrandMark } from '@/components/brand-mark'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { signOutAction } from '@/lib/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type IconType = ComponentType<{ className?: string }>

type NavItem = { href: string; label: string; icon: IconType }
type NavGroup = { title: string; items: NavItem[] }

export type DashboardShellUser = {
  id: string
  name: string
  email: string
  role: string
}

const COLLAPSE_KEY = 'dashboard-sidebar-collapsed'
const COLLAPSE_EVENT = 'dashboard-sidebar-collapse'

function subscribeCollapse(callback: () => void) {
  window.addEventListener(COLLAPSE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function useCollapsed() {
  return useSyncExternalStore(
    subscribeCollapse,
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
    () => false,
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

function isActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardShell({
  user,
  siteName,
  children,
}: {
  user: DashboardShellUser
  siteName: string
  children: ReactNode
}) {
  const t = useTranslations('dashboardShell')
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = useCollapsed()

  function toggleCollapsed() {
    const next = !collapsed
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    window.dispatchEvent(new Event(COLLAPSE_EVENT))
  }

  const groups: NavGroup[] = [
    {
      title: t('groups.workspace'),
      items: [
        { href: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
        { href: '/dashboard/links', label: t('nav.myLinks'), icon: Link2 },
        { href: '/dashboard/leads', label: t('nav.emailLists'), icon: Mail },
        { href: '/dashboard/analytics', label: t('nav.analytics'), icon: BarChart3 },
      ],
    },
    {
      title: t('groups.assets'),
      items: [
        { href: '/dashboard/files', label: t('nav.files'), icon: FileText },
        { href: '/dashboard/unlocks', label: t('nav.myUnlocks'), icon: Lock },
        { href: '/dashboard/milestones', label: t('nav.milestones'), icon: Trophy },
        { href: '/dashboard/profile', label: t('nav.bioPage'), icon: Users },
      ],
    },
    {
      title: t('groups.create'),
      items: [{ href: '/dashboard/links/new', label: t('nav.newLink'), icon: Plus }],
    },
    ...(user.role === 'ADMIN'
      ? [
          {
            title: t('groups.manage'),
            items: [{ href: '/admin', label: t('nav.adminConsole'), icon: Shield }],
          },
        ]
      : []),
  ]

  // Highlight only the most specific matching route (e.g. /dashboard/links/new
  // wins over /dashboard/links).
  const allItems = groups.flatMap((group) => group.items)
  const activeHref = [...allItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActive(pathname, item.href))?.href
  const current = allItems.find((item) => item.href === activeHref)
  const currentGroup = groups.find((group) =>
    group.items.some((item) => item.href === activeHref),
  )?.title
  const CurrentIcon = current?.icon

  return (
    <div className="flex min-h-screen w-full flex-1 bg-background text-foreground">
      <form id="dashboard-signout" action={signOutAction} className="hidden" />

      {mobileOpen ? (
        <button
          type="button"
          aria-label={t('closeNavigation')}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-out lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          mobileOpen
            ? 'translate-x-0'
            : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2.5 border-b px-5',
            collapsed ? 'lg:justify-center lg:px-3' : '',
          )}
        >
          <BrandMark className="size-9 shrink-0" />
          <div className={cn('min-w-0', collapsed ? 'lg:hidden' : '')}>
            <p className="truncate text-sm font-semibold text-foreground">{t('brandName')}</p>
            <p className="truncate text-[11px] text-muted-foreground">{siteName}</p>
          </div>
          <button
            type="button"
            aria-label={t('closeNavigation')}
            onClick={() => setMobileOpen(false)}
            className="ms-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={cn('px-3 pt-4', collapsed ? 'lg:px-2' : '')}>
          <Link
            href="/dashboard/links/new"
            onClick={() => setMobileOpen(false)}
            title={t('createLink')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90',
              collapsed ? 'lg:px-0' : '',
            )}
          >
            <Plus className="size-4 shrink-0" />
            <span className={cn(collapsed ? 'lg:hidden' : '')}>{t('createLink')}</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p
                className={cn(
                  'px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase',
                  collapsed ? 'lg:hidden' : '',
                )}
              >
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.href === activeHref
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={item.label}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          collapsed ? 'lg:justify-center lg:px-0' : '',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className={cn('truncate', collapsed ? 'lg:hidden' : '')}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-2',
              collapsed ? 'lg:justify-center lg:px-0' : '',
            )}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className={cn('min-w-0 flex-1', collapsed ? 'lg:hidden' : '')}>
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <button
              type="submit"
              form="dashboard-signout"
              aria-label={t('signOut')}
              title={t('signOut')}
              className={cn(
                'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                collapsed ? 'lg:hidden' : '',
              )}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-200',
          collapsed ? 'lg:ps-20' : 'lg:ps-64',
        )}
      >
        <header className="relative sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          />
          <button
            type="button"
            aria-label={t('openNavigation')}
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
            className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
          >
            {collapsed ? (
              <ChevronsRight className="size-5 rtl:rotate-180" />
            ) : (
              <ChevronsLeft className="size-5 rtl:rotate-180" />
            )}
          </button>

          <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:flex">
            {CurrentIcon ? <CurrentIcon className="size-5" /> : <LayoutDashboard className="size-5" />}
          </span>

          <div className="min-w-0">
            <nav
              aria-label={t('breadcrumbDashboard')}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
            >
              <Link
                href="/dashboard"
                className="hidden transition-colors hover:text-foreground sm:inline"
              >
                {t('breadcrumbDashboard')}
              </Link>
              <ChevronRight className="hidden size-3 shrink-0 text-muted-foreground/50 rtl:rotate-180 sm:inline" />
              <span className="truncate tracking-wide uppercase">{currentGroup ?? t('groups.workspace')}</span>
            </nav>
            <p className="truncate text-sm font-semibold text-foreground">
              {current?.label ?? t('nav.overview')}
            </p>
          </div>

          <div className="ms-auto flex items-center gap-1.5">
            <ThemeSwitcher />
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            >
              <ExternalLink className="size-4" />
              {t('viewSite')}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-transparent p-1 pe-2 transition-colors hover:border-border hover:bg-muted">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-64">
                <div className="mb-1 flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {user.role === 'ADMIN' ? t('admin') : t('member')}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <Sparkles />
                    {t('backToDashboard')}
                  </Link>
                </DropdownMenuItem>
                {user.role === 'ADMIN' ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}`}>
                      <User />
                      {t('adminProfile')}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild variant="destructive">
                  <button type="submit" form="dashboard-signout" className="w-full">
                    <LogOut />
                    {t('signOut')}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(201,247,42,0.09),transparent)]"
          />
          <div className="relative w-full space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
