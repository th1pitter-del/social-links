import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/site-header'
import { getSiteSettings } from '@/lib/settings'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [t, nav, common, site] = await Promise.all([
    getTranslations('auth.layout'),
    getTranslations('nav'),
    getTranslations('common'),
    getSiteSettings(),
  ])

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(201,247,42,0.20),transparent)] dark:bg-[radial-gradient(50%_40%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
      />
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <BrandMark className="size-6" src={site.logoUrl || null} />
          {common('siteName')}
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('agreementBefore')}{' '}
          <Link href="/terms" className="underline">
            {nav('terms')}
          </Link>{' '}
          {t('and')}{' '}
          <Link href="/privacy" className="underline">
            {nav('privacy')}
          </Link>
          {t('agreementAfter')}
        </p>
      </div>
    </div>
  )
}
