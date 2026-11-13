'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, RotateCcw, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { deleteSystemBackup, restoreSystemBackup } from '@/lib/actions/system-ops'
import { OperationProgress } from './operation-progress'

export function BackupRowActions({
  backupId,
  filename,
  ready,
  disabled,
}: {
  backupId: string
  filename: string | null
  ready: boolean
  disabled: boolean
}) {
  const t = useTranslations('admin.backups')
  const tc = useTranslations('admin.common')
  const router = useRouter()
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [operationId, setOperationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function restore() {
    setError(null)
    startTransition(async () => {
      const result = await restoreSystemBackup(backupId, confirmation)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOperationId(result.operationId)
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteSystemBackup(backupId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDeleteOpen(false)
      toast.success(t('deletedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {ready && filename ? (
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/admin/backups/${backupId}/download`}>
            <Download />
            {t('download')}
          </a>
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={!ready || disabled}
        onClick={() => {
          setConfirmation('')
          setOperationId(null)
          setError(null)
          setRestoreOpen(true)
        }}
      >
        <RotateCcw />
        {t('restore')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setError(null)
          setDeleteOpen(true)
        }}
        aria-label={t('delete')}
      >
        <Trash2 />
      </Button>

      <Dialog
        open={restoreOpen}
        onOpenChange={(open) => {
          if (!pending) setRestoreOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('restoreTitle')}</DialogTitle>
            <DialogDescription>{t('restoreDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-800 dark:text-warning">
              {t('restoreWarning')}
            </div>
            {operationId ? (
              <OperationProgress operationId={operationId} />
            ) : (
              <div className="space-y-1.5">
                <label htmlFor={`restore-${backupId}`} className="text-sm font-medium">
                  {t('restoreConfirmLabel')}
                </label>
                <Input
                  id={`restore-${backupId}`}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="RESTORE"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}
            {error ? <p className="text-sm text-error">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                {tc('cancel')}
              </Button>
            </DialogClose>
            {operationId ? null : (
              <Button
                variant="destructive"
                disabled={pending || confirmation !== 'RESTORE'}
                onClick={restore}
              >
                {pending ? t('restoring') : t('restoreButton')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>{t('deleteDescription')}</DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                {tc('cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending ? t('deleting') : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
