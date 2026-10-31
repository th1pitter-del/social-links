'use client'

import { useLocale } from 'next-intl'
import { cn } from 'cn'

const formatters = new Map<string, Intl.DateTimeFormat>()

function getFormatter(locale: string, withTime: boolean) {
  const key = `${locale}:${withTime}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
    })
    formatters.set(key, formatter)
  }
  return formatter
}

/**
 * A timestamp the reader can actually read. The admin panels printed
 * `toISOString().replace('T', ' ')`, which is UTC, machine-formatted and
 * unreadable next to every other date in the app. Formatting in the browser
 * rather than on the server is what makes the time correct: the request runs in
 * one zone, the person reading it in another. The text therefore differs between
 * the server render and the first client render, which is the one case
 * `suppressHydrationWarning` exists for.
 */
export function Timestamp({
  value,
  withTime = true,
  className,
}: {
  value: Date
  withTime?: boolean
  className?: string
}) {
  const locale = useLocale()
  return (
    <time
      dateTime={value.toISOString()}
      suppressHydrationWarning
      className={cn('tabular-nums', className)}
    >
      {getFormatter(locale, withTime).format(value)}
    </time>
  )
}
