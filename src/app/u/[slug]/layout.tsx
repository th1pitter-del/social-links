import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { AdSlot } from '@/components/ads/ad-slot'
import { BrandMark } from '@/components/brand-mark'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import { UserPageNav } from '@/components/user-page-nav'
import { getSiteSettings } from '@/lib/settings'

export default async function UnlockLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings()
  const t = await getTranslations('bio')

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BrandMark className="size-6" src={site.logoUrl || null} />
            <span>{site.name}</span>
          </Link>
          <Button size="sm" asChild>
            <Link href="/create">{t('createOwnLink')}</Link>
          </Button>
        </div>
        <UserPageNav />
      </header>

      <div className="flex flex-1 flex-col">
        <AdSlot placement="unlock-top" className="mx-auto w-full max-w-5xl px-4 pt-6" />
        {children}
        <AdSlot placement="unlock-bottom" className="mx-auto w-full max-w-5xl px-4 pb-8" />
      </div>

      <SiteFooter bordered={false} showBrand={false} compact />
    </div>
  )
}
