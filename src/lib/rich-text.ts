import 'server-only'

import sanitizeHtml from 'sanitize-html'

/**
 * Strict allowlist for admin-authored rich text. Content is sanitized when it
 * is saved and again when it is rendered, so a stale or tampered row can never
 * inject scripts, event handlers or unsafe URL schemes.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
]

function safeImageSrc(src: string | undefined): boolean {
  if (!src) return false
  return /^https?:\/\//i.test(src) || /^\/api\/media\/[A-Za-z0-9_-]+$/.test(src)
}

function safeLinkHref(href: string | undefined): boolean {
  if (!href) return false
  if (/^(https?:\/\/|mailto:)/i.test(href)) return true
  return /^\/[A-Za-z0-9?#&=/_.-]*$/.test(href)
}

export function sanitizeRichText(input: string): string {
  if (!input) return ''
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan', 'style'],
      td: ['colspan', 'rowspan', 'style'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      blockquote: ['style'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        if (!safeLinkHref(attribs.href)) {
          return { tagName: 'span', attribs: {} }
        }
        const external = /^https?:\/\//i.test(attribs.href)
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(external
              ? { target: '_blank', rel: 'noopener noreferrer nofollow' }
              : { rel: 'noopener noreferrer' }),
          },
        }
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: safeImageSrc(attribs.src) ? { ...attribs, loading: 'lazy' } : {},
      }),
    },
    exclusiveFilter: (frame) =>
      (frame.tag === 'img' && !safeImageSrc(frame.attribs.src)) ||
      (frame.tag === 'a' && !safeLinkHref(frame.attribs.href)),
  })
}

/** True when the HTML carries no text and no embedded image. */
export function isRichTextEmpty(html: string): boolean {
  if (!html) return true
  const withoutTags = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return withoutTags.length === 0 && !/<img\b/i.test(html)
}
