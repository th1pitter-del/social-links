'use client'

import { useEffect, useState } from 'react'

import { useInView, useReducedMotion } from '@/components/motion/reveal'

/**
 * Shared behaviour for the homepage showcases: one panel advances on its own,
 * stops while the visitor is reading or steering it, stops off-screen, and with
 * reduced motion only moves when the visitor picks a panel by hand.
 */
export function useRotator(count: number, intervalMs: number) {
  const reducedMotion = useReducedMotion()
  const { setNode, inView } = useInView<HTMLDivElement>()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const active = count === 0 ? 0 : Math.min(index, count - 1)

  useEffect(() => {
    if (paused || reducedMotion || !inView || count < 2) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), intervalMs)
    return () => window.clearInterval(timer)
  }, [paused, reducedMotion, inView, count, intervalMs])

  return {
    active,
    goTo: setIndex,
    setNode,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    reducedMotion,
  }
}
