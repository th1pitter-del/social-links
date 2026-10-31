import Link from 'next/link'

import { Button } from '@/components/ui/button'

/**
 * The empty state of a filtered admin list. "No links match this view." is only
 * true when a view is applied, and a moderator who has just typed a search needs
 * the way back to the unfiltered list next to the message, not in the sidebar.
 */
export function NoResults({
  message,
  clearLabel,
  clearHref,
  filtered,
}: {
  message: string
  clearLabel: string
  clearHref: string
  filtered: boolean,
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {filtered ? (
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href={clearHref}>{clearLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
