/** Public origin used in canonical URLs, sitemap entries and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

export function absoluteUrl(path = '/') {
  return new URL(path, `${SITE_URL}/`).toString()
}

/**
 * Content pages are authored in markdown. Structured data needs plain text, so
 * links keep their label and the syntax markers are dropped.
 */
export function markdownToText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
