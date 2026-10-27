import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

import { isLocale, localeAreaHeader, localeCookieName, negotiateLocale } from '@/i18n/config'

// Optimistic, cookie-only checks for redirect UX. Real authorization is always
// enforced server-side in pages, server actions and route handlers.
const PROTECTED_PREFIXES = ['/dashboard', '/admin']

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function withLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!isLocale(request.cookies.get(localeCookieName)?.value)) {
    const locale = negotiateLocale(request.headers.get('accept-language'))
    response.cookies.set(localeCookieName, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const admin = isAdminPath(pathname)
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (isProtected && !getSessionCookie(request)) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', pathname)
    return withLocaleCookie(request, NextResponse.redirect(signInUrl))
  }

  // Mark admin requests so i18n resolves the admin locale independently of the
  // public site locale.
  if (admin) {
    const headers = new Headers(request.headers)
    headers.set(localeAreaHeader, 'admin')
    return withLocaleCookie(request, NextResponse.next({ request: { headers } }))
  }

  return withLocaleCookie(request, NextResponse.next())
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
