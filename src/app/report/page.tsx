import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { ReportLinkForm } from '@/components/report-link-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('report')
  return {
    title: t('title'),
    robots: { index: false, follow: false },
  }
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>
}) {
  const { link } = await searchParams
  const slug = (link ?? '').trim().toLowerCase()
  const t = await getTranslations('report')
  const site = await getSiteSettings()

  const exists =
    slug.length > 0 && slug.length <= 64
      ? await prisma.link.findUnique({ where: { slug }, select: { id: true } })
      : null
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-8">
          {exists ? (
            <div className="rounded-2xl border bg-card p-5 sm:p-6">
              <ReportLinkForm slug={slug} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="font-medium">{t('notFoundTitle')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t('notFoundBody')}</p>
              <Button variant="outline" className="mt-5" asChild>
                <Link href="/">{t('notFoundCta')}</Link>
              </Button>
            </div>
          )}
        </div>

        {site.contentPolicy ? (
          <section className="mt-10 rounded-2xl border bg-muted/30 p-5">
            <h2 className="text-sm font-semibold">{t('policyTitle')}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {site.contentPolicy}
            </p>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  )
}
