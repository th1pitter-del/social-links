import { Globe, Link2 } from 'lucide-react'

import { BrandIcon } from '@/components/brand-icon'

/**
 * The mark shown beside a bio link: the platform's own logo when the creator
 * picked one, a globe for website links, and a generic chain for custom links.
 */
export function BioLinkGlyph({
  platform,
  className,
}: {
  platform: string | null | undefined
  className?: string
}) {
  if (!platform) return <Link2 className={className} />
  if (platform === 'website') return <Globe className={className} />
  const brand = <BrandIcon platform={platform} className={className} />
  return brand
}
