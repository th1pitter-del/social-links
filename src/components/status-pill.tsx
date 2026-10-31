import { cn } from 'cn'

/**
 * The status colours for the enums this app shows: a link's lifecycle, a
 * report's outcome, and an unlock session's progress. They used to live in
 * per-page maps that each drifted, so the same ACTIVE was lime in one table and
 * grey in another. One mapping, in the palette globals.css already defines. A
 * coloured dot never carries the meaning alone - the word always sits beside it.
 */
const tones: Record<string, string> = {
  ACTIVE: 'bg-success',
  DRAFT: 'bg-muted-foreground/50',
  DISABLED: 'bg-error',
  OPEN: 'bg-warning',
  RESOLVED: 'bg-success',
  DISMISSED: 'bg-muted-foreground/50',
  PENDING: 'bg-warning',
  VERIFIED: 'bg-success',
  BANNED: 'bg-error',
  // An expired session is inert rather than wrong, so it stays out of the
  // error colour that a banned or disabled row uses.
  EXPIRED: 'bg-muted-foreground/40',
}

export function statusTone(status: string) {
  return tones[status] ?? 'bg-muted-foreground/50'
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', statusTone(status))} />
      {label}
    </span>
  )
}
