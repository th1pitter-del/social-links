// Turns saved article HTML into the public reading view: stable heading ids for
// the table of contents, plus the heading list itself. Runs on content that was
// already sanitized, so it only rearranges attributes it recognizes.

export type ArticleHeading = { id: string; text: string; level: 2 | 3 }

function headingSlug(text: string) {
  const base = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // Keep Unicode letters and digits so Arabic (and any non-Latin) headings
    // get meaningful ids instead of collapsing into "section-2", "section-3"…
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'section'
}

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function prepareArticle(html: string): { html: string; headings: ArticleHeading[] } {
  if (!html) return { html: '', headings: [] }

  const headings: ArticleHeading[] = []
  const used = new Set<string>()

  const output = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, rawLevel: string, attrs: string, inner: string) => {
      const text = plainText(inner)
      if (!text) return match
      const level = Number(rawLevel) as 2 | 3
      const base = headingSlug(text)
      let id = base
      let suffix = 2
      while (used.has(id)) {
        id = `${base}-${suffix}`
        suffix += 1
      }
      used.add(id)
      headings.push({ id, text, level })
      const cleanAttrs = attrs.replace(/\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`
    },
  )

  return { html: output, headings }
}
