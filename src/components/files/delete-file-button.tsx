'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export function DeleteFileButton({ id, action }: { id: string; action: (id: string) => Promise<{ ok: boolean; error?: string }> }) {
  const t = useTranslations('dashboard.fileActions')
  const [pending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      const result = await action(id)
      if (!result.ok) {
        toast.error(result.error ?? t('deleteFailed'))
        return
      }
      toast.success(t('deletedToast'))
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={handle}
      disabled={pending}
      aria-label={t('deleteAria')}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
