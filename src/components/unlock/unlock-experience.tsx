'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check, CheckCircle2, Download, ExternalLink, Eye, FileLock, FileText, Loader2, Lock, Mail, Share2, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PlatformGlyph, platformActionColor } from '@/components/brand-icon'
import { targetDisplayName, withTargetName } from '@/lib/action-target'
import { formatBytes, formatNumber } from '@/lib/format'
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
  /** The real action id, so a row can be completed the moment it is pressed. */
  id: string
  type: string
  label: string
  platform: string | null
  icon: string
  behavior: 'URL' | 'EMAIL'
  /** Where the row goes. Known up front so the first press opens it too. */
  target: string
}

type StepAction = {
  id: string
  type: string
  label: string
  platform: string | null
  icon: string
  behavior: 'URL' | 'EMAIL'
  completed: boolean
  target: string
  visitUrl: string | null
}

const emptySubscribe = () => () => {}

/** Adds YouTube's one-click subscribe prompt when the row is a subscribe step. */
function withSubConfirmation(target: string): string {
  try {
    const url = new URL(target)
    url.searchParams.set('sub_confirmation', '1')
    return url.toString()
  } catch {
    return target
  }
}

/** The completed tick, drawn the same way as the hero's demonstration card. */
const ROW_CHECK =
  'flex size-5 items-center justify-center rounded-full bg-success/15 text-emerald-600 ring-1 ring-success/30 dark:text-success'

/**
 * The canonical URL visitors share. Deliberately rebuilt from the origin plus
 * the slug so a visitor never publishes their session token through a share.
 */
