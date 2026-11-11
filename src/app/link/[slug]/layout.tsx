import { AdSlot } from '@/components/ads/ad-slot'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { bioThemeSurfaceStyle } from '@/lib/bio-themes'
import { prisma } from '@/lib/prisma'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function UnlockLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  const link = await prisma.link.findUnique({
    where: { slug },
    select: { theme: true },
  })

  // The creator's theme paints the whole surface, chrome included: the header
  // rail stays transparent and it plus the footer resolve their colours from
  // the same palette. The unlock flow itself is untouched.
  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={link ? bioThemeSurfaceStyle(link.theme, null) : undefined}
    >
      <SiteHeader transparent />

      <div className="flex flex-1 flex-col">
        <AdSlot placement="unlock-top" className="mx-auto w-full max-w-5xl px-4 pt-6" />
        {children}
        <AdSlot placement="unlock-bottom" className="mx-auto w-full max-w-5xl px-4 pb-8" />
      </div>

      <SiteFooter bordered={false} showBrand={false} compact />
    </div>
  )
}
