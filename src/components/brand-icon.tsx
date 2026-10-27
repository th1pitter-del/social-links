import { createElement } from 'react'
import { cn } from 'cn'

import { actionIcon } from '@/lib/action-icons'
import { BRAND_ICONS } from '@/lib/brand-icons'

// Maps a platform key or label (normalized to lowercase alphanumerics) to the
// matching vendored simple-icons slug.
const PLATFORM_BRANDS: Record<string, string> = {
  youtube: 'youtube',
  tiktok: 'tiktok',
  instagram: 'instagram',
  facebook: 'facebook',
  x: 'x',
  twitter: 'x',
  threads: 'threads',
  discord: 'discord',
  twitch: 'twitch',
  kick: 'kick',
  reddit: 'reddit',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
  snapchat: 'snapchat',
  linkedin: 'linkedin',
  pinterest: 'pinterest',
  spotify: 'spotify',
  soundcloud: 'soundcloud',
  github: 'github',
  medium: 'medium',
  tumblr: 'tumblr',
  vimeo: 'vimeo',
  patreon: 'patreon',
  kofi: 'kofi',
  steam: 'steam',
  etsy: 'etsy',
  substack: 'substack',
  mastodon: 'mastodon',
  bluesky: 'bluesky',
  vk: 'vk',
  quora: 'quora',
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function brandSlugFor(platform: string | null | undefined): string | null {
  if (!platform) return null
  const slug = PLATFORM_BRANDS[normalize(platform)]
  return slug && BRAND_ICONS[slug] ? slug : null
}

// Uses the official brand color when it stays legible on both light and dark
// backgrounds; near-black (GitHub, X, …) and near-white (Snapchat) brands fall
// back to `currentColor` so the glyph never disappears.
function brandColor(hex: string): string | undefined {
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return undefined
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luminance < 0.13 || luminance > 0.82) return undefined
  return `#${hex}`
}

export function BrandIcon({
  platform,
  className,
}: {
  platform: string | null | undefined
  className?: string
}) {
  const slug = brandSlugFor(platform)
  const icon = slug ? BRAND_ICONS[slug] : undefined
  if (!slug || !icon) return null
  const color = brandColor(icon.hex)
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="currentColor"
      style={color ? { color } : undefined}
    >
      <path d={icon.path} />
    </svg>
  )
}

// Platform's real brand logo when one exists, otherwise the configured generic
// action icon. Use this where the platform itself is the subject (platform
// pickers, the admin platform list), not for individual actions.
export function PlatformGlyph({
  platform,
  icon,
  className,
}: {
  platform: string | null | undefined
  icon: string
  className?: string
}) {
  if (brandSlugFor(platform)) {
    return <BrandIcon platform={platform} className={className} />
  }
  return createElement(actionIcon(icon), { className })
}

// Composite for a single action: the platform brand logo with a small badge
// showing the action type (heart, thumbs-up, bell, …). Falls back to the plain
// generic action icon when the platform has no brand logo.
export function ActionGlyph({
  platform,
  icon,
  className,
}: {
  platform: string | null | undefined
  icon: string
  className?: string
}) {
  if (!brandSlugFor(platform)) {
    return createElement(actionIcon(icon), { className })
  }
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      <BrandIcon platform={platform} className="size-full" />
      <span className="absolute -right-0.5 -bottom-0.5 flex size-[62%] items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/60">
        {createElement(actionIcon(icon), { className: 'size-[68%]' })}
      </span>
    </span>
  )
}
