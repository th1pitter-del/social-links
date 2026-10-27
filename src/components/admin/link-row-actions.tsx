'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { adminSetLinkStatus } from '@/lib/actions/admin'

export function AdminLinkRowActions({
  linkId,
  status,
}: {
  linkId: string
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED'
}) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    startTransition(async () => {
      const result = await adminSetLinkStatus(linkId, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === 'ACTIVE' ? t('linkActions.enabledToast') : t('linkActions.disabledToast'))
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
      {status === 'ACTIVE' ? t('common.disable') : t('common.enable')}
    </Button>
  )
}
