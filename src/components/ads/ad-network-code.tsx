'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Injected code is admin-managed, not visitor input, and runs once per page
 * load. The module-level set keeps a remount (or Strict Mode's double effect)
 * from loading the same network script twice.
 */
const injected = new Set<string>()

function rebuildScript(stale: HTMLScriptElement): HTMLScriptElement {
  const script = document.createElement('script')
  Array.from(stale.attributes).forEach((attribute) =>
    script.setAttribute(attribute.name, attribute.value),
  )
  script.text = stale.textContent ?? ''
  return script
}

/**
 * Site-wide ad-network code (loaders, auto ads, verification tags) for any
 * network - AdSense, Ezoic, Monetag, Adsterra, a direct campaign snippet.
 * Snippets inserted as HTML never execute their scripts, so each node is moved
 * into `<head>` and every `<script>` is rebuilt as a real element. Network
 * code is kept off the admin and dashboard surfaces.
 */
export function AdNetworkCode({ code }: { code: string }) {
  const pathname = usePathname()
  const privateSurface = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

  useEffect(() => {
    if (!code || privateSurface || injected.has(code)) return
    injected.add(code)

    const template = document.createElement('template')
    template.innerHTML = code
    for (const node of Array.from(template.content.childNodes)) {
      if (node.nodeName === 'SCRIPT') {
        document.head.appendChild(rebuildScript(node as HTMLScriptElement))
      } else {
        document.head.appendChild(node)
      }
    }
  }, [code, privateSurface])

  return null
}
