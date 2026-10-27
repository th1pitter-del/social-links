import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Link2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'

type PageProps = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const [profile, t] = await Promise.all([
    prisma.profile.findFirst({
      where: { handle: handle.toLowerCase(), published: true },
      select: { displayName: true, bio: true },
    }),
    getTranslations('bio'),
  ])
  if (!profile) {
    return { title: t('metaUnavailable') }
  }
  const name = profile.displayName ?? handle
  return {
    title: `${name} · ${t('metaTitleSuffix')}`,
    description: profile.bio ?? t('metaDescription', { name }),
    robots: { index: false, follow: false },
  }
}

export default async function BioPage({ params }: PageProps) {
  const { handle: rawHandle } = await params
  const handle = rawHandle.toLowerCase()
  const t = await getTranslations('bio')

  const profile = await prisma.profile.findFirst({
    where: { handle, published: true },
    include: {
      links: { orderBy: { position: 'asc' }, select: { label: true, url: true } },
    },
  })
  if (!profile) {
    notFound()
  }

  const [site, unlockLinks] = await Promise.all([
    getSiteSettings(),
    prisma.link.findMany({
      where: { ownerId: profile.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, title: true },
    }),
  ])
  const name = profile.displayName?.trim() || handle

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="flex flex-col items-center text-center">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="size-20 rounded-full object-cover ring-4 ring-background"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{name}</h1>
        {profile.bio ? <p className="mt-2 max-w-prose text-sm text-muted-foreground">{profile.bio}</p> : null}
      </div>

      {profile.links.length > 0 ? (
        <div className="mt-6 space-y-2">
          {profile.links.map((link, index) => (
            <Button
              key={index}
              asChild
              size="lg"
              className="group w-full justify-between"
              variant="outline"
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Button>
          ))}
        </div>
      ) : null}

      {unlockLinks.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Link2 className="size-3.5" />
            <span>{t('unlockLinks')}</span>
          </div>
          <div className="space-y-2">
            {unlockLinks.map((link) => (
              <Button
                key={link.id}
                asChild
                size="lg"
                className="group w-full justify-between"
                variant="secondary"
              >
                <Link href={`/u/${link.slug}`}>
                  {link.title}
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t('poweredBy', { name: site.name })}
      </p>
    </div>
  )
}
