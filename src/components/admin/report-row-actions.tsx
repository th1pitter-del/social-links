'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { resolveAbuseReport } from '@/lib/actions/reports'

export function ReportRowActions({ reportId }: { reportId: string }) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function resolve(outcome: 'RESOLVED' | 'DISMISSED', disableLink = false) {
    startTransition(async () => {
      const result = await resolveAbuseReport(reportId, outcome, { disableLink })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        outcome === 'DISMISSED'
          ? t('reportActions.dismissedToast')
          : disableLink
            ? t('reportActions.resolvedDisabledToast')
            : t('reportActions.resolvedToast'),
      )
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="destructive"
        onClick={() => resolve('RESOLVED', true)}
        disabled={pending}
      >
        {t('reportActions.resolveDisable')}
      </Button>
      <Button size="sm" variant="outline" onClick={() => resolve('RESOLVED')} disabled={pending}>
        {t('reportActions.resolve')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => resolve('DISMISSED')} disabled={pending}>
        {t('reportActions.dismiss')}
      </Button>
    </div>
  )
}
