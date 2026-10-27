'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteLink, setLinkStatus } from '@/lib/actions/links'

export function LinkRowActions({
  id,
  slug,
  status,
}: {
  id: string
  slug: string
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED'
}) {
  const t = useTranslations('dashboard.linkActions')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function toggleStatus() {
    const next = status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    startTransition(async () => {
      const result = await setLinkStatus(id, next)
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
    void deleteLink(id).then((result) => {
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
      <Button variant="ghost" size="icon-sm" asChild>
        <a href={`/u/${slug}`} target="_blank" rel="noopener noreferrer" aria-label={t('openPublicPage')}>
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
          <DropdownMenuItem onClick={() => router.push(`/dashboard/links/${id}`)}>
            {t('editLink')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={busy}>
            <Trash2 />
            {t('deleteLink')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
