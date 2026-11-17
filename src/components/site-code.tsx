'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Injected code is admin-managed, not visitor input, and runs once per page
 * load. The module-level set keeps a remount (or Strict Mode's double effect)
 * from injecting the same snippet twice, and keeps the header and footer
 * slots separate so the same snippet can be pasted in both.
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

function inject(code: string, target: 'head' | 'body') {
  // Snippets inserted as HTML never execute their scripts, so every node is
  // rebuilt as a real element in the chosen parent.
  const template = document.createElement('template')
  template.innerHTML = code
  const parent = target === 'head' ? document.head : document.body
  for (const node of Array.from(template.content.childNodes)) {
    if (node.nodeName === 'SCRIPT') {
      parent.appendChild(rebuildScript(node as HTMLScriptElement))
    } else {
      parent.appendChild(node)
    }
  }
}

/**
 * Site-wide custom code managed in the admin settings: every enabled header
 * snippet runs in the page head (analytics, ad-network loaders, verification
 * tags) and every footer snippet at the end of the page body (chat widgets,
 * conversion pixels), in their saved order. All of it is kept off the admin
 * and dashboard surfaces.
 */
export function SiteCode({
  headCodes,
  footerCodes,
}: {
  headCodes: string[]
  footerCodes: string[]
}) {
  const pathname = usePathname()
  const privateSurface = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

  useEffect(() => {
    if (privateSurface) return
    const slots = [
      { target: 'head' as const, codes: headCodes },
      { target: 'body' as const, codes: footerCodes },
    ]
    for (const { target, codes } of slots) {
      for (const raw of codes) {
        const code = raw.trim()
        if (!code) continue
        const key = `${target}:${code}`
        if (injected.has(key)) continue
        injected.add(key)
        inject(code, target)
      }
    }
  }, [headCodes, footerCodes, privateSurface])

  return null
}
