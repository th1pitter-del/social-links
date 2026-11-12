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
  'x',
  'twitch',
  'discord',
  'telegram',
  'github',
  'reddit',
  'bluesky',
  'mastodon',
  'steam',
  'spotify',
  'soundcloud',
  'linkedin',
  'snapchat',
  'threads',
  'kick',
  'pinterest',
  'whatsapp',
  'none',
] as const

// Built-in action types shipped with the app, in the order they are shown.
// `platform` is the human-readable platform label (matched to Platform.label
// when seeding). Most steps complete when the visitor opens them; the ones a
// platform can actually answer for are checked instead (see lib/verification).
export const ACTION_OPTION_DEFAULTS: ActionOptionDefault[] = [
  // YouTube. A comment is read from the video's public comments, and a like or
  // a subscription from the visitor's own Google account. Watching and sharing
  // leave no per-person record, so those complete when they are opened.
  { key: 'YOUTUBE_SUBSCRIBE', label: 'Subscribe on YouTube', platform: 'YouTube', icon: 'user_plus', behavior: 'URL', position: 0 },
  { key: 'YOUTUBE_LIKE', label: 'Like a YouTube video', platform: 'YouTube', icon: 'thumbs_up', behavior: 'URL', position: 1 },
  { key: 'YOUTUBE_COMMENT', label: 'Comment on a YouTube video', platform: 'YouTube', icon: 'message', behavior: 'URL', position: 2 },
  { key: 'YOUTUBE_SHARE', label: 'Share a YouTube video', platform: 'YouTube', icon: 'share', behavior: 'URL', position: 3 },
  { key: 'YOUTUBE_VIDEO', label: 'Watch a YouTube video', platform: 'YouTube', icon: 'video', behavior: 'URL', position: 4 },

  // Instagram
  { key: 'INSTAGRAM_LIKE', label: 'Like an Instagram post', platform: 'Instagram', icon: 'heart', behavior: 'URL', position: 5 },
  { key: 'INSTAGRAM_FOLLOW', label: 'Follow on Instagram', platform: 'Instagram', icon: 'user_plus', behavior: 'URL', position: 6 },
  { key: 'INSTAGRAM_COMMENT', label: 'Comment on an Instagram post', platform: 'Instagram', icon: 'message', behavior: 'URL', position: 7 },
  { key: 'INSTAGRAM_REEL', label: 'Watch an Instagram Reel', platform: 'Instagram', icon: 'play_circle', behavior: 'URL', position: 8 },

  // Facebook
  { key: 'FACEBOOK_FOLLOW', label: 'Follow on Facebook', platform: 'Facebook', icon: 'user_plus', behavior: 'URL', position: 9 },
  { key: 'FACEBOOK_LIKE', label: 'Like a Facebook post', platform: 'Facebook', icon: 'thumbs_up', behavior: 'URL', position: 10 },

  // TikTok
  { key: 'TIKTOK_FOLLOW', label: 'Follow on TikTok', platform: 'TikTok', icon: 'user_plus', behavior: 'URL', position: 11 },
  { key: 'TIKTOK_LIKE', label: 'Like a TikTok video', platform: 'TikTok', icon: 'heart', behavior: 'URL', position: 12 },
  { key: 'TIKTOK_COMMENT', label: 'Comment on a TikTok video', platform: 'TikTok', icon: 'message', behavior: 'URL', position: 13 },

  // X
  { key: 'X_FOLLOW', label: 'Follow on X', platform: 'X', icon: 'user_plus', behavior: 'URL', position: 14 },
  { key: 'X_LIKE', label: 'Like a post on X', platform: 'X', icon: 'heart', behavior: 'URL', position: 15 },
  { key: 'X_REPOST', label: 'Repost on X', platform: 'X', icon: 'repeat', behavior: 'URL', position: 16 },

  // Twitch
  { key: 'TWITCH_FOLLOW', label: 'Follow on Twitch', platform: 'Twitch', icon: 'user_plus', behavior: 'URL', position: 17 },
  { key: 'TWITCH_WATCH', label: 'Watch a Twitch stream', platform: 'Twitch', icon: 'tv', behavior: 'URL', position: 18 },

  // Discord
  { key: 'DISCORD_JOIN', label: 'Join a Discord server', platform: 'Discord', icon: 'users', behavior: 'URL', position: 19 },
  { key: 'DISCORD_BOOST', label: 'Boost a Discord server', platform: 'Discord', icon: 'rocket', behavior: 'URL', position: 20 },

  // Telegram
  { key: 'TELEGRAM_CHANNEL', label: 'Join a Telegram channel', platform: 'Telegram', icon: 'megaphone', behavior: 'URL', position: 21 },
  { key: 'TELEGRAM_GROUP', label: 'Join a Telegram group', platform: 'Telegram', icon: 'users', behavior: 'URL', position: 22 },

  // GitHub
  { key: 'GITHUB_FOLLOW', label: 'Follow on GitHub', platform: 'GitHub', icon: 'user_plus', behavior: 'URL', position: 23 },
  { key: 'GITHUB_STAR', label: 'Star a GitHub repository', platform: 'GitHub', icon: 'star', behavior: 'URL', position: 24 },

  // Reddit
  { key: 'REDDIT_JOIN', label: 'Join a subreddit', platform: 'Reddit', icon: 'users', behavior: 'URL', position: 25 },
  { key: 'REDDIT_UPVOTE', label: 'Upvote a Reddit post', platform: 'Reddit', icon: 'arrow_up', behavior: 'URL', position: 26 },

  // Bluesky
  { key: 'BLUESKY_FOLLOW', label: 'Follow on Bluesky', platform: 'Bluesky', icon: 'user_plus', behavior: 'URL', position: 27 },

  // Mastodon
  { key: 'MASTODON_FOLLOW', label: 'Follow on Mastodon', platform: 'Mastodon', icon: 'user_plus', behavior: 'URL', position: 28 },

  // Steam
  { key: 'STEAM_GROUP', label: 'Join a Steam group', platform: 'Steam', icon: 'gamepad', behavior: 'URL', position: 29 },

  // Spotify
  { key: 'SPOTIFY_TRACK', label: 'Listen to a Spotify track', platform: 'Spotify', icon: 'music', behavior: 'URL', position: 30 },

  // SoundCloud
  { key: 'SOUNDCLOUD_FOLLOW', label: 'Follow on SoundCloud', platform: 'SoundCloud', icon: 'user_plus', behavior: 'URL', position: 31 },
  { key: 'SOUNDCLOUD_LISTEN', label: 'Listen to a SoundCloud track', platform: 'SoundCloud', icon: 'music', behavior: 'URL', position: 32 },

  // LinkedIn
  { key: 'LINKEDIN_FOLLOW', label: 'Follow on LinkedIn', platform: 'LinkedIn', icon: 'user_plus', behavior: 'URL', position: 33 },

  // Snapchat
  { key: 'SNAPCHAT_ADD', label: 'Add on Snapchat', platform: 'Snapchat', icon: 'user_plus', behavior: 'URL', position: 34 },

  // Threads
  { key: 'THREADS_FOLLOW', label: 'Follow on Threads', platform: 'Threads', icon: 'user_plus', behavior: 'URL', position: 35 },

  // Kick
  { key: 'KICK_FOLLOW', label: 'Follow on Kick', platform: 'Kick', icon: 'user_plus', behavior: 'URL', position: 36 },

  // Pinterest
  { key: 'PINTEREST_FOLLOW', label: 'Follow on Pinterest', platform: 'Pinterest', icon: 'user_plus', behavior: 'URL', position: 37 },

  // WhatsApp
  { key: 'WHATSAPP_CHANNEL', label: 'Follow a WhatsApp channel', platform: 'WhatsApp', icon: 'megaphone', behavior: 'URL', position: 38 },

  // Website
  { key: 'VISIT', label: 'Visit a website', platform: null, icon: 'link', behavior: 'URL', position: 39 },
  // The optional email step: no destination, it asks the visitor for an address
  // and a consent tick, and stores them as an EmailLead for the link owner.
  { key: 'EMAIL', label: 'Collect email address', platform: null, icon: 'mail', behavior: 'EMAIL', position: 40 },
]
