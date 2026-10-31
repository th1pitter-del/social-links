'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Download, ExternalLink, Eye, FileText, Loader2, Lock, Mail, Share2, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ActionGlyph } from '@/components/brand-icon'
import { BrandMark } from '@/components/brand-mark'
import { cn } from 'cn'
import {
  claimContent,
  getUnlockState,
  markActionComplete,
  startUnlock,
  type UnlockState,
} from '@/lib/actions/unlock'

type ClaimedContent =
  | { contentType: 'URL'; targetUrl: string | null }
  | { contentType: 'TEXT'; textContent: string | null }
  | { contentType: 'FILE'; file: { filename: string; size: number; downloadUrl: string } }
  | null

/** A creator action as shown before the visitor starts the unlock session. */
export type UnlockStepPreview = {
  label: string
  platform: string | null
  icon: string
  behavior: 'URL' | 'EMAIL'
}

type StepAction = {
  id: string
  label: string
  platform: string | null
  icon: string
  behavior: 'URL' | 'EMAIL'
  completed: boolean
  target: string
}

const emptySubscribe = () => () => {}

/**
 * The canonical URL visitors share. Deliberately rebuilt from the origin plus
 * the slug so a visitor never publishes their session token through a share.
 */
function useShareUrl(slug: string) {
  return useSyncExternalStore(
    emptySubscribe,
    () => `${window.location.origin}/u/${slug}`,
    () => '',
  )
}

