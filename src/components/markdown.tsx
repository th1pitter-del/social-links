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

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const key = `${keyPrefix}-inline-${index++}`
    if (match[1] && match[2]) {
      nodes.push(
        <a key={key} href={match[2]} className="font-medium text-foreground underline">
          {match[1]}
        </a>,
      )
    } else if (match[3]) {
      nodes.push(
        <strong key={key} className="font-medium text-foreground">
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

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ')
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(text, `p-${blocks.length}`)}</p>,
    )
    paragraph = []
  }

  function flushList() {
    if (list.length === 0) return
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-inside list-disc space-y-1">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
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
        <h3 key={`h3-${blocks.length}`} className="font-medium text-foreground">
          {renderInline(line.slice(4).trim(), `h3-${blocks.length}`)}
        </h3>,
      )
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="font-medium text-foreground">
          {renderInline(line.slice(3).trim(), `h2-${blocks.length}`)}
        </h2>,
      )
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()

  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  )
}
