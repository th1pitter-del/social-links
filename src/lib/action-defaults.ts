export type ActionBehavior = 'URL' | 'EMAIL'

/** Client-safe shape of an action option (no server-only fields). */
export type ActionOptionView = {
  key: string
  label: string
  /** Stable platform key, used for brand marks; null when unassigned. */
  platform: string | null
  /** Platform name shown to people; falls back to `platform` when absent. */
  platformLabel?: string | null
  icon: string
  behavior: ActionBehavior
}

export type ActionOptionDefault = {
  key: string
  label: string
  platform: string | null
  icon: string
  behavior: ActionBehavior
  position: number
}

/**
 * Built-in platforms this build offers. Any other built-in row still exists in
 * the database but stays out of the admin catalog until its key is added here,
 * which is how a retired platform can come back without a migration.
 */
export const SUPPORTED_PLATFORM_KEYS = [
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'discord',
  'spotify',
  'none',
] as const

// Built-in action types shipped with the app, in the order they are shown.
// `platform` is the human-readable platform label (matched to Platform.label
// when seeding).
//
// Three of them can be proven from a public record (YouTube comment, Discord
// join, Discord boost). The rest complete when the visitor opens them; the
// server cannot read the action itself, and the product copy says so.
export const ACTION_OPTION_DEFAULTS: ActionOptionDefault[] = [
  // YouTube
  { key: 'YOUTUBE_SUBSCRIBE', label: 'Subscribe on YouTube', platform: 'YouTube', icon: 'user_plus', behavior: 'URL', position: 0 },
  { key: 'YOUTUBE_VIDEO', label: 'Watch a YouTube video', platform: 'YouTube', icon: 'video', behavior: 'URL', position: 1 },
  { key: 'YOUTUBE_LIKE', label: 'Like a YouTube video', platform: 'YouTube', icon: 'thumbs_up', behavior: 'URL', position: 2 },
  { key: 'YOUTUBE_COMMENT', label: 'Comment on a YouTube video', platform: 'YouTube', icon: 'message', behavior: 'URL', position: 3 },

  // Instagram
  { key: 'INSTAGRAM_LIKE', label: 'Like an Instagram post', platform: 'Instagram', icon: 'heart', behavior: 'URL', position: 4 },
  { key: 'INSTAGRAM_FOLLOW', label: 'Follow on Instagram', platform: 'Instagram', icon: 'user_plus', behavior: 'URL', position: 5 },
  { key: 'INSTAGRAM_COMMENT', label: 'Comment on an Instagram post', platform: 'Instagram', icon: 'message', behavior: 'URL', position: 6 },
  { key: 'INSTAGRAM_REEL', label: 'Watch an Instagram Reel', platform: 'Instagram', icon: 'play_circle', behavior: 'URL', position: 7 },

  // Facebook
  { key: 'FACEBOOK_FOLLOW', label: 'Follow on Facebook', platform: 'Facebook', icon: 'user_plus', behavior: 'URL', position: 8 },
  { key: 'FACEBOOK_LIKE', label: 'Like a Facebook post', platform: 'Facebook', icon: 'thumbs_up', behavior: 'URL', position: 9 },

  // TikTok
  { key: 'TIKTOK_FOLLOW', label: 'Follow on TikTok', platform: 'TikTok', icon: 'user_plus', behavior: 'URL', position: 10 },
  { key: 'TIKTOK_LIKE', label: 'Like a TikTok video', platform: 'TikTok', icon: 'heart', behavior: 'URL', position: 11 },
  { key: 'TIKTOK_COMMENT', label: 'Comment on a TikTok video', platform: 'TikTok', icon: 'message', behavior: 'URL', position: 12 },

  // Discord
  { key: 'DISCORD_JOIN', label: 'Join a Discord server', platform: 'Discord', icon: 'users', behavior: 'URL', position: 13 },
  { key: 'DISCORD_BOOST', label: 'Boost a Discord server', platform: 'Discord', icon: 'rocket', behavior: 'URL', position: 14 },

  // Spotify
  { key: 'SPOTIFY_TRACK', label: 'Listen to a Spotify track', platform: 'Spotify', icon: 'music', behavior: 'URL', position: 15 },

  // Website
  { key: 'VISIT', label: 'Visit a website', platform: null, icon: 'link', behavior: 'URL', position: 16 },
]
