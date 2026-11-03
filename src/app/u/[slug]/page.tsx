import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, CalendarClock, Ban } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { UnlockExperience, type UnlockStepPreview } from '@/components/unlock/unlock-experience'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/session'
import { getPublicUnlockLink, isExpired, recordShortLinkVisit, type PublicUnlockLink } from '@/lib/unlock'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; preview?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [link, t] = await Promise.all([getPublicUnlockLink(slug), getTranslations('unlock')])
  if (!link || link.status !== 'ACTIVE') {
    return { title: t('linkUnavailable') }
  }
  return {
    title: `${link.title} · ${t('metaTitleSuffix')}`,
    description: link.description ?? t('metaDescription', { owner: link.ownerName }),
    robots: { index: false, follow: false },
  }
}

export default async function UnlockPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { token, preview } = await searchParams
  const t = await getTranslations('unlock')

  const link = await getPublicUnlockLink(slug)
  if (!link) {
    notFound()
  }

  const steps = toSteps(link)
  const stats = { viewCount: link.viewCount, unlockCount: link.unlockCount }

  if (link.status === 'DISABLED') {
    return (
      <Notice
        icon={<Ban className="size-6" />}
        title={t('disabledTitle')}
        message={t('disabledMessage')}
        slug={link.slug}
      />
    )
  }

  if (link.status === 'DRAFT') {
    // Owners may preview an unpublished link; everyone else sees the notice.
    const session = preview === '1' ? await getSession() : null
    if (!session || session.user.id !== link.ownerId) {
      return (
        <Notice
          icon={<AlertTriangle className="size-6" />}
          title={t('unpublishedTitle')}
          message={t('unpublishedMessage')}
        />
      )
    }

    return (
      <UnlockExperience
        slug={link.slug}
        title={link.title}
        description={link.description}
        coverImage={link.coverImage}
        initialToken={token && token.length <= 128 ? token : null}
        steps={steps}
        {...stats}
        preview
      />
    )
  }

  if (isExpired(link.expiresAt)) {
    return (
      <Notice
        icon={<CalendarClock className="size-6" />}
        title={t('expiredTitle')}
        message={t('expiredMessage')}
        slug={link.slug}
      />
    )
  }

  // Zero-action URL links act as short links: deliver the destination instantly.
  if (link.actions.length === 0 && link.contentType === 'URL' && link.targetUrl) {
    await recordShortLinkVisit(link.id)
    redirect(link.targetUrl)
  }

  return (
    <UnlockExperience
      slug={link.slug}
      title={link.title}
      description={link.description}
      coverImage={link.coverImage}
      initialToken={token && token.length <= 128 ? token : null}
      steps={steps}
      {...stats}
    />
  )
}

function toSteps(link: PublicUnlockLink): UnlockStepPreview[] {
  return link.actions.map((action) => ({
    id: action.id,
    label: action.label?.trim() || action.optionLabel || action.type,
    platform: action.platform,
    icon: action.icon,
    behavior: action.behavior,
  }))
}

async function Notice({
  icon,
  title,
  message,
  slug,
}: {
  icon: React.ReactNode
  title: string
  message: string
  slug?: string
}) {
  const t = await getTranslations('unlock')
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
        {slug ? (
          <p className="mt-4 text-xs text-muted-foreground">
            <a href={`/report?link=${slug}`} className="hover:underline">
              {t('report')}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
