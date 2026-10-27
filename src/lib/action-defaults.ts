export type ActionBehavior = 'URL' | 'EMAIL'

/** Client-safe shape of an action option (no server-only fields). */
export type ActionOptionView = {
  key: string
  label: string
  platform: string | null
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

// Built-in action types shipped with the app. `platform` is the human-readable
// platform label (matched to Platform.label when seeding). Keys for the original
// actions match the legacy `ActionType` enum values so existing links keep
// working unchanged; every other key is prefixed with its platform.
export const ACTION_OPTION_DEFAULTS: ActionOptionDefault[] = [
  { key: 'VISIT', label: 'Visit a link', platform: null, icon: 'link', behavior: 'URL', position: 0 },

  // YouTube
  { key: 'YOUTUBE_SUBSCRIBE', label: 'Subscribe on YouTube', platform: 'YouTube', icon: 'user_plus', behavior: 'URL', position: 1 },
  { key: 'YOUTUBE_VIDEO', label: 'Watch a YouTube video', platform: 'YouTube', icon: 'video', behavior: 'URL', position: 2 },
  { key: 'YOUTUBE_LIKE', label: 'Like a YouTube video', platform: 'YouTube', icon: 'thumbs_up', behavior: 'URL', position: 3 },
  { key: 'YOUTUBE_COMMENT', label: 'Comment on a YouTube video', platform: 'YouTube', icon: 'message', behavior: 'URL', position: 4 },
  { key: 'YOUTUBE_SHARE', label: 'Share a YouTube video', platform: 'YouTube', icon: 'share', behavior: 'URL', position: 5 },
  { key: 'YOUTUBE_SHORTS', label: 'Watch a YouTube Short', platform: 'YouTube', icon: 'play_circle', behavior: 'URL', position: 6 },
  { key: 'YOUTUBE_MEMBERSHIP', label: 'Join a YouTube membership', platform: 'YouTube', icon: 'crown', behavior: 'URL', position: 7 },

  // TikTok
  { key: 'TIKTOK_FOLLOW', label: 'Follow on TikTok', platform: 'TikTok', icon: 'user_plus', behavior: 'URL', position: 8 },
  { key: 'TIKTOK_LIKE', label: 'Like a TikTok video', platform: 'TikTok', icon: 'heart', behavior: 'URL', position: 9 },
  { key: 'TIKTOK_VIDEO', label: 'Watch a TikTok video', platform: 'TikTok', icon: 'video', behavior: 'URL', position: 10 },
  { key: 'TIKTOK_COMMENT', label: 'Comment on a TikTok video', platform: 'TikTok', icon: 'message', behavior: 'URL', position: 11 },
  { key: 'TIKTOK_SHARE', label: 'Share a TikTok video', platform: 'TikTok', icon: 'share', behavior: 'URL', position: 12 },

  // Instagram
  { key: 'INSTAGRAM_FOLLOW', label: 'Follow on Instagram', platform: 'Instagram', icon: 'user_plus', behavior: 'URL', position: 13 },
  { key: 'INSTAGRAM_LIKE', label: 'Like an Instagram post', platform: 'Instagram', icon: 'heart', behavior: 'URL', position: 14 },
  { key: 'INSTAGRAM_POST', label: 'View an Instagram post', platform: 'Instagram', icon: 'camera', behavior: 'URL', position: 15 },
  { key: 'INSTAGRAM_REEL', label: 'Watch an Instagram Reel', platform: 'Instagram', icon: 'play_circle', behavior: 'URL', position: 16 },
  { key: 'INSTAGRAM_STORY', label: 'View an Instagram story', platform: 'Instagram', icon: 'camera', behavior: 'URL', position: 17 },
  { key: 'INSTAGRAM_COMMENT', label: 'Comment on an Instagram post', platform: 'Instagram', icon: 'message', behavior: 'URL', position: 18 },

  // Facebook
  { key: 'FACEBOOK_LIKE', label: 'Like a Facebook page', platform: 'Facebook', icon: 'thumbs_up', behavior: 'URL', position: 19 },
  { key: 'FACEBOOK_FOLLOW', label: 'Follow on Facebook', platform: 'Facebook', icon: 'user_plus', behavior: 'URL', position: 20 },
  { key: 'FACEBOOK_POST', label: 'View a Facebook post', platform: 'Facebook', icon: 'newspaper', behavior: 'URL', position: 21 },
  { key: 'FACEBOOK_SHARE', label: 'Share a Facebook post', platform: 'Facebook', icon: 'share', behavior: 'URL', position: 22 },
  { key: 'FACEBOOK_GROUP', label: 'Join a Facebook group', platform: 'Facebook', icon: 'users', behavior: 'URL', position: 23 },

  // X (Twitter)
  { key: 'X_FOLLOW', label: 'Follow on X', platform: 'X', icon: 'user_plus', behavior: 'URL', position: 24 },
  { key: 'X_LIKE', label: 'Like a post on X', platform: 'X', icon: 'heart', behavior: 'URL', position: 25 },
  { key: 'X_REPOST', label: 'Repost on X', platform: 'X', icon: 'share', behavior: 'URL', position: 26 },
  { key: 'X_POST', label: 'View a post on X', platform: 'X', icon: 'newspaper', behavior: 'URL', position: 27 },
  { key: 'X_COMMENT', label: 'Reply to a post on X', platform: 'X', icon: 'message', behavior: 'URL', position: 28 },
  { key: 'X_BOOKMARK', label: 'Bookmark a post on X', platform: 'X', icon: 'bookmark', behavior: 'URL', position: 29 },

  // Threads
  { key: 'THREADS_FOLLOW', label: 'Follow on Threads', platform: 'Threads', icon: 'user_plus', behavior: 'URL', position: 30 },
  { key: 'THREADS_LIKE', label: 'Like a Threads post', platform: 'Threads', icon: 'heart', behavior: 'URL', position: 31 },
  { key: 'THREADS_POST', label: 'View a Threads post', platform: 'Threads', icon: 'newspaper', behavior: 'URL', position: 32 },

  // Discord
  { key: 'DISCORD_JOIN', label: 'Join a Discord server', platform: 'Discord', icon: 'users', behavior: 'URL', position: 33 },
  { key: 'DISCORD_BOOST', label: 'Boost a Discord server', platform: 'Discord', icon: 'rocket', behavior: 'URL', position: 34 },

  // Twitch
  { key: 'TWITCH_FOLLOW', label: 'Follow on Twitch', platform: 'Twitch', icon: 'user_plus', behavior: 'URL', position: 35 },
  { key: 'TWITCH_SUBSCRIBE', label: 'Subscribe on Twitch', platform: 'Twitch', icon: 'crown', behavior: 'URL', position: 36 },
  { key: 'TWITCH_WATCH', label: 'Watch a Twitch stream', platform: 'Twitch', icon: 'tv', behavior: 'URL', position: 37 },

  // Kick
  { key: 'KICK_FOLLOW', label: 'Follow on Kick', platform: 'Kick', icon: 'user_plus', behavior: 'URL', position: 38 },
  { key: 'KICK_SUBSCRIBE', label: 'Subscribe on Kick', platform: 'Kick', icon: 'crown', behavior: 'URL', position: 39 },
  { key: 'KICK_WATCH', label: 'Watch a Kick stream', platform: 'Kick', icon: 'play_circle', behavior: 'URL', position: 40 },

  // Reddit
  { key: 'REDDIT_JOIN', label: 'Join a subreddit', platform: 'Reddit', icon: 'users', behavior: 'URL', position: 41 },
  { key: 'REDDIT_UPVOTE', label: 'Upvote a Reddit post', platform: 'Reddit', icon: 'thumbs_up', behavior: 'URL', position: 42 },
  { key: 'REDDIT_POST', label: 'View a Reddit post', platform: 'Reddit', icon: 'newspaper', behavior: 'URL', position: 43 },
  { key: 'REDDIT_COMMENT', label: 'Comment on a Reddit post', platform: 'Reddit', icon: 'message', behavior: 'URL', position: 44 },

  // Telegram
  { key: 'TELEGRAM_CHANNEL', label: 'Join a Telegram channel', platform: 'Telegram', icon: 'users', behavior: 'URL', position: 45 },
  { key: 'TELEGRAM_GROUP', label: 'Join a Telegram group', platform: 'Telegram', icon: 'message', behavior: 'URL', position: 46 },
  { key: 'TELEGRAM_BOT', label: 'Start a Telegram bot', platform: 'Telegram', icon: 'send', behavior: 'URL', position: 47 },

  // WhatsApp
  { key: 'WHATSAPP_GROUP', label: 'Join a WhatsApp group', platform: 'WhatsApp', icon: 'users', behavior: 'URL', position: 48 },
  { key: 'WHATSAPP_CHANNEL', label: 'Follow a WhatsApp channel', platform: 'WhatsApp', icon: 'message', behavior: 'URL', position: 49 },
  { key: 'WHATSAPP_MESSAGE', label: 'Message on WhatsApp', platform: 'WhatsApp', icon: 'send', behavior: 'URL', position: 50 },

  // Snapchat
  { key: 'SNAPCHAT_ADD', label: 'Add on Snapchat', platform: 'Snapchat', icon: 'user_plus', behavior: 'URL', position: 51 },
  { key: 'SNAPCHAT_SUBSCRIBE', label: 'Subscribe on Snapchat', platform: 'Snapchat', icon: 'bell', behavior: 'URL', position: 52 },

  // LinkedIn
  { key: 'LINKEDIN_FOLLOW', label: 'Follow on LinkedIn', platform: 'LinkedIn', icon: 'user_plus', behavior: 'URL', position: 53 },
  { key: 'LINKEDIN_CONNECT', label: 'Connect on LinkedIn', platform: 'LinkedIn', icon: 'users', behavior: 'URL', position: 54 },
  { key: 'LINKEDIN_POST', label: 'View a LinkedIn post', platform: 'LinkedIn', icon: 'newspaper', behavior: 'URL', position: 55 },

  // Pinterest
  { key: 'PINTEREST_FOLLOW', label: 'Follow on Pinterest', platform: 'Pinterest', icon: 'user_plus', behavior: 'URL', position: 56 },
  { key: 'PINTEREST_SAVE', label: 'Save a Pinterest pin', platform: 'Pinterest', icon: 'bookmark', behavior: 'URL', position: 57 },

  // Spotify
  { key: 'SPOTIFY_FOLLOW', label: 'Follow on Spotify', platform: 'Spotify', icon: 'user_plus', behavior: 'URL', position: 58 },
  { key: 'SPOTIFY_PLAYLIST', label: 'Save a Spotify playlist', platform: 'Spotify', icon: 'bookmark', behavior: 'URL', position: 59 },
  { key: 'SPOTIFY_TRACK', label: 'Listen to a Spotify track', platform: 'Spotify', icon: 'music', behavior: 'URL', position: 60 },
  { key: 'SPOTIFY_PODCAST', label: 'Listen to a Spotify podcast', platform: 'Spotify', icon: 'podcast', behavior: 'URL', position: 61 },

  // SoundCloud
  { key: 'SOUNDCLOUD_FOLLOW', label: 'Follow on SoundCloud', platform: 'SoundCloud', icon: 'user_plus', behavior: 'URL', position: 62 },
  { key: 'SOUNDCLOUD_LIKE', label: 'Like a SoundCloud track', platform: 'SoundCloud', icon: 'heart', behavior: 'URL', position: 63 },
  { key: 'SOUNDCLOUD_LISTEN', label: 'Listen to a SoundCloud track', platform: 'SoundCloud', icon: 'music', behavior: 'URL', position: 64 },

  // GitHub
  { key: 'GITHUB_FOLLOW', label: 'Follow on GitHub', platform: 'GitHub', icon: 'user_plus', behavior: 'URL', position: 65 },
  { key: 'GITHUB_STAR', label: 'Star a GitHub repository', platform: 'GitHub', icon: 'star', behavior: 'URL', position: 66 },
  { key: 'GITHUB_SPONSOR', label: 'Sponsor on GitHub', platform: 'GitHub', icon: 'heart', behavior: 'URL', position: 67 },

  // Medium
  { key: 'MEDIUM_FOLLOW', label: 'Follow on Medium', platform: 'Medium', icon: 'user_plus', behavior: 'URL', position: 68 },
  { key: 'MEDIUM_CLAP', label: 'Clap for a Medium story', platform: 'Medium', icon: 'thumbs_up', behavior: 'URL', position: 69 },
  { key: 'MEDIUM_STORY', label: 'Read a Medium story', platform: 'Medium', icon: 'newspaper', behavior: 'URL', position: 70 },

  // Tumblr
  { key: 'TUMBLR_FOLLOW', label: 'Follow on Tumblr', platform: 'Tumblr', icon: 'user_plus', behavior: 'URL', position: 71 },
  { key: 'TUMBLR_LIKE', label: 'Like a Tumblr post', platform: 'Tumblr', icon: 'heart', behavior: 'URL', position: 72 },
  { key: 'TUMBLR_REBLOG', label: 'Reblog on Tumblr', platform: 'Tumblr', icon: 'share', behavior: 'URL', position: 73 },

  // Vimeo
  { key: 'VIMEO_FOLLOW', label: 'Follow on Vimeo', platform: 'Vimeo', icon: 'user_plus', behavior: 'URL', position: 74 },
  { key: 'VIMEO_LIKE', label: 'Like a Vimeo video', platform: 'Vimeo', icon: 'thumbs_up', behavior: 'URL', position: 75 },
  { key: 'VIMEO_WATCH', label: 'Watch a Vimeo video', platform: 'Vimeo', icon: 'video', behavior: 'URL', position: 76 },

  // Patreon
  { key: 'PATREON_FOLLOW', label: 'Follow on Patreon', platform: 'Patreon', icon: 'user_plus', behavior: 'URL', position: 77 },
  { key: 'PATREON_JOIN', label: 'Join a Patreon tier', platform: 'Patreon', icon: 'crown', behavior: 'URL', position: 78 },

  // Ko-fi
  { key: 'KOFI_FOLLOW', label: 'Follow on Ko-fi', platform: 'Ko-fi', icon: 'user_plus', behavior: 'URL', position: 79 },
  { key: 'KOFI_SUPPORT', label: 'Support on Ko-fi', platform: 'Ko-fi', icon: 'gift', behavior: 'URL', position: 80 },

  // Steam
  { key: 'STEAM_FOLLOW', label: 'Follow on Steam', platform: 'Steam', icon: 'user_plus', behavior: 'URL', position: 81 },
  { key: 'STEAM_GROUP', label: 'Join a Steam group', platform: 'Steam', icon: 'users', behavior: 'URL', position: 82 },
  { key: 'STEAM_WISHLIST', label: 'Wishlist a game on Steam', platform: 'Steam', icon: 'shopping', behavior: 'URL', position: 83 },

  // Etsy
  { key: 'ETSY_FOLLOW', label: 'Follow a shop on Etsy', platform: 'Etsy', icon: 'user_plus', behavior: 'URL', position: 84 },
  { key: 'ETSY_FAVORITE', label: 'Favorite an Etsy item', platform: 'Etsy', icon: 'heart', behavior: 'URL', position: 85 },

  // Substack
  { key: 'SUBSTACK_SUBSCRIBE', label: 'Subscribe to a Substack', platform: 'Substack', icon: 'mail', behavior: 'URL', position: 86 },
  { key: 'SUBSTACK_READ', label: 'Read a Substack post', platform: 'Substack', icon: 'newspaper', behavior: 'URL', position: 87 },

  // Mastodon
  { key: 'MASTODON_FOLLOW', label: 'Follow on Mastodon', platform: 'Mastodon', icon: 'user_plus', behavior: 'URL', position: 88 },
  { key: 'MASTODON_BOOST', label: 'Boost on Mastodon', platform: 'Mastodon', icon: 'share', behavior: 'URL', position: 89 },

  // Bluesky
  { key: 'BLUESKY_FOLLOW', label: 'Follow on Bluesky', platform: 'Bluesky', icon: 'user_plus', behavior: 'URL', position: 90 },
  { key: 'BLUESKY_LIKE', label: 'Like a Bluesky post', platform: 'Bluesky', icon: 'heart', behavior: 'URL', position: 91 },
  { key: 'BLUESKY_REPOST', label: 'Repost on Bluesky', platform: 'Bluesky', icon: 'share', behavior: 'URL', position: 92 },

  // VK
  { key: 'VK_FOLLOW', label: 'Follow on VK', platform: 'VK', icon: 'user_plus', behavior: 'URL', position: 93 },
  { key: 'VK_JOIN', label: 'Join a VK community', platform: 'VK', icon: 'users', behavior: 'URL', position: 94 },

  // Quora
  { key: 'QUORA_FOLLOW', label: 'Follow on Quora', platform: 'Quora', icon: 'user_plus', behavior: 'URL', position: 95 },
  { key: 'QUORA_ANSWER', label: 'View a Quora answer', platform: 'Quora', icon: 'newspaper', behavior: 'URL', position: 96 },

  // Generic (platform-agnostic)
  { key: 'FOLLOW', label: 'Follow an account', platform: null, icon: 'user_plus', behavior: 'URL', position: 97 },
  { key: 'MUSIC', label: 'Listen to music', platform: null, icon: 'music', behavior: 'URL', position: 98 },
  { key: 'VIDEO', label: 'Watch a video', platform: null, icon: 'video', behavior: 'URL', position: 99 },
  { key: 'EMAIL', label: 'Collect email address', platform: null, icon: 'mail', behavior: 'EMAIL', position: 100 },
]
