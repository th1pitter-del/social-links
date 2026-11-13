'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Archive, ArchiveRestore, Undo2 } from 'lucide-react'
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
import { rollbackSystemUpdate, setSystemUpdateArchived } from '@/lib/actions/system-ops'
import { OperationProgress } from './operation-progress'

export function UpdateRowActions({
  updateId,
  disabled,
  archived,
  canRollback,
}: {
  updateId: string
  disabled: boolean
  archived: boolean
  canRollback: boolean
}) {
  const t = useTranslations('admin.updates')
  const tc = useTranslations('admin.common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [operationId, setOperationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [archivePending, startArchive] = useTransition()

  async function rollback() {
    setPending(true)
    setError(null)
    const result = await rollbackSystemUpdate(updateId, confirmation)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOperationId(result.operationId)
  }

  function toggleArchived() {
    startArchive(async () => {
      const result = await setSystemUpdateArchived(updateId, !archived)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t(archived ? 'unarchivedToast' : 'archivedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canRollback ? (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setConfirmation('')
            setOperationId(null)
            setError(null)
            setOpen(true)
          }}
        >
          <Undo2 />
          {t('rollback')}
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={archivePending}
        onClick={toggleArchived}
        aria-label={t(archived ? 'unarchive' : 'archive')}
        title={t(archived ? 'unarchive' : 'archive')}
      >
        {archived ? <ArchiveRestore /> : <Archive />}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next)
            if (!next) router.refresh()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rollbackTitle')}</DialogTitle>
            <DialogDescription>{t('rollbackDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-800 dark:text-warning">
              {t('rollbackWarning')}
            </div>
            {operationId ? (
              <OperationProgress operationId={operationId} />
            ) : (
              <div className="space-y-1.5">
                <label htmlFor={`rollback-${updateId}`} className="text-sm font-medium">
                  {t('rollbackConfirmLabel')}
                </label>
                <Input
                  id={`rollback-${updateId}`}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="ROLLBACK"
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
                disabled={pending || confirmation !== 'ROLLBACK'}
                onClick={rollback}
              >
                {pending ? t('rollingBack') : t('rollbackConfirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
