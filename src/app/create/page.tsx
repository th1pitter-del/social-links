import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Gift, Lock, ShieldCheck } from 'lucide-react'

import { LinkForm } from '@/components/link-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getEnabledActionOptions } from '@/lib/action-catalog'
import { getGuestToken } from '@/lib/guest'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('create')
  return { title: t('title'), alternates: { canonical: '/create' } }
}

export const dynamic = 'force-dynamic'

export default async function CreatePage() {
  const t = await getTranslations('create')
  const session = await getSession()
  if (session) {
    redirect('/dashboard/links/new')
  }

  const guestToken = await getGuestToken()

  const [actionTypes, existingGuestLink] = await Promise.all([
    getEnabledActionOptions(),
    guestToken
      ? prisma.link.findFirst({
          where: { guestToken, ownerId: null },
          orderBy: { createdAt: 'desc' },
          select: { slug: true },
        })
      : Promise.resolve(null),
  ])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12">
        <div className="mb-8 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Gift className="size-3.5 text-accent-text" />
            {t('badge')}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-accent-text" />
              {t('bulletHidden')}
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-text" />
              {t('bulletServer')}
            </li>
          </ul>
        </div>

        <LinkForm
          mode="create"
          guest
          centered
          actionTypes={actionTypes}
          existingSlug={existingGuestLink?.slug}
        />
      </main>
      <SiteFooter />
    </>
  )
}
