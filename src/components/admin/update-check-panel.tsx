'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, ArrowDownToLine, GitCommitHorizontal, Loader2, RefreshCw } from 'lucide-react'

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
import { Timestamp } from '@/components/timestamp'
import { checkSystemUpdates, installSystemUpdate } from '@/lib/actions/system-ops'
import { OperationProgress } from './operation-progress'

type Commit = {
  sha: string
  short: string
  subject: string
  author: string
  date: string
}

type CheckResult =
  | {
      ok: true
      branch: string
      current: string
      shortCurrent: string
      remote: string
      shortRemote: string
      behind: number
      ahead: number
      dirty: boolean
      commits: Commit[]
      remoteUrl: string | null
      checkedAt: string
    }
  | { ok: false; code: 'unavailable' | 'fetch-failed' | 'no-remote'; detail: string }

export function UpdateCheckPanel({ dirty }: { dirty: boolean }) {
  const t = useTranslations('admin.updates')
  const tc = useTranslations('admin.common')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [checking, setChecking] = useState(true)
  const [installOpen, setInstallOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [operationId, setOperationId] = useState<string | null>(null)
  const [installError, setInstallError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const mounted = useRef(true)

  const run = useCallback(async () => {
    const next = await checkSystemUpdates()
    if (!mounted.current) return
    setResult(next)
    setChecking(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    void run()
    return () => {
      mounted.current = false
    }
  }, [run])

  function refresh() {
    setChecking(true)
    void run()
  }

  function startInstall() {
    if (!result?.ok) return
    setInstallError(null)
    setInstalling(true)
    void (async () => {
      const response = await installSystemUpdate(result.remote, confirmation)
      setInstalling(false)
      if (!response.ok) {
        setInstallError(response.error)
        return
      }
      setOperationId(response.operationId)
    })()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-sm text-muted-foreground">
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t('checking')}
            </span>
          ) : result?.ok ? (
            <span>
              {t('checkedAgainst', { branch: result.branch })} ·{' '}
              <Timestamp value={new Date(result.checkedAt)} />
            </span>
          ) : null}
        </div>
        <Button variant="outline" size="sm" disabled={checking} onClick={refresh}>
          <RefreshCw className={checking ? 'animate-spin' : undefined} />
          {t('checkButton')}
        </Button>
      </div>

      {result && !result.ok ? (
        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-rose-800 dark:text-error">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />
            {t('checkFailed')}
          </p>
          <p className="mt-1 font-mono text-xs break-words opacity-80">{result.detail}</p>
        </div>
      ) : null}

      {result?.ok && result.behind === 0 ? (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-emerald-800 dark:text-success">
          {t('upToDate')}
          {result.ahead > 0 ? <span className="block text-xs opacity-80">{t('aheadNote', { count: result.ahead })}</span> : null}
        </div>
      ) : null}

      {result?.ok && result.behind > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('behindTitle', { count: result.behind })}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {result.shortCurrent} → {result.shortRemote}
              </p>
            </div>
            <Button
              disabled={dirty}
              onClick={() => {
                setConfirmation('')
                setInstallError(null)
                setOperationId(null)
                setInstallOpen(true)
              }}
            >
              <ArrowDownToLine />
              {t('installButton')}
            </Button>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {result.commits.map((commit) => (
              <li key={commit.sha} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="break-words">{commit.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{commit.short}</span> · {commit.author} ·{' '}
                    <Timestamp value={new Date(commit.date)} withTime={false} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {dirty ? (
            <p className="text-xs text-error">{t('dirtyBlocked')}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('safetyBackupNote')}</p>
          )}
        </div>
      ) : null}

      <Dialog
        open={installOpen}
        onOpenChange={(open) => {
          if (!installing) setInstallOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('installTitle')}</DialogTitle>
            <DialogDescription>{t('installDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-800 dark:text-warning">
              {t('installWarning')}
            </div>
            {operationId ? (
              <OperationProgress operationId={operationId} />
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="update-confirmation" className="text-sm font-medium">
                  {t('installConfirmLabel')}
                </label>
                <Input
                  id="update-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="UPDATE"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}
            {installError ? <p className="text-sm text-error">{installError}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={installing}>
                {tc('cancel')}
              </Button>
            </DialogClose>
            {operationId ? null : (
              <Button
                disabled={installing || confirmation !== 'UPDATE'}
                onClick={startInstall}
              >
                {installing ? t('installing') : t('installConfirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
