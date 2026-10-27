'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { adminDeleteStoredFile } from '@/lib/actions/admin'

export function FileRowActions({ fileId, filename }: { fileId: string; filename: string }) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = await adminDeleteStoredFile(fileId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success(t('fileActions.deletedToast'))
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {t('fileActions.delete')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('fileActions.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('fileActions.deleteDescription', { filename })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? t('common.deleting') : t('fileActions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
