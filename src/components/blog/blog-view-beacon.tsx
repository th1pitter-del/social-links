'use client'

import { useEffect } from 'react'

/**
 * Counts one read per article per browser per day, then lets the server's own
 * rate limit absorb anything the client guard misses. The counter is the real
 * viewCount the admin dashboard reports; nothing is rendered for the visitor.
 */
export function BlogViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `blog-viewed:${slug}`
    try {
      if (window.localStorage.getItem(key)) return
    } catch {
      // Private modes can refuse storage; the server-side limit still applies.
    }

    const payload = new Blob([JSON.stringify({ slug })], { type: 'application/json' })
    let delivered = false
    if (typeof navigator.sendBeacon === 'function') {
      delivered = navigator.sendBeacon('/api/blog/view', payload)
    }
    if (!delivered) {
      void fetch('/api/blog/view', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => null)
    }

    try {
      window.localStorage.setItem(key, '1')
    } catch {
      // Ignored: without storage the server limit is the only guard.
    }
  }, [slug])

  return null
}
