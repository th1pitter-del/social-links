'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Panel } from '@/components/admin/panel'
import { navIcons, type SiteNavIcon } from '@/components/site-nav-icons'
import { locales, localeDirection, localeLabels, type Locale } from '@/i18n/config'
import {
  createHeaderLink,
  deleteHeaderLink,
  moveHeaderLink,
  setHeaderLinkEnabled,
  updateHeaderLink,
} from '@/lib/actions/admin-ads'
import {
  HEADER_ICONS,
  HEADER_ICON_DEFAULT,
  HEADER_LINK_LABEL_MAX_LENGTH,
  HEADER_MENU_KEYS,
  isHeaderMenuKey,
  type HeaderLinkData,
  type HeaderMenuKey,
} from '@/lib/ads'
import { cn } from 'cn'

/** Radix select values cannot be empty, so the "no key" and "no parent" rows
 *  use sentinels instead of ''. */
const CUSTOM_LABEL = '__custom'
const TOP_LEVEL = '__top'

type FormState = {
  /** One field per supported locale; empty locales fall back automatically. */
  labels: Record<Locale, string>
  labelKey: string
  parentId: string
  url: string
  icon: SiteNavIcon
  color: string
  newTab: boolean
}

const EMPTY_LABELS = Object.fromEntries(locales.map((locale) => [locale, ''])) as Record<
  Locale,
  string
>

const EMPTY_FORM: FormState = {
  labels: EMPTY_LABELS,
  labelKey: '',
  parentId: '',
  url: '',
  icon: HEADER_ICON_DEFAULT,
  color: '',
  newTab: true,
}

function sortLinks(list: HeaderLinkData[]): HeaderLinkData[] {
  return [...list].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
}

function siblingsOf(list: HeaderLinkData[], link: HeaderLinkData): HeaderLinkData[] {
  return sortLinks(list.filter((item) => item.parentId === link.parentId))
}

function applyMove(list: HeaderLinkData[], id: string, direction: 'up' | 'down'): HeaderLinkData[] {
  const target = list.find((item) => item.id === id)
  if (!target) return list
  const siblings = siblingsOf(list, target)
  const index = siblings.findIndex((item) => item.id === id)
  const neighbor = direction === 'up' ? siblings[index - 1] : siblings[index + 1]
  if (!neighbor) return list
  return sortLinks(
    list.map((item) =>
      item.id === target.id
        ? { ...item, position: neighbor.position }
        : item.id === neighbor.id
          ? { ...item, position: target.position }
          : item,
    ),
  )
}

