'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from 'cn'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Motion has to be opt-out proof: an autoplaying loop is JavaScript, so CSS alone
 * cannot stop it. Read through the media-query store, which means the first client
 * render already knows the answer instead of correcting it in an effect.
 */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    // The prerender assumes motion is allowed. Nothing that lands in the initial
    // HTML depends on the preference - loops only start after hydration, and they
    // read this store before scheduling anything.
    () => false,
  )
}

/**
 * Loops are gated on visibility: an off-screen simulation should not burn frames
 * or battery. Returns the in-view flag and the callback ref to attach.
 *
 * A callback ref from useState rather than useRef, because these rules forbid
 * reading a ref during render and the flag has to re-render anyway.
 */
export function useInView<T extends HTMLElement>(rootMargin = '-15% 0px -15% 0px') {
  const [node, setNode] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, rootMargin])

  return { setNode, inView }
}

/**
 * Fades and lifts children into place the first time they scroll into view.
 * The motion-reduce utilities override the hidden start state in CSS, so visitors
 * with reduced motion get the content immediately even before JavaScript runs.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  /** Milliseconds; used to stagger a row of siblings, never as decoration. */
  delay?: number
}) {
  const { setNode, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={setNode}
      className={cn(
        'transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
        inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        'motion-reduce:translate-y-0 motion-reduce:opacity-100',
        className,
      )}
      style={inView && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
