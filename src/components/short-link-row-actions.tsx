'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Copy, Eye, EyeOff, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteShortLink, setShortLinkStatus } from '@/lib/actions/short-links'

export function ShortLinkRowActions({
  id,
  code,
  status,
}: {
  id: string
  code: string
  status: 'ACTIVE' | 'DISABLED'
}) {
  const t = useTranslations('dashboard.shortLinkActions')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${code}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  }

  function toggleStatus() {
    const next = status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    startTransition(async () => {
      const result = await setShortLinkStatus(id, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === 'ACTIVE' ? t('activatedToast') : t('disabledToast'))
      router.refresh()
    })
  }

  function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) {
      return
    }
    setBusy(true)
    void deleteShortLink(id).then((result) => {
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('deletedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        aria-label={copied ? t('copied') : t('copyLink')}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <Button variant="ghost" size="icon-sm" asChild>
        <a
          href={`/s/${code}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('openLink')}
        >
          <ExternalLink />
        </a>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleStatus}
        disabled={pending || busy}
        aria-label={status === 'ACTIVE' ? t('disableLink') : t('activateLink')}
      >
        {status === 'ACTIVE' ? <EyeOff /> : <Eye />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('moreActions')}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={busy}>
            <Trash2 />
            {t('deleteLink')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
