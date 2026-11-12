'use client'

import { useEffect, useRef } from 'react'

/**
 * Renders admin-provided ad markup for any network. Scripts inserted via
 * innerHTML never execute, so every `<script>` node is rebuilt as a real
 * element — that is what makes ad-network snippets work inside this container.
 * A loader already present in the document (site-wide code or another unit)
 * is not loaded twice; inline snippets still run per unit.
 */
export function AdHtml({ code, className }: { code: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || host.dataset.renderedCode === code) return
    host.dataset.renderedCode = code
    host.innerHTML = code

    host.querySelectorAll('script').forEach((stale) => {
      const src = stale.getAttribute('src')
      if (src && Array.from(document.scripts).some((s) => s.getAttribute('src') === src)) {
        stale.remove()
        return
      }
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