export function HeaderLinksTable({
  initial,
  menuTranslations,
}: {
  initial: HeaderLinkData[]
  menuTranslations: Record<HeaderMenuKey, Record<Locale, string>>
}) {
  const router = useRouter()
  const t = useTranslations('admin.headerLinks')
  const tc = useTranslations('admin.common')
  const tn = useTranslations('nav')
  const locale = useLocale() as Locale
  const [links, setLinks] = useState<HeaderLinkData[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HeaderLinkData | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirm, setConfirm] = useState<HeaderLinkData | null>(null)
  const [, startTransition] = useTransition()

  // Per-locale text wins, then the site catalog, then the stored English label.
  const displayLabel = (link: HeaderLinkData) => {
    const override = link.labels?.[locale]?.trim()
    if (override) return override
    return link.labelKey && isHeaderMenuKey(link.labelKey) && tn.has(link.labelKey)
      ? tn(link.labelKey)
      : link.label
  }

  // The editor starts from the effective text in every language: catalog values
  // for keyed menus, stored overrides for custom menus.
  const formLabelsFor = (link: HeaderLinkData): Record<Locale, string> => {
    const labels = { ...EMPTY_LABELS }
    if (link.labelKey && isHeaderMenuKey(link.labelKey)) {
      const catalog = menuTranslations[link.labelKey] ?? {}
      for (const item of locales) {
        labels[item] =
          link.labels?.[item] ?? catalog[item] ?? (item === 'en' ? link.label : '')
      }
      return labels
    }
    labels.en = link.labels?.en ?? link.label
    for (const item of locales) {
      if (item !== 'en') labels[item] = link.labels?.[item] ?? ''
    }
    return labels
  }

  const parentOptions = sortLinks(links).filter(
    (link) => !link.parentId && link.id !== editing?.id,
  )
  const editingHasChildren = editing
    ? links.some((link) => link.parentId === editing.id)
    : false

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(link: HeaderLinkData) {
    setEditing(link)
    setForm({
      labels: formLabelsFor(link),
      labelKey: link.labelKey ?? '',
      parentId: link.parentId ?? '',
      url: link.url,
      icon: (HEADER_ICONS.includes(link.icon as (typeof HEADER_ICONS)[number])
        ? link.icon
        : HEADER_ICON_DEFAULT) as SiteNavIcon,
      color: link.color ?? '',
      newTab: link.newTab,
    })
    setDialogOpen(true)
  }

  function changeLabelSource(value: string) {
    const labelKey = value === CUSTOM_LABEL ? '' : value
    setForm((current) => ({
      ...current,
      labelKey,
      labels:
        labelKey && isHeaderMenuKey(labelKey)
          ? { ...EMPTY_LABELS, ...menuTranslations[labelKey] }
          : current.labels,
    }))
  }

  function submitForm() {
    const input = {
      label: form.labels.en,
      labels: form.labels,
      labelKey: form.labelKey || undefined,
      parentId: form.parentId || null,
      url: form.url,
      icon: form.icon,
      color: form.color || undefined,
      newTab: form.newTab,
    }
    setBusy(true)
    startTransition(async () => {
      const result = editing
        ? await updateHeaderLink(editing.id, input)
        : await createHeaderLink(input)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLinks((current) =>
        sortLinks(
          editing
            ? current.map((link) => (link.id === result.link.id ? result.link : link))
            : [...current, result.link],
        ),
      )
      setDialogOpen(false)
      toast.success(editing ? t('toasts.updated') : t('toasts.created'))
      router.refresh()
    })
  }

  function toggleEnabled(link: HeaderLinkData, enabled: boolean) {
    setPending(link.id)
    startTransition(async () => {
      const result = await setHeaderLinkEnabled(link.id, enabled)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLinks((current) =>
        current.map((item) => (item.id === link.id ? { ...item, enabled } : item)),
      )
      toast.success(enabled ? t('toasts.enabled') : t('toasts.disabled'))
      router.refresh()
    })
  }

  function move(link: HeaderLinkData, direction: 'up' | 'down') {
    setPending(link.id)
    startTransition(async () => {
      const result = await moveHeaderLink(link.id, direction)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLinks((current) => applyMove(current, link.id, direction))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      const result = await deleteHeaderLink(confirm.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLinks((current) =>
        current.filter((item) => item.id !== confirm.id && item.parentId !== confirm.id),
      )
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  // Top-level menus in order, each followed by its sub-links.
  const sorted = sortLinks(links)
  const renderRows: { link: HeaderLinkData; depth: 0 | 1 }[] = []
  for (const link of sorted.filter((item) => !item.parentId)) {
    renderRows.push({ link, depth: 0 })
    for (const child of sorted.filter((item) => item.parentId === link.id)) {
      renderRows.push({ link: child, depth: 1 })
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground">
          {t('enabledCount', {
            enabled: links.filter((link) => link.enabled).length,
            total: links.length,
          })}
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus />
          {t('newLink')}
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {renderRows.map(({ link, depth }) => {
          const rowBusy = pending === link.id
          const RowIcon = navIcons[link.icon as SiteNavIcon] ?? navIcons[HEADER_ICON_DEFAULT]
          const label = displayLabel(link)
          const siblings = siblingsOf(links, link)
          const siblingIndex = siblings.findIndex((item) => item.id === link.id)
          return (
            <li
              key={link.id}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 sm:px-5',
                depth > 0 && 'ps-10 sm:ps-12',
              )}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40"
                style={link.color ? { color: link.color } : undefined}
                aria-hidden="true"
              >
                <RowIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      !link.enabled && 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </p>
                  {depth > 0 ? <Badge variant="outline">{t('subLinkBadge')}</Badge> : null}
                  {link.builtIn ? (
                    <Badge variant="outline">{t('builtInBadge')}</Badge>
                  ) : link.labelKey || Object.keys(link.labels ?? {}).length > 1 ? (
                    <Badge variant="outline">{t('translatedBadge')}</Badge>
                  ) : null}
                  {!link.enabled ? <Badge variant="secondary">{tc('off')}</Badge> : null}
                  {link.newTab ? <Badge variant="outline">{t('newTabBadge')}</Badge> : null}
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  <span className="truncate">{link.url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </div>

              {rowBusy ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={rowBusy || siblingIndex <= 0}
                  aria-label={t('moveUpAria', { label })}
                  onClick={() => move(link, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={rowBusy || siblingIndex >= siblings.length - 1}
                  aria-label={t('moveDownAria', { label })}
                  onClick={() => move(link, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('editAria', { label })}
                  onClick={() => openEdit(link)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('deleteAria', { label })}
                  onClick={() => setConfirm(link)}
                >
                  <Trash2 />
                </Button>
                <Switch
                  checked={link.enabled}
                  disabled={rowBusy}
                  onCheckedChange={(checked) => toggleEnabled(link, checked)}
                  aria-label={t('enableAria', { label })}
                />
              </div>
            </li>
          )
        })}
        {links.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            {t('empty')}
          </li>
        ) : null}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editTitle') : t('newTitle')}</DialogTitle>
            <DialogDescription>{t('formDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitForm()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="header-link-label-en">{t('labelLabel')}</Label>
              {editing?.builtIn ? null : (
                <Select
                  value={form.labelKey || CUSTOM_LABEL}
                  onValueChange={changeLabelSource}
                >
                  <SelectTrigger className="w-full" aria-label={t('labelSourceLabel')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_LABEL}>{t('customLabelOption')}</SelectItem>
                    {HEADER_MENU_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {tn(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {locales.map((item) => (
                  <div key={item} className="grid gap-1">
                    <Label
                      htmlFor={`header-link-label-${item}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {localeLabels[item]}
                    </Label>
                    <Input
                      id={`header-link-label-${item}`}
                      dir={localeDirection(item)}
                      value={form.labels[item]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          labels: { ...current.labels, [item]: event.target.value },
                        }))
                      }
                      maxLength={HEADER_LINK_LABEL_MAX_LENGTH}
                      placeholder={
                        item === 'en' ? t('labelPlaceholder') : t('translationFallback')
                      }
                      autoFocus={item === 'en' && !form.labelKey && !editing?.builtIn}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {editing?.builtIn
                  ? t('builtInLabelHint')
                  : form.labelKey
                    ? t('translationsKeyedHint')
                    : t('translationsCustomHint')}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="header-link-url">{t('urlLabel')}</Label>
              <Input
                id="header-link-url"
                value={form.url}
                onChange={(event) => setForm((f) => ({ ...f, url: event.target.value }))}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground">{t('urlHint')}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="header-link-parent">{t('parentLabel')}</Label>
              <Select
                value={form.parentId || TOP_LEVEL}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, parentId: value === TOP_LEVEL ? '' : value }))
                }
                disabled={editingHasChildren}
              >
                <SelectTrigger id="header-link-parent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>{t('parentTopLevel')}</SelectItem>
                  {parentOptions.map((link) => (
                    <SelectItem key={link.id} value={link.id}>
                      {displayLabel(link)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editingHasChildren ? t('parentHasChildrenHint') : t('parentHint')}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{t('iconLabel')}</Label>
              <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label={t('iconLabel')}>
                {HEADER_ICONS.map((key) => {
                  const Icon = navIcons[key]
                  const selected = form.icon === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={key}
                      onClick={() => setForm((f) => ({ ...f, icon: key }))}
                      className={cn(
                        'flex size-9 items-center justify-center rounded-md border transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="header-link-color">{t('colorLabel')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="header-link-color"
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : '#d5ff2f'}
                  onChange={(event) => setForm((f) => ({ ...f, color: event.target.value }))}
                  className="h-9 w-14 shrink-0 cursor-pointer p-1"
                />
                <Input
                  value={form.color}
                  onChange={(event) => setForm((f) => ({ ...f, color: event.target.value }))}
                  placeholder="#5182EF"
                  className="max-w-36 font-mono text-xs"
                />
                {form.color ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, color: '' }))}
                  >
                    {t('colorClear')}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('colorDefault')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="header-link-newtab"
                checked={form.newTab}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, newTab: checked }))}
              />
              <Label htmlFor="header-link-newtab" className="text-sm font-normal">
                {t('newTabLabel')}
              </Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('saving') : editing ? tc('save') : t('createLink')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { label: confirm ? displayLabel(confirm) : '' })}
            </DialogDescription>
          </DialogHeader>
          {confirm && links.some((link) => link.parentId === confirm.id) ? (
            <p className="text-sm text-destructive">{t('deleteSubLinksNotice')}</p>
          ) : null}
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
