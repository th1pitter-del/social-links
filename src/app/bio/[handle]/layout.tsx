import type { CSSProperties } from 'react'

import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { resolveBioPalette, resolveBioTheme } from '@/lib/bio-themes'
import { prisma } from '@/lib/prisma'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ handle: string }>
}

export default async function BioLayout({ children, params }: LayoutProps) {
  const { handle } = await params
  const profile = await prisma.profile.findFirst({
    where: { handle: handle.toLowerCase(), published: true },
    select: { theme: true, accent: true },
  })

  // The profile's theme paints the whole surface, chrome included: the header
  // rail is transparent and it plus the footer resolve text, borders, controls
  // and CTA from the same palette, so no part of the page keeps the site's own
  // colours.
  const theme = profile ? resolveBioTheme(profile.theme) : null
  const palette = profile ? resolveBioPalette(profile.theme, profile.accent) : null
  const themeStyle = palette
    ? ({
        '--background': palette.background,
        '--foreground': palette.text,
        '--muted': palette.surface,
        '--muted-foreground': palette.muted,
        '--accent': palette.surface,
        '--accent-foreground': palette.text,
        '--border': palette.border,
        '--input': palette.border,
        '--ring': palette.accent,
        '--primary': palette.accent,
        '--primary-foreground': palette.onAccent,
        '--brand-mark-bg': palette.accent,
        '--brand-mark-fg': palette.onAccent,
        '--bio-accent': palette.accent,
        backgroundColor: palette.background,
        backgroundImage: theme?.backdrop,
        backgroundRepeat: 'no-repeat',
        backgroundSize: theme?.backdropSize ?? 'cover',
        color: palette.text,
        fontFamily: theme?.bodyFont,
      } as CSSProperties)
    : undefined

  return (
    <div className="flex min-h-full flex-1 flex-col" style={themeStyle}>
      <SiteHeader variant="bio" />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter bordered={false} showBrand={false} compact />
    </div>
  )
}
