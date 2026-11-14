import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Page links rather than a form: every archive is addressable and shareable. */
export function BlogPagination({
  page,
  pageCount,
  hrefFor,
  labels,
}: {
  page: number
  pageCount: number
  hrefFor: (page: number) => string
  labels: { previous: string; next: string; page: string }
}) {
  if (pageCount <= 1) return null

  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4))
  const windowEnd = Math.min(pageCount, windowStart + 4)
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i)

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label={labels.page}>
      {page > 1 ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefFor(page - 1)} rel="prev">
            <ChevronLeft className="rtl:rotate-180" />
            {labels.previous}
          </Link>
        </Button>
      ) : null}
      <ul className="flex items-center gap-1">
        {pages.map((item) => (
          <li key={item}>
            {item === page ? (
              <span
                aria-current="page"
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary px-2 text-sm font-semibold text-primary-foreground tabular-nums"
              >
                {item}
              </span>
            ) : (
              <Link
                href={hrefFor(item)}
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-sm text-muted-foreground tabular-nums transition-colors hover:bg-muted hover:text-foreground"
              >
                {item}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {page < pageCount ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefFor(page + 1)} rel="next">
            {labels.next}
            <ChevronRight className="rtl:rotate-180" />
          </Link>
        </Button>
      ) : null}
    </nav>
  )
}
