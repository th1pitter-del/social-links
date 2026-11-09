import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { AdSlot } from '@/components/ads/ad-slot'
import { BioLinkGlyph } from '@/components/profile/bio-link-glyph'
import {
  bioButtonCssVars,
  bioCardStyle,
  bioHeadingStyle,
  resolveBioPalette,
  resolveBioTheme,
} from '@/lib/bio-themes'
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
      links: {
        orderBy: { position: 'asc' },
        select: { label: true, url: true, platform: true },
      },
    },
  })
  if (!profile) {
    notFound()
  }

  const site = await getSiteSettings()
  const name = profile.displayName?.trim() || handle
  const theme = resolveBioTheme(profile.theme)
  const palette = resolveBioPalette(profile.theme, profile.accent)
  const buttonVars = bioButtonCssVars(profile.theme, profile.accent)
  // The page owns its palette; the site header above keeps the product's own
  // colours so a bio page never looks like a different website.
  const vars = {
    '--bio-bg': palette.background,
    '--bio-surface': palette.surface,
    '--bio-text': palette.text,
    '--bio-muted': palette.muted,
    '--bio-border': palette.border,
    '--bio-accent': palette.accent,
    '--bio-on-accent': palette.onAccent,
  } as CSSProperties

  return (
    <div className="flex w-full flex-1 flex-col" style={vars}>
      <AdSlot placement="bio-top" className="mx-auto w-full max-w-lg px-4 pt-6" />
      <div className="mx-auto w-full max-w-lg px-4 py-12">
        <div
          className={theme.card ? 'mx-auto w-full max-w-[30rem] border p-5 sm:p-7' : undefined}
          style={bioCardStyle(theme.card)}
        >
          <div className="flex flex-col items-center text-center">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={name}
                className="size-24 rounded-full border object-cover"
                style={{
                  borderColor: 'var(--bio-border)',
                  boxShadow: '0 0 0 4px color-mix(in srgb, var(--bio-accent) 18%, transparent)',
                }}
              />
            ) : (
              <div
                className="flex size-24 items-center justify-center rounded-full border text-3xl font-semibold"
                style={{
                  borderColor: 'var(--bio-border)',
                  backgroundColor: 'var(--bio-surface)',
                  boxShadow: '0 0 0 4px color-mix(in srgb, var(--bio-accent) 18%, transparent)',
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1
              className="mt-5 max-w-full text-2xl font-semibold tracking-tight"
              style={bioHeadingStyle(theme)}
            >
              {name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--bio-muted)' }}>
              /bio/{handle}
            </p>
            {profile.bio ? (
              <p
                className="mt-3 max-w-prose text-sm leading-relaxed"
                style={{ color: 'var(--bio-muted)' }}
              >
                {profile.bio}
              </p>
            ) : null}
          </div>

          {profile.links.length > 0 ? (
            <div className="mt-8 space-y-3">
              {profile.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bio-link group flex w-full items-center justify-between gap-3 px-5 py-4 text-sm"
                  style={buttonVars}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <BioLinkGlyph platform={link.platform} className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">{link.label}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ))}
            </div>
          ) : null}

          <p className="mt-10 text-center text-xs" style={{ color: 'var(--bio-muted)' }}>
            {t('poweredBy', { name: site.name })}
          </p>
        </div>
      </div>
      <AdSlot placement="bio-bottom" className="mx-auto w-full max-w-lg px-4 pb-8" />
    </div>
  )
}
