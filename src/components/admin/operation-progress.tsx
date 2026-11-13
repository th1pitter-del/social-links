'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

import { cn } from 'cn'
import { syncSystemOperation } from '@/lib/actions/system-ops'

type OperationView = {
  id: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  phase: string | null
  message: string | null
  steps: { at: string; phase: string; message: string }[]
  finishedAt: string | null
}

/**
 * Polls the operation row until the detached runner reports a terminal state.
 * The runner keeps working even if this panel is closed, so closing only stops
 * the live view — nothing is cancelled.
 */
export function OperationProgress({ operationId }: { operationId: string }) {
  const t = useTranslations('admin.ops')
  const router = useRouter()
  const [operation, setOperation] = useState<OperationView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const finished = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    finished.current = false

    async function poll() {
      const result = await syncSystemOperation(operationId)
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOperation(result.operation)
      if (result.operation.status === 'SUCCEEDED' || result.operation.status === 'FAILED') {
        if (!finished.current) {
          finished.current = true
          router.refresh()
        }
        return
      }
      timer = setTimeout(poll, 2000)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [operationId, router])

  if (error) {
    return (
      <p className="flex items-start gap-2 text-sm text-error">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        {error}
      </p>
    )
  }

  const succeeded = operation?.status === 'SUCCEEDED'
  const failed = operation?.status === 'FAILED'
  const phaseLabel = operation?.phase
    ? t.has(`phase.${operation.phase}`)
      ? t(`phase.${operation.phase}`)
      : operation.phase
    : null

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        succeeded
          ? 'border-success/40 bg-success/10 text-emerald-800 dark:text-success'
          : failed
            ? 'border-error/40 bg-error/10 text-rose-800 dark:text-error'
            : 'border-border bg-muted/40 text-foreground',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {succeeded ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        ) : failed ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {succeeded
              ? t('succeeded')
              : failed
                ? t('failed')
                : phaseLabel ?? t('starting')}
          </p>
          {operation?.message ? (
            <p className="mt-0.5 break-words text-xs opacity-80">{operation.message}</p>
          ) : null}
          {operation && operation.steps.length > 0 ? (
            <ol className="mt-2 space-y-0.5 text-xs opacity-70">
              {operation.steps.slice(-5).map((step) => (
                <li key={`${step.at}-${step.phase}`} className="flex gap-2">
                  <span className="shrink-0 tabular-nums">
                    {new Date(step.at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="break-words">{step.message}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {!succeeded && !failed ? (
            <p className="mt-1 text-xs opacity-70">{t('keepOpen')}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
