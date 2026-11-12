import { getTranslations } from 'next-intl/server'

import { getActiveAds } from '@/lib/ads-data'
import { AD_SLOT_SIZES, type AdPlacement, type AdUnitData } from '@/lib/ads'
import { AdHtml } from '@/components/ads/ad-html'

function adRel(newTab: boolean) {
  return newTab ? 'sponsored noopener noreferrer' : 'sponsored'
}

function AdUnitView({ ad, placement }: { ad: AdUnitData; placement: AdPlacement }) {
  if (ad.type === 'html' && ad.html) {
    return <AdHtml code={ad.html} />
  }

  if (ad.type === 'link' && ad.url) {
    return (
      <a
        href={ad.url}
        target={ad.newTab ? '_blank' : undefined}
        rel={adRel(ad.newTab)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 hover:text-accent-text"
      >
        {ad.label || ad.name}
      </a>
    )
  }

  if (ad.type === 'banner' && ad.url && ad.imageUrl) {
    const size = AD_SLOT_SIZES[placement]
    return (
      <a
        href={ad.url}
        target={ad.newTab ? '_blank' : undefined}
        rel={adRel(ad.newTab)}
        className="relative block overflow-hidden rounded-xl transition-opacity hover:opacity-95"
        style={{ aspectRatio: `${size.width} / ${size.height}` }}
      >
        {/* Ad creatives are arbitrary admin-managed images, not app assets. */}
        {/* Ad blockers hide these creatives by injecting inline styles before
            React hydrates, which is a DOM mutation we don't own. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.imageUrl}
          alt={ad.label || ad.name}
          width={size.width}
          height={size.height}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain"
          suppressHydrationWarning
        />
      </a>
    )
  }

  return null
}

/**
 * Server component rendering every enabled ad for one placement. Renders
 * nothing when the placement has no enabled units, so pages stay unchanged
 * until an administrator configures ads. Banner slots reserve their standard
 * IAB size, capped to the real creative width, so they never shift the page.
 */
export async function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement
  className?: string
}) {
  const ads = await getActiveAds(placement)
  if (ads.length === 0) return null

  const t = await getTranslations('common')
  const maxWidth = AD_SLOT_SIZES[placement].width

  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-muted-foreground/80 uppercase">
        {t('sponsored')}
      </p>
      <div className="space-y-3">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className={ad.type === 'banner' ? 'mx-auto w-full' : undefined}
            style={ad.type === 'banner' ? { maxWidth } : undefined}
          >
            <AdUnitView ad={ad} placement={placement} />
          </div>
        ))}
      </div>
    </div>
  )
}
