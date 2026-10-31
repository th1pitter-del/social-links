'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { auth } from '@/lib/auth'
import { claimGuestLinks } from '@/lib/guest'
import { consume } from '@/lib/rate-limit'
import { homePathForRole } from '@/lib/session'

export type AuthFormState = {
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

async function clientKey(scope: string) {
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  return `${scope}:${ip}`
}

function firstFieldError(fieldErrors: unknown): Record<string, string> | undefined {
  if (!fieldErrors || typeof fieldErrors !== 'object') return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    const message = Array.isArray(value) ? String(value[0]) : String(value)
    if (message && message !== 'undefined') result[key] = message
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('errors')
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  const fieldErrors: Record<string, string> = {}
  if (name.length < 2) fieldErrors.name = t('enterName')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = t('enterValidEmail')
  if (password.length < 8) fieldErrors.password = t('passwordTooShort')
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  const limited = await consume(await clientKey('auth:signup'), {
    limit: 10,
    windowSeconds: 300,
  })
  if (!limited.ok) return { error: t('tooManyAttempts') }

  let userId: string | undefined
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } })
    userId = result.user.id
  } catch (error) {
    const fieldErrors = firstFieldError(
      (error as { body?: { fieldErrors?: unknown } })?.body?.fieldErrors,
    )
    return {
      error: fieldErrors ? undefined : t('signUpFailed'),
      fieldErrors,
    }
  }

  // Move any links created as a guest onto the new account.
  if (userId) await claimGuestLinks(userId)

  redirect('/dashboard')
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('errors')
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirectTo') ?? '')

  if (!email || !password) {
    return { fieldErrors: { email: !email ? t('enterEmail') : '' } }
  }

  const limited = await consume(await clientKey('auth:signin'), {
    limit: 15,
    windowSeconds: 300,
  })
  if (!limited.ok) return { error: t('tooManyAttempts') }

  let userId: string | undefined
  let role: string | null | undefined
  try {
    const result = await auth.api.signInEmail({ body: { email, password } })
    userId = result.user.id
    role = result.user.role
  } catch (error) {
    // The admin plugin rejects banned users with a BANNED_USER error code.
    const code = (error as { body?: { code?: string } })?.body?.code
    if (code === 'BANNED_USER') {
      return { error: t('accountBanned') }
    }
    return { error: t('invalidCredentials') }
  }

  // Move any links created as a guest onto the signed-in account.
  if (userId) await claimGuestLinks(userId)

  // A pending target (set when an unauthenticated visitor bounced off a protected
  // page) wins; otherwise land by role. Reject protocol-relative values like
  // '//host.example', which would leave the site.
  const explicitTarget =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : ''
  redirect(explicitTarget || homePathForRole(role))
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/')
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('errors')
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: t('enterValidEmail') } }
  }

  const limited = await consume(await clientKey('auth:reset'), {
    limit: 5,
    windowSeconds: 600,
  })
  if (!limited.ok) return { error: t('tooManyAttempts') }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${process.env.BETTER_AUTH_URL ?? ''}/reset-password`,
      },
    })
  } catch {
    // Deliberately do not reveal whether the address exists.
  }

  return {
    message: t('resetLinkSent'),
  }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await getTranslations('errors')
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!token) return { error: t('resetLinkInvalid') }
  if (password.length < 8) return { fieldErrors: { password: t('passwordTooShort') } }

  try {
    await auth.api.resetPassword({ body: { newPassword: password, token } })
  } catch {
    return { error: t('resetLinkInvalid') }
  }

  redirect('/sign-in?reset=1')
}
