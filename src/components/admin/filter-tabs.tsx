import Link from 'next/link'
import { getLocale } from 'next-intl/server'

import { cn } from 'cn'
import { formatNumber } from '@/lib/format'

export type FilterTab = {
  label: string
  href: string
  active: boolean
  count?: number
}

export async function FilterTabs({ items }: { items: FilterTab[] }) {
  const locale = await getLocale()
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            item.active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-semibold',
                item.active ? 'bg-black/15 text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {formatNumber(locale, item.count)}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
