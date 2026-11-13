'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Database, Files, HardDrive, Loader2 } from 'lucide-react'

import { createSystemBackup } from '@/lib/actions/system-ops'
import { OperationProgress } from './operation-progress'

type Kind = 'DATABASE' | 'FILES' | 'FULL'

export function BackupCreatePanel({ disabled }: { disabled: boolean }) {
  const t = useTranslations('admin.backups')
  const [pending, setPending] = useState<Kind | null>(null)
  const [operationId, setOperationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create(kind: Kind) {
    setPending(kind)
    setError(null)
    const result = await createSystemBackup(kind)
    setPending(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOperationId(result.operationId)
  }

  const options: { kind: Kind; label: string; hint: string; icon: typeof Database }[] = [
    { kind: 'DATABASE', label: t('create.database'), hint: t('create.databaseHint'), icon: Database },
    { kind: 'FILES', label: t('create.files'), hint: t('create.filesHint'), icon: Files },
    { kind: 'FULL', label: t('create.full'), hint: t('create.fullHint'), icon: HardDrive },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.kind}
            type="button"
            disabled={disabled || pending !== null}
            onClick={() => void create(option.kind)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-start transition-colors hover:border-primary/50 hover:bg-primary/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-text">
              {pending === option.kind ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <option.icon className="size-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
      {operationId ? <OperationProgress operationId={operationId} /> : null}
    </div>
  )
}
