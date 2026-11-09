'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { adminDeleteBio, adminSetBioPublished } from '@/lib/actions/admin'

export function AdminBioRowActions({
  profileId,
  handle,
  published,
}: {
  profileId: string
  handle: string
  published: boolean
}) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const result = await adminSetBioPublished(profileId, !published)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        published ? t('bioActions.unpublishedToast') : t('bioActions.publishedToast'),
      )
      router.refresh()
    })
  }

  function remove() {
    if (!window.confirm(t('bioActions.deleteConfirm'))) return
    startTransition(async () => {
      const result = await adminDeleteBio(profileId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('bioActions.deletedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-2">
      {published ? (
        <Button variant="outline" size="sm" asChild>
          <a href={`/bio/${handle}`} target="_blank" rel="noreferrer">
            {t('bioActions.view')}
          </a>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {published ? t('bioActions.unpublish') : t('bioActions.publish')}
      </Button>
      <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
        {t('bioActions.delete')}
      </Button>
    </div>
  )
}
