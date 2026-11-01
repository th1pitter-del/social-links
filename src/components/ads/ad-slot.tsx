import { getActiveAds } from '@/lib/ads-data'
import type { AdPlacement, AdUnitData } from '@/lib/ads'
import { AdHtml } from '@/components/ads/ad-html'

function adRel(newTab: boolean) {
  return newTab ? 'sponsorednoopener noreferrer' : 'sponsored'
}

function AdUnitView({ ad }: { ad: AdUnitData }) {
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
    return (
      <a
        href={ad.url}
        target={ad.newTab ? '_blank' : undefined}
        rel={adRel(ad.newTab)}
        className="block overflow-hidden rounded-xl border bg-card shadow-sm transition-opacity hover:opacity-95"
      >
        {/* Ad creatives are arbitrary admin-managed images, not app assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.imageUrl}
          alt={ad.label || ad.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-auto w-full object-contain"
        />
      </a>
    )
  }

  return null
}

/**
 * Server component rendering every enabled ad for one placement. Renders
 * nothing when the placement has no enabled units, so pages stay unchanged
 * until an administrator configures ads.
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

  return (
    <div className={className}>
      <div className="space-y-3">
        {ads.map((ad) => (
          <AdUnitView key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  )
}
