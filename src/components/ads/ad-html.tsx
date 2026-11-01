'use client'

import { useEffect, useRef } from 'react'

/**
 * Renders admin-provided ad markup. Scripts inserted via innerHTML never
 * execute, so every `<script>` node is rebuilt as a real element — that is
 * what makes ad-network snippets work inside this container.
 */
export function AdHtml({ code, className }: { code: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || host.dataset.renderedCode === code) return
    host.dataset.renderedCode = code
    host.innerHTML = code

    host.querySelectorAll('script').forEach((stale) => {
      const script = document.createElement('script')
      Array.from(stale.attributes).forEach((attribute) =>
        script.setAttribute(attribute.name, attribute.value),
      )
      script.text = stale.textContent ?? ''
      stale.parentNode?.replaceChild(script, stale)
    })
  }, [code])

  return <div ref={hostRef} className={className} />
}
