'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function BlogShare({ url, title }: { url: string; title: string }) {
  const t = useTranslations('blog.article')
  const [copied, setCopied] = useState(false)
  // navigator.share only exists in some browsers; deciding after mount keeps
  // the server and first client render identical (no hydration mismatch).
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function')
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(t('linkCopied'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url })
    } catch {
      // A dismissed share sheet is not an error worth reporting.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {t('share')}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Link2 />}
        {copied ? t('linkCopiedShort') : t('copyLink')}
      </Button>
      {canShare ? (
        <Button type="button" variant="outline" size="sm" onClick={share}>
          <Share2 />
          {t('shareNative')}
        </Button>
      ) : null}
    </div>
  )
}
