import Link from 'next/link'
import { ArrowRight, CalendarDays, ChevronDown, Clock3, LifeBuoy } from 'lucide-react'
import { cn } from 'cn'

import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'

export type ContentPageKind = 'faq' | 'privacy' | 'terms'

/** The copy on these pages was last reviewed in this release. */
export const CONTENT_UPDATED_AT = new Date('2026-11-09T00:00:00Z')

type Section = {
  title: string | null
  body: string
  id: string
}

/**
 * The admin edits these pages as plain markdown. FAQ questions are `###`
 * headings; legal pages are split on `##` headings. Splitting here (instead of
 * styling one long column) is what lets the page show a contents rail and give
 * every section a stable anchor without asking the author for extra syntax.
 */
export function parseSections(content: string, kind: ContentPageKind): Section[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const marker = kind === 'faq' ? '### ' : '## '
  const parsed: { title: string | null; body: string }[] = []
  let current: { title: string | null; body: string } | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.startsWith(marker)) {
      if (current) parsed.push(current)
      current = { title: line.slice(marker.length).trim(), body: '' }
      continue
    }
    if (!current) {
      if (!line.trim()) continue
      current = { title: null, body: rawLine }
      continue
    }
    current.body += `${current.body ? '\n' : ''}${rawLine}`
  }
  if (current) parsed.push(current)

  const sections = parsed
    .map((section) => ({ ...section, body: section.body.trim() }))
    .filter((section) => section.title || section.body)
    .map((section, index) => ({ ...section, id: `section-${index + 1}` }))

  return sections.length > 0 ? sections : [{ title: null, body: content, id: 'section-1' }]
}

function readMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function TocList({
  sections,
  label,
  className,
}: {
  sections: Section[]
  label: string
  className?: string
}) {
  return (
    <ol className={cn('list-none space-y-1', className)}>
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex gap-3 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="w-5 shrink-0 text-end text-xs leading-6 tabular-nums text-muted-foreground/70">
              {index + 1}
            </span>
            <span className="min-w-0 leading-6">{section.title ?? label}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

export function ContentPage({
  kind,
  title,
  eyebrow,
  intro,
  content,
  tocLabel,
  readTimeLabel,
  updatedLabel,
  helpTitle,
  helpBody,
  helpCta,
  locale,
  contactHref = '/contact',
}: {
  kind: ContentPageKind
  title: string
  eyebrow: string
  intro: string
  content: string
  tocLabel: string
  readTimeLabel: string
  updatedLabel: string
  helpTitle: string
  helpBody: string
  helpCta: string
  locale: string
  contactHref?: string
}) {
  const sections = parseSections(content, kind)
  const toc = sections.filter((section) => section.title)
  const minutes = readMinutes(content)
  const updated = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(CONTENT_UPDATED_AT)
  const meta = [readTimeLabel, updatedLabel].map((text) =>
    text.replaceAll('%minutes%', String(minutes)).replaceAll('%date%', updated),
  )

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_0%,rgba(201,247,42,0.16),transparent)] dark:bg-[radial-gradient(60%_55%_at_50%_0%,rgba(213,255,47,0.10),transparent)]"
        />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            {eyebrow}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
            {intro}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-accent-text" aria-hidden />
              {meta[0]}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-accent-text" aria-hidden />
              {meta[1]}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <aside className="hidden lg:block">
          <nav aria-label={tocLabel} className="sticky top-24">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {tocLabel}
            </p>
            <div className="mt-4 border-s border-border ps-3">
              <TocList
                sections={toc}
                label={tocLabel}
                className="max-h-[calc(100vh-9rem)] overflow-y-auto"
              />
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          <details className="mb-8 rounded-2xl border bg-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {tocLabel}
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform [details[open]_&]:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t px-3 py-2">
              <TocList sections={toc} label={tocLabel} />
            </div>
          </details>

          {kind === 'faq' ? (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/20 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-4">
                      {section.title ? (
                        <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                          {section.title}
                        </h2>
                      ) : null}
                      <Markdown content={section.body} variant="article" />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 border-t border-border pt-10 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="text-sm font-semibold text-accent-text tabular-nums"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.title ? (
                      <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                        {section.title}
                      </h2>
                    ) : null}
                  </div>
                  <div className={cn('mt-5', section.title && 'sm:ps-11')}>
                    <Markdown content={section.body} variant="article" />
                  </div>
                </section>
              ))}
            </div>
          )}

          <section className="mt-14 overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <LifeBuoy className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{helpTitle}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{helpBody}</p>
                </div>
              </div>
              <Button size="lg" asChild className="shrink-0">
                <Link href={contactHref}>
                  {helpCta}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
