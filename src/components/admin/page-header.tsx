import type { ComponentType, ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string
  description?: string
  actions?: ReactNode
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:flex">
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <span
            aria-hidden
            className="mt-2 block h-1 w-12 rounded-full bg-primary"
          />
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
