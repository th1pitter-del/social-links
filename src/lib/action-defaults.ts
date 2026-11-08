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
  /**
   * Recommended wait, in seconds, between opening the action and being allowed
   * to mark it done. Links store their own value so a creator can change it.
   */
  waitSeconds: number
  position: number
}

/** Upper bound for a per-link wait override, shared by validation and the editor. */
export const MAX_ACTION_WAIT_SECONDS = 600

export function defaultWaitSeconds(key: string): number {
  return ACTION_OPTION_DEFAULTS.find((option) => option.key === key)?.waitSeconds ?? 0
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
// when seeding). Every step uses click-and-wait completion; `waitSeconds` is the
// recommended delay before it can be marked done, and no step claims the
// platform action itself was verified.
export const ACTION_OPTION_DEFAULTS: ActionOptionDefault[] = [
  // YouTube. These five steps use click-and-wait completion: the visitor opens
  // the target, the server starts a timer, and only after it ends can the step
  // be marked done. None of them claims the action itself was verified.
  { key: 'YOUTUBE_SUBSCRIBE', label: 'Subscribe on YouTube', platform: 'YouTube', icon: 'user_plus', behavior: 'URL', waitSeconds: 15, position: 0 },
  { key: 'YOUTUBE_LIKE', label: 'Like a YouTube video', platform: 'YouTube', icon: 'thumbs_up', behavior: 'URL', waitSeconds: 15, position: 1 },
  { key: 'YOUTUBE_COMMENT', label: 'Comment on a YouTube video', platform: 'YouTube', icon: 'message', behavior: 'URL', waitSeconds: 30, position: 2 },
  { key: 'YOUTUBE_SHARE', label: 'Share a YouTube video', platform: 'YouTube', icon: 'share', behavior: 'URL', waitSeconds: 10, position: 3 },
  { key: 'YOUTUBE_VIDEO', label: 'Watch a YouTube video', platform: 'YouTube', icon: 'video', behavior: 'URL', waitSeconds: 30, position: 4 },

  // Instagram
  { key: 'INSTAGRAM_LIKE', label: 'Like an Instagram post', platform: 'Instagram', icon: 'heart', behavior: 'URL', waitSeconds: 0, position: 5 },
  { key: 'INSTAGRAM_FOLLOW', label: 'Follow on Instagram', platform: 'Instagram', icon: 'user_plus', behavior: 'URL', waitSeconds: 0, position: 6 },
  { key: 'INSTAGRAM_COMMENT', label: 'Comment on an Instagram post', platform: 'Instagram', icon: 'message', behavior: 'URL', waitSeconds: 0, position: 7 },
  { key: 'INSTAGRAM_REEL', label: 'Watch an Instagram Reel', platform: 'Instagram', icon: 'play_circle', behavior: 'URL', waitSeconds: 0, position: 8 },

  // Facebook
  { key: 'FACEBOOK_FOLLOW', label: 'Follow on Facebook', platform: 'Facebook', icon: 'user_plus', behavior: 'URL', waitSeconds: 0, position: 9 },
  { key: 'FACEBOOK_LIKE', label: 'Like a Facebook post', platform: 'Facebook', icon: 'thumbs_up', behavior: 'URL', waitSeconds: 0, position: 10 },

  // TikTok
  { key: 'TIKTOK_FOLLOW', label: 'Follow on TikTok', platform: 'TikTok', icon: 'user_plus', behavior: 'URL', waitSeconds: 0, position: 11 },
  { key: 'TIKTOK_LIKE', label: 'Like a TikTok video', platform: 'TikTok', icon: 'heart', behavior: 'URL', waitSeconds: 0, position: 12 },
  { key: 'TIKTOK_COMMENT', label: 'Comment on a TikTok video', platform: 'TikTok', icon: 'message', behavior: 'URL', waitSeconds: 0, position: 13 },

  // Discord
  { key: 'DISCORD_JOIN', label: 'Join a Discord server', platform: 'Discord', icon: 'users', behavior: 'URL', waitSeconds: 0, position: 14 },
  { key: 'DISCORD_BOOST', label: 'Boost a Discord server', platform: 'Discord', icon: 'rocket', behavior: 'URL', waitSeconds: 0, position: 15 },

  // Spotify
  { key: 'SPOTIFY_TRACK', label: 'Listen to a Spotify track', platform: 'Spotify', icon: 'music', behavior: 'URL', waitSeconds: 0, position: 16 },

  // Website
  { key: 'VISIT', label: 'Visit a website', platform: null, icon: 'link', behavior: 'URL', waitSeconds: 0, position: 17 },
]
