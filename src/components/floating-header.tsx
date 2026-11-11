'use client'

import { useEffect, useState } from 'react'

import { cn } from 'cn'

/**
 * Floating glass shell for the public header: a sticky rail with its own
 * margins, translucent blur, and a slightly stronger tint and shadow once the
 * page moves. Only colors and shadows change, so the height never shifts.
 *
 * Bio and unlock pages pass `transparent`: their own theme paints the page, so
 * the rail sits clear at rest. Once the page scrolls it takes the same glass
 * panel as every other page — a bare rail would let the content run underneath
 * the header unreadably.
 */
export function FloatingHeader({
  children,
  transparent = false,
}: {
  children: React.ReactNode
  transparent?: boolean
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      {/* The pill floats, so content passes through the gap above it. This fade
          only masks that 16px sliver once the page moves; it stays out of the
          pill itself so the glass still shows the page behind it. */}
      {transparent ? null : (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 -z-10 h-5 bg-gradient-to-b from-background via-background to-transparent transition-opacity duration-300 ease-out motion-reduce:transition-none',
            scrolled ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      <div
        className={cn(
          'mx-auto flex h-14 w-full max-w-[1200px] items-center rounded-2xl border px-3 sm:h-16 sm:px-4 transition-[background-color,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none',
          scrolled
            ? 'border-border/70 bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl backdrop-saturate-150 dark:shadow-black/30'
            : 'border-transparent bg-transparent shadow-none',
        )}
      >
        {children}
      </div>
    </header>
  )
}
