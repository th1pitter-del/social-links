import 'server-only'

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { DEFAULT_SITE_NAME, getSiteSettings } from '@/lib/settings'
import { sendMail } from '@/lib/mailer'

export const auth = betterAuth({
  // Static fallback only; the brand name in delivered mail follows `site.name`.
  appName: DEFAULT_SITE_NAME,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'mysql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Password recovery is delivered through EMAIL_WEBHOOK_URL when configured.
    // Without it the reset URL is only written to the server log (development).
    sendResetPassword: async ({ user, url }) => {
      const [t, site] = await Promise.all([getTranslations('email'), getSiteSettings()])
      const delivered = await sendMail({
        to: user.email,
        subject: t('resetPasswordSubject', { site: site.name }),
        text: t('resetPasswordBody', { name: user.name, url }),
        type: 'password_reset',
        url,
      })

      if (delivered) return

      if (process.env.NODE_ENV === 'production') {
        console.warn(
          `[auth] Password reset requested for ${user.email} but EMAIL_WEBHOOK_URL is not configured.`,
        )
        return
      }
      console.info(`[auth] Password reset URL for ${user.email}: ${url}`)
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
        // Never let a client choose its own role.
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    // Session cookies are httpOnly + sameSite=lax by default; enable secure
    // cookies automatically behind HTTPS.
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  plugins: [
    nextCookies(),
    // Enforces the `banned` flag on every session creation (sign-in through
    // server actions or the mounted API routes alike), so a banned user
    // cannot regain access by signing in again. Role values match the
    // UserRole enum (USER/ADMIN).
    admin({ defaultRole: 'USER', adminRoles: ['ADMIN'] }),
  ],
})

export type Session = typeof auth.$Infer.Session
export type SessionUser = typeof auth.$Infer.Session.user
