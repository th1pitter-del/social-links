'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { deleteMediaAsset } from '@/lib/actions/admin'

export function MediaRowActions({ mediaId }: { mediaId: string }) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = await deleteMediaAsset(mediaId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('mediaActions.deletedToast'))
      router.refresh()
    })
  }

  return (
    <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
      {t('mediaActions.delete')}
    </Button>
  )
}
