import { Fragment, type ReactNode } from 'react'

/**
 * Minimal, dependency-free renderer for admin-authored page content.
 *
 * Supported syntax (kept intentionally small so nothing unsafe can be
 * expressed):
 *   ## Heading            -> h2
 *   ### Heading           -> h3
 *   - item                -> bullet list item
 *   blank line            -> paragraph break
 *   [label](url)          -> link
 *   **bold**              -> strong
 *
 * Output is built from React elements only; raw HTML is never injected.
 */

export type MarkdownVariant = 'default' | 'article'

function renderInline(text: string, keyPrefix: string, variant: MarkdownVariant): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let index = 0
  const article = variant === 'article'

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const key = `${keyPrefix}-inline-${index++}`
    if (match[1] && match[2]) {
      nodes.push(
        <a
          key={key}
          href={match[2]}
          className={
            article
              ? 'font-medium text-accent-text underline decoration-accent-text/40 underline-offset-4 transition-colors hover:decoration-accent-text'
              : 'font-medium text-foreground underline'
          }
        >
          {match[1]}
        </a>,
      )
    } else if (match[3]) {
      nodes.push(
        <strong
          key={key}
          className={article ? 'font-semibold text-foreground' : 'font-medium text-foreground'}
        >
          {match[3]}
        </strong>,
      )
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export function Markdown({
  content,
  variant = 'default',
}: {
  content: string
  variant?: MarkdownVariant
}) {
  const article = variant === 'article'
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ')
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(text, `p-${blocks.length}`, variant)}</p>,
    )
    paragraph = []
  }

  function flushList() {
    if (list.length === 0) return
    blocks.push(
      <ul
        key={`ul-${blocks.length}`}
        className={
          article
            ? 'list-disc space-y-2 pl-5 marker:text-accent-text'
            : 'list-inside list-disc space-y-1'
        }
      >
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`, variant)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2).trim())
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      blocks.push(
        article ? (
          <h3
            key={`h3-${blocks.length}`}
            className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            {renderInline(line.slice(4).trim(), `h3-${blocks.length}`, variant)}
          </h3>
        ) : (
          <h3 key={`h3-${blocks.length}`} className="font-medium text-foreground">
            {renderInline(line.slice(4).trim(), `h3-${blocks.length}`, variant)}
          </h3>
        ),
      )
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push(
        article ? (
          <h2
            key={`h2-${blocks.length}`}
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {renderInline(line.slice(3).trim(), `h2-${blocks.length}`, variant)}
          </h2>
        ) : (
          <h2 key={`h2-${blocks.length}`} className="font-medium text-foreground">
            {renderInline(line.slice(3).trim(), `h2-${blocks.length}`, variant)}
          </h2>
        ),
      )
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()

  return (
    <div
      className={
        article
          ? 'space-y-5 text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-8'
          : 'space-y-4 text-sm text-muted-foreground'
      }
    >
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  )
}
