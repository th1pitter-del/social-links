'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Loader2, Pencil, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Panel } from '@/components/admin/panel'
import {
  deleteActionOption,
  deletePlatform,
  setActionOptionEnabled,
  setPlatformEnabled,
  updateActionOptionLabel,
} from '@/lib/actions/admin'
import { ActionGlyph, PlatformGlyph } from '@/components/brand-icon'
import { actionLabel, platformLabel } from '@/lib/action-label'
import { formatNumber } from '@/lib/format'
import type { Platform } from '@/lib/action-catalog'
import { cn } from 'cn'

type ConfirmTarget =
  | { type: 'platform'; key: string; label: string }
  | { type: 'action'; key: string; label: string }

export function PlatformsTable({ initial }: { initial: Platform[] }) {
  const router = useRouter()
  const t = useTranslations('admin.platforms')
  const locale = useLocale()
  const tc = useTranslations('admin.common')
  const actionT = useTranslations('actions')
  const platformT = useTranslations('platforms')
  const platformName = (platform: { key: string; label: string }) =>
    platformLabel(platform, platformT)
  const actionName = (option: { key: string; label: string }) => actionLabel(option, actionT)
  const [platforms, setPlatforms] = useState<Platform[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [activeKey, setActiveKey] = useState(initial[0]?.key ?? '')
  const [, startTransition] = useTransition()

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [busy, setBusy] = useState(false)

  const enabledPlatforms = platforms.filter((platform) => platform.enabled).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return platforms
    return platforms.filter(
      (platform) =>
        platformLabel(platform, platformT).toLowerCase().includes(q) ||
        platform.label.toLowerCase().includes(q) ||
        platform.actionOptions.some(
          (option) =>
            actionLabel(option, actionT).toLowerCase().includes(q) ||
            option.label.toLowerCase().includes(q),
        ),
    )
  }, [platforms, query, actionT, platformT])

  const active =
    platforms.find((platform) => platform.key === activeKey) ?? filtered[0] ?? platforms[0]

  function setEnabled(platformKey: string, enabled: boolean) {
    setPending(platformKey)
    startTransition(async () => {
      const result = await setPlatformEnabled(platformKey, enabled)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPlatforms((current) =>
        current.map((platform) =>
          platform.key === platformKey ? { ...platform, enabled } : platform,
        ),
      )
      toast.success(enabled ? t('toasts.platformEnabled') : t('toasts.platformDisabled'))
      router.refresh()
    })
  }

  function setActionEnabled(optionKey: string, enabled: boolean) {
    setPending(optionKey)
    startTransition(async () => {
      const result = await setActionOptionEnabled(optionKey, enabled)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPlatforms((current) =>
        current.map((platform) => ({
          ...platform,
          actionOptions: platform.actionOptions.map((option) =>
            option.key === optionKey ? { ...option, enabled } : option,
          ),
        })),
      )
      toast.success(enabled ? t('toasts.actionEnabled') : t('toasts.actionDisabled'))
      router.refresh()
    })
  }

  function startEditLabel(optionKey: string, currentLabel: string) {
    setEditingKey(optionKey)
    setDraftLabel(currentLabel)
  }

  function cancelEditLabel() {
    setEditingKey(null)
    setDraftLabel('')
  }

  function saveLabel(optionKey: string) {
    const trimmed = draftLabel.trim().replace(/\s+/g, ' ')
    if (!trimmed) {
      toast.error(t('toasts.labelEmpty'))
      return
    }
    if (trimmed.length > 60) {
      toast.error(t('toasts.labelTooLong'))
      return
    }

    setPending(optionKey)
    startTransition(async () => {
      const result = await updateActionOptionLabel(optionKey, trimmed)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPlatforms((current) =>
        current.map((platform) => ({
          ...platform,
          actionOptions: platform.actionOptions.map((option) =>
            option.key === optionKey ? { ...option, label: trimmed } : option,
          ),
        })),
      )
      cancelEditLabel()
      toast.success(t('toasts.labelUpdated'))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      if (confirm.type === 'platform') {
        const result = await deletePlatform(confirm.key)
        setBusy(false)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        const remaining = platforms.filter((platform) => platform.key !== confirm.key)
        setPlatforms(remaining)
        setActiveKey(remaining[0]?.key ?? '')
        toast.success(t('toasts.platformDeleted'))
      } else {
        const result = await deleteActionOption(confirm.key)
        setBusy(false)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        setPlatforms((current) =>
          current.map((platform) => ({
            ...platform,
            actionOptions: platform.actionOptions.filter((option) => option.key !== confirm.key),
          })),
        )
        toast.success(t('toasts.actionDeleted'))
      }
      setConfirm(null)
      router.refresh()
    })
  }

  return (
    <Panel>
      <div className="grid md:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col border-b border-border md:border-b-0 md:border-e">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
                aria-label={t('searchAria')}
              />
            </div>
            <p className="mt-3 px-1 text-xs text-muted-foreground">
              {t('enabledCount', { enabled: enabledPlatforms, total: platforms.length })}
            </p>
          </div>

          <nav
            role="tablist"
            aria-orientation="vertical"
            className="flex max-h-[18rem] flex-col gap-1 overflow-y-auto p-2 md:max-h-[32rem]"
          >
            {filtered.map((platform) => {
              const isActive = platform.key === active?.key
              const enabledCount = platform.actionOptions.filter((option) => option.enabled).length
              return (
                <button
                  key={platform.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveKey(platform.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <PlatformGlyph
                    platform={platform.key}
                    icon={platform.icon}
                    className="size-4 shrink-0"
                  />
                  <span className="truncate">{platformName(platform)}</span>
                  {!platform.enabled ? (
                    <Badge variant="secondary" className="shrink-0">
                      {tc('off')}
                    </Badge>
                  ) : null}
                  <span className="ms-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatNumber(locale, enabledCount)}/{formatNumber(locale, platform.actionOptions.length)}
                  </span>
                </button>
              )
            })}

            {filtered.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                {t('noMatches', { query })}
              </p>
            ) : null}
          </nav>
        </aside>

        <section className="min-w-0">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted',
                    active.enabled ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <PlatformGlyph platform={active.key} icon={active.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2
                      className={cn(
                        'truncate text-sm font-semibold',
                        !active.enabled && 'text-muted-foreground',
                      )}
                    >
                      {platformName(active)}
                    </h2>
                    {!active.enabled ? <Badge variant="secondary">{tc('disabled')}</Badge> : null}
                    {active.system ? null : <Badge variant="outline">{tc('custom')}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('actionsEnabledCount', {
                      enabled: active.actionOptions.filter((option) => option.enabled).length,
                      total: active.actionOptions.length,
                    })}
                  </p>
                </div>

                {pending === active.key ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
                {active.system ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('deletePlatformAria', { label: platformName(active) })}
                    onClick={() =>
                      setConfirm({ type: 'platform', key: active.key, label: platformName(active) })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {active.enabled ? tc('enabled') : tc('disabled')}
                  <Switch
                    checked={active.enabled}
                    disabled={pending === active.key}
                    onCheckedChange={(checked) => setEnabled(active.key, checked)}
                    aria-label={t('enablePlatformAria', { label: platformName(active) })}
                  />
                </span>
              </header>

              <div className="border-b border-border px-4 py-2 sm:px-5">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t('actionsHeading')}
                </p>
              </div>

              <ul className="divide-y divide-border">
                {active.actionOptions.map((option) => {
                  const actionBusy = pending === option.key
                  const isEditing = editingKey === option.key
                  return (
                    <li
                      key={option.key}
                      className="group flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      {isEditing ? (
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <ActionGlyph
                              platform={active.key}
                              icon={option.icon}
                              className="size-4"
                            />
                          </span>
                          <form
                            className="flex min-w-0 flex-1 items-center gap-2"
                            onSubmit={(event) => {
                              event.preventDefault()
                              saveLabel(option.key)
                            }}
                          >
                            <Input
                              value={draftLabel}
                              onChange={(event) => setDraftLabel(event.target.value)}
                              maxLength={60}
                              autoFocus
                              aria-label={t('displayLabelAria', { label: actionName(option) })}
                              className="h-8 max-w-xs"
                            />
                            <button
                              type="submit"
                              disabled={actionBusy}
                              aria-label={t('saveLabelAria')}
                              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                              {actionBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={cancelEditLabel}
                              aria-label={t('cancelEditAria')}
                              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                              <X className="size-4" />
                            </button>
                          </form>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'flex min-w-0 items-center gap-3 text-sm',
                            !option.enabled && 'text-muted-foreground',
                          )}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <ActionGlyph
                              platform={active.key}
                              icon={option.icon}
                              className="size-4"
                            />
                          </span>
                          <span className="truncate">{actionName(option)}</span>
                          {option.behavior === 'EMAIL' ? (
                            <Badge variant="secondary" className="shrink-0">
                              {tc('email')}
                            </Badge>
                          ) : null}
                          {option.system ? null : <Badge variant="outline">{tc('custom')}</Badge>}
                          <button
                            type="button"
                            onClick={() => startEditLabel(option.key, option.label)}
                            aria-label={t('editLabelAria', { label: actionName(option) })}
                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </span>
                      )}
                      <span className="flex shrink-0 items-center gap-2">
                        {!isEditing && actionBusy ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : null}
                        {option.system ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('deleteActionAria', { label: actionName(option) })}
                            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                            onClick={() =>
                              setConfirm({
                                type: 'action',
                                key: option.key,
                                label: actionName(option),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        )}
                        <Switch
                          checked={option.enabled}
                          disabled={actionBusy || isEditing || !active.enabled}
                          onCheckedChange={(checked) => setActionEnabled(option.key, checked)}
                          aria-label={t('enableActionAria', { label: actionName(option) })}
                        />
                      </span>
                    </li>
                  )
                })}
                {active.actionOptions.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-muted-foreground sm:px-5">
                    {t('noActions')}
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('noPlatforms')}</p>
          )}
        </section>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'platform' ? t('deletePlatformTitle') : t('deleteActionTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { label: confirm?.label ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                {tc('cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? tc('deleting') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