function useShareUrl(slug: string) {
  return useSyncExternalStore(
    emptySubscribe,
    () => `${window.location.origin}/link/${slug}`,
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
  steps?: UnlockStepPreview[]
}) {
  const t = useTranslations('unlock')
  const actionT = useTranslations('actions')
  const namedT = useTranslations('actionsNamed')
  const platformT = useTranslations('platforms')
  const locale = useLocale()
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
      if (!cancelled && next) applyState(next)
    })
    return () => {
      cancelled = true
    }
  }, [initialToken, applyState])

  // The row is the visitor's first move, so the session begins here instead of
  // behind a separate "start" press: one action per step, like the card shows.
  async function ensureSession(): Promise<UnlockState | null> {
    if (state) return state
    setBusy(true)
    setError(null)
    const result = await startUnlock(slug, { preview })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return null
    }
    applyState(result.state)
    // Starting a session records a view server-side, so the public counters on
    // this page are now stale. Refresh them in place rather than waiting.
    router.refresh()
    return result.state
  }

  async function handleStart() {
    await ensureSession()
  }

  /** Opens the step and records it in the same press. */
  async function handleComplete(actionId: string, isEmail = false) {
    const session = await ensureSession()
    if (!session) return
    setBusy(true)
    setError(null)
    const result = await markActionComplete({
      token: session.token,
      actionId,
      email: isEmail ? email : undefined,
      consent: isEmail ? consent : undefined,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    applyState(result.state)
  }

  /**
   * A website step completes only after the server itself redirects the visitor,
   * so the tab is opened from this gesture and the state is read back after.
   */
  async function handleVisit(actionId: string) {
    if (busy || expired) return
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null

    const session = await ensureSession()
    if (!session) {
      tab?.close()
      return
    }
    // The signed URL is short-lived, so rebuild it right before navigating.
    const fresh = (await getUnlockState(session.token)) ?? session
    applyState(fresh)
    const visitUrl = fresh.actions.find((action) => action.id === actionId)?.visitUrl
    if (!visitUrl) {
      tab?.close()
      setError(t('visitUnavailable'))
      return
    }

    if (tab) tab.location.replace(visitUrl)
    else window.location.assign(visitUrl)

    // The redirect lands on another site; this tab stays open and catches up.
    void (async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        const next = await getUnlockState(session.token)
        if (!next) return
        applyState(next)
        if (next.actions.find((action) => action.id === actionId)?.completed) return
      }
    })()
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

  // The card has one call to action, the way the demonstration card has one.
  // It begins the session or reveals the reward.
  function handlePrimary() {
    if (!started) {
      void handleStart()
      return
    }
    if (!state?.canUnlock) {
      setError(t('stepsFirst'))
      return
    }
    void handleClaim()
  }

  const started = Boolean(state)
  const expired = Boolean(state?.expired)
  const ready = Boolean(state?.canUnlock)
  const ctaLabel = !started ? t('start') : t('unlockButton')

  const actionSteps: StepAction[] = state
    ? state.actions.map((action) => ({ ...action }))
    : steps.map((step) => ({
        id: step.id,
        type: step.type,
        label: step.label,
        platform: step.platform,
        icon: step.icon,
        behavior: step.behavior,
        completed: false,
        target: step.target,
        visitUrl: null,
      }))

  const totalSteps = actionSteps.length
  const doneSteps = actionSteps.filter((action) => action.completed).length
  const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
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
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  {/* What sits inside this link is a locked drop, not the site's
                      brand, so an empty frame shows a sealed document. */}
                  <FileLock className="size-20 sm:size-24" />
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
                  <span className="text-sm font-medium tabular-nums">
                    {formatNumber(locale, unlockCount)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t('unlocks')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium tabular-nums">
                    {formatNumber(locale, viewCount)}
                  </span>
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
              <p className="text-sm text-muted-foreground">
                {totalSteps === 1
                  ? t('introOne', { title })
                  : t('intro', { title, total: totalSteps })}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                    {t('stepsTitle')}
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t('stepsCount', { done: doneSteps, total: totalSteps })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('stepsTitle')}
                  className="mt-2 flex h-1 w-full items-center overflow-hidden rounded-full bg-muted"
                >
                  {/* Width, not the shadcn indicator's translateX: a translated fill
                      slides the wrong way in RTL, and this page serves Arabic too. */}
                  <div
                    className={cn(
                      'h-full rounded-full bg-primary motion-reduce:transition-none',
                      percent === 0
                        ? 'transition-none'
                        : 'transition-[width] duration-700 ease-out',
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Each step is one solid platform-coloured button, exactly the
                    treatment the demonstration card in the hero shows. */}
                <ol className="mx-auto mt-3 w-[92%] space-y-2">
                  {actionSteps.map((action) => {
                    const isEmail = action.behavior === 'EMAIL'
                    const done = action.completed
                    const fill = platformActionColor(action.platform, action.type)
                    const clickable = !done && !expired && !busy
                    const interactive = clickable
                    // A subscription row lands on the channel with the subscribe
                    // prompt already open; the channel link itself still works.
                    const href = action.target
                      ? action.type === 'YOUTUBE_SUBSCRIBE'
                        ? withSubConfirmation(action.target)
                        : action.target
                      : null
                    const surface = cn(
                      'relative flex w-full items-center justify-center gap-3 px-4 py-3.5 text-sm',
                      // A finished task drops its brand fill and settles to the
                      // neutral surface instead: only what is left keeps a colour.
                      done
                        ? 'bg-muted/50 text-muted-foreground'
                        : fill
                          ? cn(
                              'bg-[var(--action-bg)] text-white',
                              interactive && 'hover:bg-[var(--action-bg-hover)]',
                            )
                          : '',
                      interactive &&
                        'cursor-pointer transition-[background-color,scale] duration-200 ease-out motion-safe:hover:scale-[1.02] motion-reduce:transition-none',
                    )
                    const fillVars = fill
                      ? ({
                          '--action-bg': fill.base,
                          '--action-bg-hover': fill.hover,
                        } as React.CSSProperties)
                      : undefined
                    const glyph = (
                      <PlatformGlyph
                        platform={action.platform}
                        icon={action.icon}
                        neutral
                        className={cn(
                          // The row carries the platform's solid colour, so the
                          // mark wears white: brand on brand would leave nothing
                          // to see.
                          'size-6 shrink-0',
                          done ? 'text-muted-foreground' : fill ? 'text-white' : 'text-foreground',
                        )}
                      />
                    )
                    // Name the actual channel or site the step opens, with that
                    // language's grammar: "Subscribe to MrBeast", not
                    // "Subscribe on YouTube". Owner-written labels stay as-is.
                    const platformName =
                      action.platform && platformT.has(action.platform)
                        ? platformT(action.platform)
                        : null
                    const targetName = targetDisplayName(action.platform, action.target)
                    const builtInLabel =
                      actionT.has(action.type) && action.label === actionT(action.type)
                    const shownLabel =
                      builtInLabel && targetName && namedT.has(action.type)
                        ? namedT(action.type, { name: targetName })
                        : builtInLabel
                          ? withTargetName(action.label, platformName, targetName)
                          : action.label
                    const label = (
                      <span
                        className={cn(
                          'min-w-0 truncate font-medium',
                          // Struck through as well as greyed: together they read as
                          // finished at a glance.
                          done &&
                            'text-muted-foreground line-through decoration-muted-foreground/50',
                        )}
                      >
                        {shownLabel}
                      </span>
                    )

                    if (isEmail) {
                      // The email step needs the visitor's own input, so its row
                      // opens up under the same surface instead of being a button.
                      return (
                        <li
                          key={action.id}
                          className="overflow-hidden rounded-xl"
                        >
                          <div style={fillVars} className={cn(surface, 'flex-col items-stretch gap-3')}>
                            <div className="flex items-center justify-center gap-3">
                              {glyph}
                              {label}
                              {done ? (
                                <span className={ROW_CHECK}>
                                  <Check className="size-3 shrink-0 strokeWidth={3}" />
                                </span>
                              ) : null}
                            </div>
                            {!done ? (
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
                                  onClick={() => void handleComplete(action.id, true)}
                                  disabled={busy || !email || !consent}
                                >
                                  {t('submitEmail')}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      )
                    }

                    const rowContent = (
                      <>
                        {glyph}
                        {label}
                        {/* The badge sits in a slot that takes no part in the row's
                            layout, so the row never changes height as it finishes. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 end-4 flex items-center"
                        >
                          <span
                            className={cn(
                              ROW_CHECK,
                              done
                                ? 'motion-safe:animate-[demo-check_0.24s_ease-out]'
                                : 'opacity-0',
                            )}
                          >
                            <Check className="size-3 shrink-0 strokeWidth={3}" />
                          </span>
                        </span>
                        {done ? <span className="sr-only">{t('completed')}</span> : null}
                      </>
                    )

                    return (
                      <li key={action.id} className="overflow-hidden rounded-xl">
                        {action.type === 'VISIT' && !done && !expired ? (
                          // The server performs this navigation and records it;
                          // a plain link press could not prove the visit.
                          <button
                            type="button"
                            onClick={() => void handleVisit(action.id)}
                            disabled={busy}
                            style={fillVars}
                            className={surface}
                          >
                            {rowContent}
                          </button>
                        ) : clickable && href ? (
                          // A real anchor, not a scripted popup: the browser opens
                          // it on the visitor's own gesture, including the first
                          // press before the unlock session exists.
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => void handleComplete(action.id)}
                            style={fillVars}
                            className={cn(surface, 'no-underline')}
                          >
                            {rowContent}
                          </a>
                        ) : (
                          <button type="button" disabled style={fillVars} className={surface}>
                            {rowContent}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ol>

                {/* One slot, one call to action - it begins the session or
                    reveals the reward. It matches a task row so it reads as the
                    next row rather than a smaller control. */}
                <div className="relative mx-auto mt-3 h-[3.25rem] w-[92%]">
                  <Button
                    size="sm"
                    // Neutral until the tasks are all in, lime the moment the reward
                    // is real: the colour itself is the progress signal.
                    variant={ready ? 'default' : 'secondary'}
                    onClick={handlePrimary}
                    disabled={busy || expired}
                    className={cn(
                      'absolute inset-0 h-full rounded-xl text-sm [&_svg]:size-4',
                      'transition-[background-color,color] duration-500',
                    )}
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" />
                    ) : ready ? (
                      <Unlock />
                    ) : (
                      <Lock />
                    )}
                    {ctaLabel}
                  </Button>
                </div>

                {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
                {expired ? <p className="mt-3 text-sm text-destructive">{t('expired')}</p> : null}
              </div>
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
                        {formatBytes(locale, claimed.file.size)}
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
