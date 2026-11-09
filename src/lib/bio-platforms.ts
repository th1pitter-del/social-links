// Platforms a bio link can wear. Keys match the vendored simple-icons slugs in
// src/lib/brand-icons.ts, plus `website` which draws a generic globe. A link
// with no platform is a custom link.

export type BioPlatform = { key: string; label: string }

export type BioPlatformGroup = {
  key: 'popular' | 'social' | 'creator' | 'other'
  platforms: BioPlatform[]
}

export const BIO_PLATFORM_GROUPS: BioPlatformGroup[] = [
  {
    key: 'popular',
    platforms: [
      { key: 'youtube', label: 'YouTube' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'tiktok', label: 'TikTok' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'x', label: 'X' },
      { key: 'discord', label: 'Discord' },
      { key: 'spotify', label: 'Spotify' },
      { key: 'twitch', label: 'Twitch' },
    ],
  },
  {
    key: 'social',
    platforms: [
      { key: 'threads', label: 'Threads' },
      { key: 'bluesky', label: 'Bluesky' },
      { key: 'mastodon', label: 'Mastodon' },
      { key: 'snapchat', label: 'Snapchat' },
      { key: 'telegram', label: 'Telegram' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'reddit', label: 'Reddit' },
      { key: 'pinterest', label: 'Pinterest' },
      { key: 'linkedin', label: 'LinkedIn' },
      { key: 'vk', label: 'VK' },
      { key: 'tumblr', label: 'Tumblr' },
    ],
  },
  {
    key: 'creator',
    platforms: [
      { key: 'github', label: 'GitHub' },
      { key: 'medium', label: 'Medium' },
      { key: 'substack', label: 'Substack' },
      { key: 'patreon', label: 'Patreon' },
      { key: 'kofi', label: 'Ko-fi' },
      { key: 'steam', label: 'Steam' },
      { key: 'etsy', label: 'Etsy' },
      { key: 'soundcloud', label: 'SoundCloud' },
      { key: 'vimeo', label: 'Vimeo' },
      { key: 'kick', label: 'Kick' },
      { key: 'quora', label: 'Quora' },
    ],
  },
  {
    key: 'other',
    platforms: [{ key: 'website', label: 'Website' }],
  },
]

export const BIO_PLATFORM_KEYS = BIO_PLATFORM_GROUPS.flatMap((group) =>
  group.platforms.map((platform) => platform.key),
)

export function isBioPlatform(value: string | null | undefined): boolean {
  return Boolean(value && BIO_PLATFORM_KEYS.includes(value))
}
