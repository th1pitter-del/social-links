import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import { getSiteSettings } from '@/lib/settings'

export default async function BioLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings()
  const t = await getTranslations('bio')

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BrandMark className="size-6" />
            <span>{site.name}</span>
          </Link>
          <Button size="sm" asChild>
            <Link href="/create">{t('createOwnLink')}</Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <SiteFooter bordered={false} showBrand={false} compact />
    </div>
  )
}
