'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Panel } from '@/components/admin/panel'
import {
  createActionOption,
  createPlatform,
  deleteActionOption,
  deletePlatform,
  setActionOptionEnabled,
  setPlatformEnabled,
  updateActionOptionLabel,
} from '@/lib/actions/admin'
import { ACTION_ICON_OPTIONS } from '@/lib/action-icons'
import { ActionGlyph, PlatformGlyph } from '@/components/brand-icon'
import type { Platform } from '@/lib/action-catalog'
import { cn } from 'cn'

type ConfirmTarget =
  | { type: 'platform'; key: string; label: string }
  | { type: 'action'; key: string; label: string }

export function PlatformsTable({ initial }: { initial: Platform[] }) {
  const router = useRouter()
  const t = useTranslations('admin.platforms')
  const tc = useTranslations('admin.common')
  const [platforms, setPlatforms] = useState<Platform[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [activeKey, setActiveKey] = useState(initial[0]?.key ?? '')
  const [, startTransition] = useTransition()

  const [createPlatformOpen, setCreatePlatformOpen] = useState(false)
  const [newPlatformKey, setNewPlatformKey] = useState('')
  const [newPlatformLabel, setNewPlatformLabel] = useState('')
  const [newPlatformIcon, setNewPlatformIcon] = useState('globe')

  const [createActionOpen, setCreateActionOpen] = useState(false)
  const [newActionKey, setNewActionKey] = useState('')
  const [newActionLabel, setNewActionLabel] = useState('')
  const [newActionIcon, setNewActionIcon] = useState('link')
  const [newActionBehavior, setNewActionBehavior] = useState<'URL' | 'EMAIL'>('URL')

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [busy, setBusy] = useState(false)

  const enabledPlatforms = platforms.filter((platform) => platform.enabled).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return platforms
    return platforms.filter(
      (platform) =>
        platform.label.toLowerCase().includes(q) ||
        platform.actionOptions.some((option) => option.label.toLowerCase().includes(q)),
    )
  }, [platforms, query])

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

  function submitCreatePlatform() {
    setBusy(true)
    startTransition(async () => {
      const result = await createPlatform({
        key: newPlatformKey,
        label: newPlatformLabel,
        icon: newPlatformIcon,
      })
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPlatforms((current) => [...current, result.platform])
      setActiveKey(result.platform.key)
      setCreatePlatformOpen(false)
      setNewPlatformKey('')
      setNewPlatformLabel('')
      setNewPlatformIcon('globe')
      toast.success(t('toasts.platformCreated'))
      router.refresh()
    })
  }

  function submitCreateAction() {
    if (!active) return
    setBusy(true)
    startTransition(async () => {
      const result = await createActionOption({
        key: newActionKey,
        label: newActionLabel,
        icon: newActionIcon,
        behavior: newActionBehavior,
        platformKey: active.key,
      })
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPlatforms((current) =>
        current.map((platform) =>
          platform.key === active.key
            ? { ...platform, actionOptions: [...platform.actionOptions, result.option] }
            : platform,
        ),
      )
      setCreateActionOpen(false)
      setNewActionKey('')
      setNewActionLabel('')
      setNewActionIcon('link')
      setNewActionBehavior('URL')
      toast.success(t('toasts.actionCreated'))
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
        <aside className="flex flex-col border-b border-border md:border-b-0 md:border-r">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setCreatePlatformOpen(true)}
            >
              <Plus />
              {t('newPlatform')}
            </Button>
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
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <PlatformGlyph
                    platform={platform.label}
                    icon={platform.icon}
                    className="size-4 shrink-0"
                  />
                  <span className="truncate">{platform.label}</span>
                  {!platform.enabled ? (
                    <Badge variant="secondary" className="shrink-0">
                      {tc('off')}
                    </Badge>
                  ) : null}
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {enabledCount}/{platform.actionOptions.length}
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
                  <PlatformGlyph platform={active.label} icon={active.icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2
                      className={cn(
                        'truncate text-sm font-semibold',
                        !active.enabled && 'text-muted-foreground',
                      )}
                    >
                      {active.label}
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
                    aria-label={t('deletePlatformAria', { label: active.label })}
                    onClick={() =>
                      setConfirm({ type: 'platform', key: active.key, label: active.label })
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
                    aria-label={t('enablePlatformAria', { label: active.label })}
                  />
                </span>
              </header>

              <div className="flex items-center justify-between border-b border-border px-4 py-2 sm:px-5">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t('actionsHeading')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setCreateActionOpen(true)}
                >
                  <Plus />
                  {t('addAction')}
                </Button>
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
                              platform={active.label}
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
                              aria-label={t('displayLabelAria', { label: option.label })}
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
                              platform={active.label}
                              icon={option.icon}
                              className="size-4"
                            />
                          </span>
                          <span className="truncate">{option.label}</span>
                          {option.behavior === 'EMAIL' ? (
                            <Badge variant="secondary" className="shrink-0">
                              {tc('email')}
                            </Badge>
                          ) : null}
                          {option.system ? null : <Badge variant="outline">{tc('custom')}</Badge>}
                          <button
                            type="button"
                            onClick={() => startEditLabel(option.key, option.label)}
                            aria-label={t('editLabelAria', { label: option.label })}
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
                            aria-label={t('deleteActionAria', { label: option.label })}
                            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                            onClick={() =>
                              setConfirm({
                                type: 'action',
                                key: option.key,
                                label: option.label,
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
                          aria-label={t('enableActionAria', { label: option.label })}
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

      <Dialog open={createPlatformOpen} onOpenChange={setCreatePlatformOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newPlatformTitle')}</DialogTitle>
            <DialogDescription>{t('newPlatformDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitCreatePlatform()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="platform-label">{t('labelLabel')}</Label>
              <Input
                id="platform-label"
                value={newPlatformLabel}
                onChange={(event) => setNewPlatformLabel(event.target.value)}
                maxLength={60}
                placeholder={t('labelPlaceholder')}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="platform-key">{t('keyLabel')}</Label>
              <Input
                id="platform-key"
                value={newPlatformKey}
                onChange={(event) => setNewPlatformKey(event.target.value)}
                maxLength={50}
                placeholder="pinterest_boards"
              />
              <p className="text-xs text-muted-foreground">{t('keyHint')}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t('iconLabel')}</Label>
              <IconSelect value={newPlatformIcon} onChange={setNewPlatformIcon} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('creating') : t('createPlatform')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createActionOpen} onOpenChange={setCreateActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {active ? t('addActionTitleTo', { platform: active.label }) : t('addAction')}
            </DialogTitle>
            <DialogDescription>{t('addActionDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitCreateAction()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="action-label">{t('labelLabel')}</Label>
              <Input
                id="action-label"
                value={newActionLabel}
                onChange={(event) => setNewActionLabel(event.target.value)}
                maxLength={60}
                placeholder={t('actionLabelPlaceholder')}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-key">{t('keyLabel')}</Label>
              <Input
                id="action-key"
                value={newActionKey}
                onChange={(event) => setNewActionKey(event.target.value)}
                maxLength={50}
                placeholder="pinterest_save_pin"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('iconLabel')}</Label>
                <IconSelect value={newActionIcon} onChange={setNewActionIcon} />
              </div>
              <div className="grid gap-2">
                <Label>{t('behaviorLabel')}</Label>
                <Select
                  value={newActionBehavior}
                  onValueChange={(value) => setNewActionBehavior(value as 'URL' | 'EMAIL')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URL">{t('behaviorUrl')}</SelectItem>
                    <SelectItem value="EMAIL">{t('behaviorEmail')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('creating') : t('createAction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ACTION_ICON_OPTIONS.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <option.Icon className="size-4" />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
