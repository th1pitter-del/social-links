import type { ReactNode } from 'react'

import { cn } from 'cn'

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary/[0.07] via-muted/40 to-transparent px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function PanelContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('p-5', className)}>{children}</div>
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  )
}
