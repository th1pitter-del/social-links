import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/site-header'
import { getSiteSettings } from '@/lib/settings'
import { cn } from 'cn'

export async function SiteFooter({
  bordered = true,
  showBrand = true,
  compact = false,
}: {
  bordered?: boolean
  showBrand?: boolean
  compact?: boolean
}) {
  const [site, t, nav] = await Promise.all([
    getSiteSettings(),
    getTranslations('footer'),
    getTranslations('nav'),
  ])

  return (
    <footer className={cn('mt-auto', bordered && 'border-t')}>
      <div
        className={cn(
          'mx-auto flex w-full max-w-[1200px] flex-col px-4 sm:flex-row sm:items-center',
          compact
            ? 'items-center justify-center gap-4 py-5 text-center'
            : 'gap-6 py-10 sm:justify-between',
        )}
      >
        {showBrand ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <BrandMark className="size-5" src={site.logoUrl || null} />
              {site.name}
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              {site.hasCustomTagline ? site.tagline : t('tagline')}
            </p>
          </div>
        ) : null}
        <nav
          className={cn(
            'flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground',
            compact && 'justify-center',
          )}
        >
          <Link href="/faq" className="hover:text-foreground">
            {nav('faq')}
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            {nav('contact')}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {nav('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {nav('terms')}
          </Link>
        </nav>
      </div>
      <div className={cn(bordered && 'border-t')}>
        <p
          className={cn(
            'mx-auto w-full max-w-[1200px] px-4 text-xs text-muted-foreground',
            compact ? 'py-2 text-center' : 'py-4',
          )}
        >
          © {new Date().getFullYear()} {site.name}. {t('disclaimer')}
        </p>
      </div>
    </footer>
  )
}
