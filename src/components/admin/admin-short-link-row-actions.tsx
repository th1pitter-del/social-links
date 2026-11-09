'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { adminDeleteShortLink, adminSetShortLinkStatus } from '@/lib/actions/admin'

export function AdminShortLinkRowActions({
  shortLinkId,
  status,
}: {
  shortLinkId: string
  status: 'ACTIVE' | 'DISABLED'
}) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    startTransition(async () => {
      const result = await adminSetShortLinkStatus(shortLinkId, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        next === 'ACTIVE' ? t('shortLinkActions.enabledToast') : t('shortLinkActions.disabledToast'),
      )
      router.refresh()
    })
  }

  function remove() {
    if (!window.confirm(t('shortLinkActions.deleteConfirm'))) return
    startTransition(async () => {
      const result = await adminDeleteShortLink(shortLinkId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('shortLinkActions.deletedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {status === 'ACTIVE' ? t('common.disable') : t('common.enable')}
      </Button>
      <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
        {t('shortLinkActions.delete')}
      </Button>
    </div>
  )
}
