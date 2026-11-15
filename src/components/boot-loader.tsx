'use client'

import { useEffect, useState } from 'react'

import { PulseLoader } from '@/components/pulse-loader'

/**
 * Holds the first paint behind the brand loader for one full rotation. The
 * fade-out is a CSS animation so the page is never left covered even if this
 * component never hydrates; the timer here only removes the finished node.
 */
export function BootLoader({ label }: { label: string }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 2400)
    return () => clearTimeout(timer)
  }, [])

  if (done) return null

  return (
    <div className="boot-loader fixed inset-0 z-[100] grid h-dvh w-full place-items-center overflow-hidden bg-background">
      <PulseLoader label={label} />
    </div>
  )
}
