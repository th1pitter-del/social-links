import type { CSSProperties } from 'react'

import { cn } from 'cn'

/**
 * The brand loading mark. It paints the theme's primary color by default and
 * any `text-*` class overrides that for surfaces where lime has nothing to sit
 * on. `label` renders as a status announcement; the dots themselves are
 * decorative.
 */
export function PulseLoader({
  size = 44.8,
  label,
  className,
}: {
  size?: number
  label?: string
  className?: string
}) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center justify-center">
      <span
        aria-hidden
        className={cn('pulse-loader text-primary', className)}
        style={{ '--loader-size': `${size}px` } as CSSProperties}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
