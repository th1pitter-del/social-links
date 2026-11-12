/**
 * Reads the channel, account, or site name straight out of an action's target
 * URL so the visitor sees who the step belongs to instead of only the platform.
 * Only public URL structure is used; nothing is fetched.
 */

const RESERVED: Record<string, Set<string>> = {
  instagram: new Set(['accounts', 'explore', 'p', 'reel', 'reels', 'stories', 'tv']),
  facebook: new Set(['events', 'groups', 'photo', 'reel', 'share', 'sharer', 'story', 'watch']),
  x: new Set(['home', 'explore', 'notifications', 'messages', 'i', 'intent', 'search', 'settings', 'share', 'hashtag']),
  twitch: new Set(['directory', 'videos', 'search', 'settings', 'p', 'downloads']),
  reddit: new Set(['user', 'u', 'submit', 'settings', 'message', 'premium']),
  soundcloud: new Set(['discover', 'stream', 'upload', 'search', 'you', 'charts', 'pages', 'stations']),
  pinterest: new Set(['pin', 'ideas', 'search', 'settings', 'resource']),
  kick: new Set(['directory', 'categories', 'search', 'settings', 'following']),
}

function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
}

function handle(segment: string | undefined): string | null {
  if (!segment) return null
  if (segment.startsWith('@')) return segment.slice(1) || null
  return segment
}

/** YouTube: /@name, /c/name, /user/name. Channel IDs and videos stay unnamed. */
function youtubeName(path: string): string | null {
  const parts = segments(path)
  const first = parts[0]
  if (!first) return null
  if (first.startsWith('@')) return handle(first)
  if ((first === 'c' || first === 'user') && parts[1]) return handle(parts[1])
  return null
}

function firstProfileName(platform: string, path: string): string | null {
  const [first] = segments(path)
  if (!first || RESERVED[platform]?.has(first.toLowerCase())) return null
  return handle(first)
}

/**
 * Returns the human name the target points at, or null when the URL does not
 * expose one (a bare video, an invite code, a track id). Visitors then keep the
 * platform wording rather than seeing an opaque identifier.
 */
export function targetDisplayName(platform: string | null, target: string | null): string | null {
  if (!target) return null
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname

  if (host === 'youtube.com' || host === 'm.youtube.com') return youtubeName(path)
  if (host === 'instagram.com') return firstProfileName('instagram', path)
  if (host === 'facebook.com' || host === 'm.facebook.com') return firstProfileName('facebook', path)
  if (host === 'tiktok.com') {
    const [first] = segments(path)
    return first?.startsWith('@') ? handle(first) : null
  }
  if (host === 'x.com' || host === 'twitter.com') return firstProfileName('x', path)
  if (host === 'twitch.tv' || host === 'm.twitch.tv') return firstProfileName('twitch', path)
  if (host === 'kick.com') return firstProfileName('kick', path)
  if (host === 'soundcloud.com') return firstProfileName('soundcloud', path)
  if (host === 'pinterest.com' || host.endsWith('.pinterest.com')) {
    return firstProfileName('pinterest', path)
  }
  if (host === 'reddit.com' || host === 'old.reddit.com') {
    const parts = segments(path)
    if (parts[0]?.toLowerCase() === 'r' && parts[1]) return `r/${parts[1]}`
    return firstProfileName('reddit', path)
  }
  if (host === 'github.com') {
    const parts = segments(path)
    if (!parts[0]) return null
    // A repository is named by both halves; a profile by its login alone.
    return parts[1] ? `${parts[0]}/${parts[1]}` : handle(parts[0])
  }
  if (host === 't.me' || host === 'telegram.me') {
    const [first] = segments(path)
    // Private invites carry no readable name, only a join hash.
    if (!first || first.startsWith('+') || first === 'joinchat') return null
    return handle(first)
  }
  if (host === 'bsky.app') {
    const parts = segments(path)
    return parts[0] === 'profile' && parts[1] ? handle(parts[1]) : null
  }
  if (host === 'steamcommunity.com') {
    const parts = segments(path)
    return (parts[0] === 'groups' || parts[0] === 'id') && parts[1] ? handle(parts[1]) : null
  }
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    const parts = segments(path)
    return (parts[0] === 'company' || parts[0] === 'in' || parts[0] === 'showcase') && parts[1]
      ? handle(parts[1])
      : null
  }
  if (host === 'snapchat.com') {
    const parts = segments(path)
    return parts[0] === 'add' && parts[1] ? handle(parts[1]) : null
  }
  if (host === 'threads.net' || host === 'threads.com') {
    const [first] = segments(path)
    return first?.startsWith('@') ? handle(first) : null
  }
  // Mastodon has no single host: the account is `@name@server`, and that whole
  // address is what a visitor recognises.
  if (platform === 'mastodon') {
    const account = segments(path)[0]
    if (account?.startsWith('@') && account.length > 1) {
      return `${account.slice(1)}@${host}`
    }
    return null
  }

  // A plain website step is the only case where the host itself is the name.
  if (platform === 'none') return host || null
  return null
}

/**
 * Puts the target's own name in the step label. The platform word is swapped
 * for it when the translated label names the platform; otherwise the name is
 * appended so the destination is still visible ("Visit a website · example.com").
 */
export function withTargetName(
  label: string,
  platformName: string | null,
  targetName: string | null,
): string {
  if (!targetName) return label
  if (platformName && label.includes(platformName)) {
    return label.split(platformName).join(targetName)
  }
  if (label.includes(targetName)) return label
  return `${label} · ${targetName}`
}