export function UnlockExperience({
  slug,
  title,
  description,
  coverImage,
  initialToken,
  preview = false,
  viewCount = 0,
  unlockCount = 0,
  siteName,
  logoUrl,
  steps = [],
}: {
  slug: string
  title: string
  description: string | null
  coverImage: string | null
  initialToken: string | null
  preview?: boolean
  viewCount?: number
  unlockCount?: number
  siteName: string
  logoUrl?: string
  steps?: UnlockStepPreview[]
}) {
  const t = useTranslations('unlock')
  const router = useRouter()
  const [state, setState] = useState<UnlockState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [claimed, setClaimed] = useState<ClaimedContent>(null)
  const shareUrl = useShareUrl(slug)
  /** Token already loaded or created locally; keeps a route refresh from re-fetching it. */
  const loadedTokenRef = useRef<string | null>(null)
  const applyState = useCallback((next: UnlockState) => {
    loadedTokenRef.current = next.token
    setState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('token', next.token)
    window.history.replaceState(null, '', url.toString())
  }, [])

  useEffect(() => {
    if (!initialToken || initialToken === loadedTokenRef.current) return
    let cancelled = false
    void getUnlockState(initialToken).then((next) => {
      if (!cancelled && next) {
        loadedTokenRef.current = next.token
        setState(next)
        const url = new URL(window.location.href)
        url.searchParams.set('token', next.token)
        window.history.replaceState(null, '', url.toString())
      }
    })
    return () => {
      cancelled = true
    }
  }, [initialToken])

  async function handleStart() {
    setBusy(true)
    setError(null)
    const result = await startUnlock(slug, { preview })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    applyState(result.state)
    // Starting a session records a view server-side, so the public counters on
    // this page are now stale. Refresh them in place instead of waiting for
    // the visitor to reload.
    router.refresh()
  }

  async function handleAction(actionId: string, target: string, isEmail: boolean) {
    if (!state) return
    if (!isEmail && target) {
      window.open(target, '_blank', 'noopener,noreferrer')
    }
    setBusy(true)
    setError(null)
    const result = await markActionComplete({
      token: state.token,
      actionId,
      email: isEmail ? email : undefined,
      consent: isEmail ? consent : undefined,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setState(result.state)
  }

  async function handleClaim() {
    if (!state) return
    setBusy(true)
    setError(null)
    const result = await claimContent(state.token)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.contentType === 'URL') {
      setClaimed({ contentType: 'URL', targetUrl: result.targetUrl })
    } else if (result.contentType === 'FILE' && result.file) {
      setClaimed({ contentType: 'FILE', file: result.file })
    } else {
      setClaimed({ contentType: 'TEXT', textContent: result.textContent })
    }
  }

  const started = Boolean(state)

  const actionSteps: StepAction[] = state
    ? state.actions.map((action) => ({ ...action }))
    : steps.map((step, index) => ({
        id: `preview-${index}`,
        label: step.label,
        platform: step.platform,
        icon: step.icon,
        behavior: step.behavior,
        completed: false,
        target: '',
      }))

  const totalSteps = actionSteps.length
  const doneSteps = actionSteps.filter((action) => action.completed).length
  const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="grid items-start gap-6 overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Left: the shared content and its public stats. */}
        <div>
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt=""
                className="h-48 w-full rounded-xl object-cover sm:h-56"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 via-pulse-lime-soft/10 to-primary/5 sm:h-56">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BrandMark className="size-12" src={logoUrl || null} />
                  <p className="text-xs font-medium tracking-wide uppercase opacity-60">{siteName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              {preview ? (
                <p className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {t('previewBanner')}
                </p>
              ) : null}

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description ? (
                  <p className="text-sm font-medium text-foreground whitespace-pre-line">{description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Unlock className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium tabular-nums">{unlockCount}</span>
                  <span className="text-xs text-muted-foreground">{t('unlocks')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium tabular-nums">{viewCount}</span>
                  <span className="text-xs text-muted-foreground">{t('views')}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(
                    shareUrl,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Share2 className="size-3.5" />
                  {t('share')}
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: the ordered unlock steps. */}
        <div className="p-5 sm:p-6">
          {!claimed ? (
            <>
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{t('stepsTitle')}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t('stepsCount', { done: doneSteps, total: totalSteps })}
                  </span>
                </div>
                <Progress value={percent} />
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                {totalSteps === 1
                  ? t('introOne', { title })
                  : t('intro', { title, total: totalSteps })}
              </p>

              <ol className="overflow-hidden rounded-xl border">
                {actionSteps.map((action, index) => {
                      const isEmail = action.behavior === 'EMAIL'
                      return (
                        <li
                          key={started ? action.id : `preview-${index}`}
                          className={cn(
                            'p-4',
                            action.completed ? 'bg-emerald-500/5' : '',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                action.completed
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {action.completed ? <CheckCircle2 className="size-4" /> : index + 1}
                            </span>
                            <div className="min-w-0 flex-1 space-y-3">
                              <div>
                                <p className="flex items-center gap-2 font-medium">
                                  <ActionGlyph
                                    platform={action.platform}
                                    icon={action.icon}
                                    className="size-4 shrink-0 text-muted-foreground"
                                  />
                                  <span className="truncate">{action.label}</span>
                                </p>
                                {action.completed ? (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {t('completed')}
                                  </p>
                                ) : null}
                              </div>

                              {started && !action.completed && isEmail ? (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Mail className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                      type="email"
                                      placeholder={t('emailPlaceholder')}
                                      className="ps-8"
                                      value={email}
                                      onChange={(event) => setEmail(event.target.value)}
                                    />
                                  </div>
                                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Checkbox
                                      checked={consent}
                                      onCheckedChange={(value) => setConsent(value === true)}
                                    />
                                    <span>{t('consent')}</span>
                                  </label>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAction(action.id, '', true)}
                                    disabled={busy || !email || !consent}
                                  >
                                    {t('submitEmail')}
                                  </Button>
                                </div>
                              ) : null}

                              {started && !action.completed && !isEmail ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(action.id, action.target, false)}
                                  disabled={busy}
                                >
                                  <ExternalLink />
                                  {t('openStep')}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
              </ol>

              {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

              {!started ? (
                <Button size="lg" className="mt-4 w-full" onClick={handleStart} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Lock />}
                  {t('start')}
                </Button>
              ) : state?.canUnlock ? (
                <Button size="lg" className="mt-4 w-full" onClick={handleClaim} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  {t('unlockButton')}
                </Button>
              ) : null}

              {state?.expired ? (
                <p className="mt-3 text-sm text-destructive">{t('expired')}</p>
              ) : null}
            </>
          ) : (
            <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                {t('unlocked')}
              </p>
              {claimed.contentType === 'URL' ? (
                <Button size="lg" className="w-full" asChild>
                  <a
                    href={claimed.targetUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <ExternalLink />
                    {t('openContent')}
                  </a>
                </Button>
              ) : claimed.contentType === 'FILE' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
                    <FileText className="size-8 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{claimed.file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(claimed.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full" asChild>
                    <a href={claimed.file.downloadUrl} download>
                      <Download />
                      {t('downloadFile')}
                    </a>
                  </Button>
                </div>
              ) : claimed.textContent ? (
                <div className="rounded-lg border bg-background p-4 text-sm whitespace-pre-wrap">
                  {claimed.textContent}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noContent')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Promotional block required on every public unlock page. */}
      <div className="mt-6 rounded-2xl border bg-card p-5 text-center shadow-sm">
        <p className="font-medium">{t('promoTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('promoBody')}</p>
        <Button size="sm" className="mt-3" asChild>
          <Link href="/create">{t('promoButton')}</Link>
        </Button>
      </div>

      {!preview ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href={`/report?link=${slug}`} className="hover:underline">
            {t('report')}
          </a>
        </p>
      ) : null}
    </div>
  )
}
