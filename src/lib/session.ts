import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Server-side guard for authenticated areas. Never trust client state. */
export async function requireUser() {
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  return session
}

/** Landing page for a signed-in user: admins live in the console, owners in their dashboard. */
export function homePathForRole(role: string | null | undefined): string {
  return role === 'ADMIN' ? '/admin' : '/dashboard'
}

export async function requireAdmin() {
  const session = await requireUser()
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return session
}
