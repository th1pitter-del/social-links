'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ExternalLink, Link2 } from 'lucide-react'

import { BrandIcon } from '@/components/brand-icon'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

// Share destinations are brand names, so they stay the same in every locale.
const SHARE_TARGETS = [
  {
    key: 'x',
    label: 'X',
    href: (url: string, text: string) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    href: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    href: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'reddit',
    label: 'Reddit',
    href: (url: string, text: string) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
]

/**
 * Shown right after a guest link is published: the page itself stays put, and
 * the visitor leaves with the URL already on their clipboard.
 */
export function LinkCreatedDialog({
  open,
  onOpenChange,
  url,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
}) {
  const t = useTranslations('linkForm')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        if (!cancelled) setCopied(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, url])

  const shown = url.replace(/^https?:\/\//, '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex flex-col items-center px-6 pt-8 pb-5 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-success/30">
            <Check className="size-6" strokeWidth={2.5} />
          </span>
          <DialogTitle className="mt-4 text-lg font-semibold">{t('successTitle')}</DialogTitle>
          <DialogDescription className="mt-1">
            {copied ? t('shareCopied') : t('shareBody')}
          </DialogDescription>
        </div>

        <div className="px-6">
          <div className="flex items-center gap-2 rounded-xl border bg-background py-1 ps-3">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm hover:underline"
            >
              {shown}
            </a>
            <CopyButton value={url} />
          </div>
        </div>

        <div className="px-6 pt-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('shareTo')}
          </p>
          <div className="mt-3 flex items-start justify-between gap-1">
            {SHARE_TARGETS.map((target) => (
              <a
                key={target.key}
                href={target.href(url, title)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-card ring-1 ring-border transition-colors group-hover:bg-muted">
                  <BrandIcon platform={target.key} className="size-4" />
                </span>
                <span className="max-w-full truncate text-xs text-muted-foreground">
                  {target.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button variant="ghost" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {t('openLink')}
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
