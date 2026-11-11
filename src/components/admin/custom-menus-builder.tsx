'use client'

import { Fragment, useState, useTransition, type DragEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from 'cn'
import { PageHeader } from '@/components/admin/page-header'
import { Panel } from '@/components/admin/panel'
import { navIcons, type SiteNavIcon } from '@/components/site-nav-icons'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  CUSTOM_MENU_ICON_DEFAULT,
  CUSTOM_MENU_ICONS,
  CUSTOM_MENU_TITLE_MAX_LENGTH,
  CUSTOM_PAGE_TITLE_MAX_LENGTH,
  isCustomMenuIcon,
  menuLabel,
  type CustomMenuIcon,
  type CustomMenuItemData,
  type CustomMenuOrderUpdate,
  type CustomPageData,
} from '@/lib/custom-content'
import {
  createCustomMenuItem,
  deleteCustomMenuItem,
  reorderCustomMenuItems,
  setCustomMenuItemActive,
  updateCustomMenuItem,
} from '@/lib/actions/admin-content'
import { locales, localeDirection, localeLabels, type Locale } from '@/i18n/config'

const TOP_LEVEL = '__top'
const NO_PAGE = '__none'
const NEW_PAGE = '__new'

type MenuForm = {
  titles: Record<Locale, string>
  icon: CustomMenuIcon
  parentId: string
  pageValue: string
  newPageTitle: string
  isActive: boolean
}

const EMPTY_TITLES = Object.fromEntries(locales.map((locale) => [locale, ''])) as Record<
  Locale,
  string
>

const EMPTY_FORM: MenuForm = {
  titles: EMPTY_TITLES,
  icon: CUSTOM_MENU_ICON_DEFAULT,
  parentId: '',
  pageValue: NO_PAGE,
  newPageTitle: '',
  isActive: true,
}

function sortItems(list: CustomMenuItemData[]): CustomMenuItemData[] {
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  )
}

function childrenOf(list: CustomMenuItemData[], parentId: string): CustomMenuItemData[] {
  return sortItems(list.filter((item) => item.parentId === parentId))
}

function hasChildren(list: CustomMenuItemData[], id: string): boolean {
  return list.some((item) => item.parentId === id)
}

/** Renumbers every level so persisted orders stay compact integers. */
function normalizeOrder(list: CustomMenuItemData[]): CustomMenuItemData[] {
  const next = list.map((item) => ({ ...item }))
  const tops = sortItems(next.filter((item) => !item.parentId))
  tops.forEach((item, index) => {
    item.sortOrder = index
  })
  for (const top of tops) {
    const children = sortItems(next.filter((item) => item.parentId === top.id))
    children.forEach((item, index) => {
      item.sortOrder = index
    })
  }
  return next
}

export function CustomMenusBuilder({
  initial,
  pages,
}: {
  initial: CustomMenuItemData[]
  pages: CustomPageData[]
}) {
  const t = useTranslations('admin.customMenus')
  const tc = useTranslations('admin.common')
  const td = useTranslations('dashboardShell')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [items, setItems] = useState(initial)
  // After a server refresh the prop carries the new truth; adopt it during
  // render so the optimistic rows never disagree with the database for long.
  const [syncedInitial, setSyncedInitial] = useState(initial)
  if (initial !== syncedInitial) {
    setSyncedInitial(initial)
    setItems(initial)
  }
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomMenuItemData | null>(null)
  const [form, setForm] = useState<MenuForm>(EMPTY_FORM)
  const [confirm, setConfirm] = useState<CustomMenuItemData | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(
    null,
  )
  const [topLevelHint, setTopLevelHint] = useState(false)
  const [, startTransition] = useTransition()

  const tops = sortItems(items.filter((item) => !item.parentId))
  const iconFor = (key: string) =>
    navIcons[(isCustomMenuIcon(key) ? key : CUSTOM_MENU_ICON_DEFAULT) as SiteNavIcon] ??
    navIcons[CUSTOM_MENU_ICON_DEFAULT]

  const pagesById = new Map(pages.map((page) => [page.id, page]))
  const visibleTopCount = tops.filter(
    (top) =>
      top.isActive &&
      (top.page?.status === 'PUBLISHED' ||
        childrenOf(items, top.id).some(
          (child) => child.isActive && child.page?.status === 'PUBLISHED',
        )),
  ).length

  function openCreate(parentId?: string) {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      titles: { ...EMPTY_TITLES },
      parentId: parentId ?? '',
      pageValue: parentId ? NEW_PAGE : NO_PAGE,
    })
    setDialogOpen(true)
  }

  function openEdit(item: CustomMenuItemData) {
    setEditing(item)
    const titles = { ...EMPTY_TITLES }
    titles.en = item.title
    for (const item2 of locales) {
      if (item2 !== 'en') titles[item2] = item.labels?.[item2] ?? ''
    }
    setForm({
      titles,
      icon: (isCustomMenuIcon(item.icon) ? item.icon : CUSTOM_MENU_ICON_DEFAULT) as CustomMenuIcon,
      parentId: item.parentId ?? '',
      pageValue: item.pageId ?? NO_PAGE,
      newPageTitle: '',
      isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  function submitForm() {
    const title = form.titles.en.trim()
    if (!title) {
      toast.error(t('titleRequired'))
      return
    }
    const labels = Object.fromEntries(
      locales
        .filter((locale2) => locale2 !== 'en')
        .map((locale2) => [locale2, form.titles[locale2].trim()])
        .filter(([, value]) => value),
    )
    const pageId = form.pageValue === NEW_PAGE || form.pageValue === NO_PAGE ? null : form.pageValue
    const createPageTitle =
      form.pageValue === NEW_PAGE ? form.newPageTitle.trim() || title : undefined

    const input = {
      title,
      labels,
      icon: form.icon,
      parentId: form.parentId || null,
      pageId,
      isActive: form.isActive,
      createPageTitle,
    }

    setBusy(true)
    startTransition(async () => {
      const result = editing
        ? await updateCustomMenuItem(editing.id, input)
        : await createCustomMenuItem(input)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setItems((current) =>
        sortItems(
          editing
            ? current.map((item) => (item.id === result.item.id ? result.item : item))
            : [...current, result.item],
        ),
      )
      setDialogOpen(false)
      toast.success(editing ? t('toasts.updated') : t('toasts.created'))
      router.refresh()
    })
  }

  function toggleActive(item: CustomMenuItemData, isActive: boolean) {
    setPending(item.id)
    startTransition(async () => {
      const result = await setCustomMenuItemActive(item.id, isActive)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, isActive } : row)),
      )
      toast.success(isActive ? t('toasts.enabled') : t('toasts.disabled'))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      const result = await deleteCustomMenuItem(confirm.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const removed = new Set([confirm.id, ...items.filter((i) => i.parentId === confirm.id).map((i) => i.id)])
      setItems((current) => current.filter((item) => !removed.has(item.id)))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  function persistOrder(next: CustomMenuItemData[]) {
    setItems(next)
    startTransition(async () => {
      const updates: CustomMenuOrderUpdate[] = next.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        sortOrder: item.sortOrder,
      }))
      const result = await reorderCustomMenuItems(updates)
      if (!result.ok) {
        toast.error(result.error)
        router.refresh()
      }
    })
  }

  function move(item: CustomMenuItemData, direction: 'up' | 'down') {
    const siblings = sortItems(items.filter((row) => row.parentId === item.parentId))
    const index = siblings.findIndex((row) => row.id === item.id)
    const neighbor = direction === 'up' ? siblings[index - 1] : siblings[index + 1]
    if (!neighbor) return
    const midpoint = direction === 'up' ? neighbor.sortOrder - 0.5 : neighbor.sortOrder + 0.5
    persistOrder(
      normalizeOrder(
        items.map((row) => (row.id === item.id ? { ...row, sortOrder: midpoint } : row)),
      ),
    )
  }

  function dragOverRow(event: DragEvent<HTMLLIElement>, target: CustomMenuItemData) {
    if (!dragId || dragId === target.id) return
    event.preventDefault()
    const dragged = items.find((item) => item.id === dragId)
    if (!dragged) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nearEdge = 10
    if (
      !target.parentId &&
      dragged.parentId !== null &&
      event.clientY > rect.top + nearEdge &&
      event.clientY < rect.bottom - nearEdge
    ) {
      setDropHint({ id: target.id, position: 'inside' })
      return
    }
    const after = event.clientY > rect.top + rect.height / 2
    setDropHint({ id: target.id, position: after ? 'after' : 'before' })
  }

  function dropOnRow(event: DragEvent<HTMLLIElement>, target: CustomMenuItemData) {
    event.preventDefault()
    if (!dragId || !dropHint) return
    const dragged = items.find((item) => item.id === dragId)
    setDragId(null)
    setDropHint(null)
    if (!dragged || dragged.id === target.id) return

    if (dropHint.position === 'inside') {
      if (target.parentId || hasChildren(items, dragged.id)) {
        toast.error(t('cannotNestParent'))
        return
      }
      const maxOrder = childrenOf(items, target.id).reduce(
        (max, child) => Math.max(max, child.sortOrder),
        -1,
      )
      persistOrder(
        normalizeOrder(
          items.map((row) =>
            row.id === dragged.id
              ? { ...row, parentId: target.id, sortOrder: maxOrder + 1 }
              : row,
          ),
        ),
      )
      return
    }

    const destinationParent = target.parentId
    if (destinationParent && hasChildren(items, dragged.id)) {
      toast.error(t('cannotNestParent'))
      return
    }
    const midpoint =
      dropHint.position === 'after' ? target.sortOrder + 0.5 : target.sortOrder - 0.5
    persistOrder(
      normalizeOrder(
        items.map((row) =>
          row.id === dragged.id
            ? { ...row, parentId: destinationParent, sortOrder: midpoint }
            : row,
        ),
      ),
    )
  }

  function dropAtTopLevel(event: DragEvent<HTMLLIElement>) {
    event.preventDefault()
    setTopLevelHint(false)
    if (!dragId) return
    const dragged = items.find((item) => item.id === dragId)
    setDragId(null)
    setDropHint(null)
    if (!dragged) return
    const lastTop = tops.reduce((max, top) => Math.max(max, top.sortOrder), -1)
    persistOrder(
      normalizeOrder(
        items.map((row) =>
          row.id === dragged.id ? { ...row, parentId: null, sortOrder: lastTop + 0.5 } : row,
        ),
      ),
    )
  }

  function renderRow(item: CustomMenuItemData, depth: 0 | 1) {
    const RowIcon = iconFor(item.icon)
    const label = menuLabel(item, locale)
    const childRows = depth === 0 ? childrenOf(items, item.id) : []
    const rowBusy = pending === item.id
    const page = item.pageId ? pagesById.get(item.pageId) ?? item.page : null
    const hint = dropHint?.id === item.id ? dropHint.position : null

    return (
      <li
        key={item.id}
        draggable
        onDragStart={(event) => {
          setDragId(item.id)
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', item.id)
        }}
        onDragEnd={() => {
          setDragId(null)
          setDropHint(null)
          setTopLevelHint(false)
        }}
        onDragOver={(event) => dragOverRow(event, item)}
        onDrop={(event) => dropOnRow(event, item)}
        className={cn(
          'group relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:px-5',
          depth > 0 && 'ps-10 sm:ps-14',
          dragId === item.id && 'opacity-50',
          !item.isActive && 'bg-muted/20',
          hint === 'inside' && 'bg-primary/10 ring-1 ring-primary/40 ring-inset',
        )}
      >
        {hint === 'before' ? (
          <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-0.5 bg-primary" />
        ) : null}
        {hint === 'after' ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 bottom-0 h-0.5 bg-primary"
          />
        ) : null}

        <span
          draggable
          onDragStart={(event) => {
            setDragId(item.id)
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', item.id)
          }}
          aria-label={t('dragAria', { label })}
          title={t('dragHint')}
          className="hidden cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground sm:block"
        >
          <GripVertical className="size-4" />
        </span>

        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40',
            !item.isActive && 'text-muted-foreground',
          )}
          aria-hidden="true"
        >
          <RowIcon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'truncate text-sm font-medium',
                !item.isActive && 'text-muted-foreground',
              )}
            >
              {label}
            </p>
            {depth > 0 ? <Badge variant="outline">{t('submenuBadge')}</Badge> : null}
            {depth === 0 && childRows.length > 0 ? (
              <Badge variant="outline">{t('groupBadge', { count: childRows.length })}</Badge>
            ) : null}
            {!item.isActive ? <Badge variant="secondary">{tc('off')}</Badge> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {page ? (
              <Link
                href={`/admin/content-pages/${page.id}`}
                className="inline-flex max-w-full items-center gap-1 truncate hover:text-foreground hover:underline"
              >
                <span className="truncate">{page.title}</span>
                <ExternalLink className="size-3 shrink-0" />
              </Link>
            ) : (
              <span>{t('noPage')}</span>
            )}
            {page?.status === 'DRAFT' ? (
              <Badge variant="outline">{t('pageDraft')}</Badge>
            ) : null}
          </div>
        </div>

        {rowBusy ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}

        <div className="ms-auto flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="hidden sm:inline-flex"
            aria-label={t('moveUpAria', { label })}
            disabled={rowBusy}
            onClick={() => move(item, 'up')}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="hidden sm:inline-flex"
            aria-label={t('moveDownAria', { label })}
            disabled={rowBusy}
            onClick={() => move(item, 'down')}
          >
            <ArrowDown />
          </Button>
          {depth === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('addChildAria', { label })}
              title={t('addChild')}
              onClick={() => openCreate(item.id)}
            >
              <Plus />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('editAria', { label })}
            onClick={() => openEdit(item)}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('deleteAria', { label })}
            onClick={() => setConfirm(item)}
          >
            <Trash2 />
          </Button>
          <Switch
            checked={item.isActive}
            disabled={rowBusy}
            onCheckedChange={(checked) => toggleActive(item, checked)}
            aria-label={t('activeAria', { label })}
          />
        </div>
      </li>
    )
  }

  const parentOptions = tops.filter((top) => top.id !== editing?.id)
  const editingHasChildren = editing ? hasChildren(items, editing.id) : false

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        icon={Layers}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/content-pages">{t('managePages')}</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye />
              {t('preview')}
            </Button>
            <Button type="button" size="sm" onClick={() => openCreate()}>
              <Plus />
              {t('newMenu')}
            </Button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-xs text-muted-foreground">
            {t('enabledCount', { enabled: visibleTopCount, total: tops.length })}
          </p>
          <p className="text-xs text-muted-foreground">{t('dragHint')}</p>
        </div>

        <ul className="divide-y divide-border">
          {tops.map((top) => (
            <Fragment key={top.id}>
              {renderRow(top, 0)}
              {childrenOf(items, top.id).map((child) => renderRow(child, 1))}
            </Fragment>
          ))}
          {items.length === 0 ? (
            <li className="px-4 py-10 text-center sm:px-5">
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => openCreate()}>
                <Plus />
                {t('newMenu')}
              </Button>
            </li>
          ) : null}
          {dragId ? (
            <li
              onDragOver={(event) => {
                event.preventDefault()
                setTopLevelHint(true)
              }}
              onDragLeave={() => setTopLevelHint(false)}
              onDrop={dropAtTopLevel}
              className={cn(
                'border-t border-dashed border-border px-4 py-3 text-center text-xs text-muted-foreground sm:px-5',
                topLevelHint && 'bg-primary/10 text-foreground',
              )}
            >
              {t('dropTopLevel')}
            </li>
          ) : null}
        </ul>
      </Panel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
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
              <Label htmlFor="custom-menu-title-en">{t('titleLabel')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {locales.map((locale2) => (
                  <div key={locale2} className="grid gap-1">
                    <Label
                      htmlFor={`custom-menu-title-${locale2}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {localeLabels[locale2]}
                    </Label>
                    <Input
                      id={`custom-menu-title-${locale2}`}
                      dir={localeDirection(locale2)}
                      value={form.titles[locale2]}
                      maxLength={CUSTOM_MENU_TITLE_MAX_LENGTH}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          titles: { ...current.titles, [locale2]: event.target.value },
                        }))
                      }
                      placeholder={locale2 === 'en' ? t('titlePlaceholder') : t('translationFallback')}
                      autoFocus={locale2 === 'en'}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('translationsHint')}</p>
            </div>

            <div className="grid gap-2">
              <Label>{t('iconLabel')}</Label>
              <div className="grid grid-cols-10 gap-1.5" role="radiogroup" aria-label={t('iconLabel')}>
                {CUSTOM_MENU_ICONS.map((key) => {
                  const Icon = navIcons[key]
                  const selected = form.icon === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={key}
                      onClick={() => setForm((current) => ({ ...current, icon: key }))}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-md border transition-colors',
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

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="custom-menu-parent">{t('parentLabel')}</Label>
                <Select
                  value={form.parentId || TOP_LEVEL}
                  disabled={editingHasChildren}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      parentId: value === TOP_LEVEL ? '' : value,
                      pageValue:
                        value !== TOP_LEVEL && current.pageValue === NO_PAGE
                          ? NEW_PAGE
                          : current.pageValue,
                    }))
                  }
                >
                  <SelectTrigger id="custom-menu-parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TOP_LEVEL}>{t('parentTopLevel')}</SelectItem>
                    {parentOptions.map((top) => (
                      <SelectItem key={top.id} value={top.id}>
                        {menuLabel(top, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {editingHasChildren ? t('parentHasChildrenHint') : t('parentHint')}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="custom-menu-page">{t('pageLabel')}</Label>
                <Select
                  value={form.pageValue}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, pageValue: value }))
                  }
                >
                  <SelectTrigger id="custom-menu-page" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {form.parentId ? null : (
                      <SelectItem value={NO_PAGE}>{t('pageNone')}</SelectItem>
                    )}
                    <SelectItem value={NEW_PAGE}>{t('pageNew')}</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                        {page.status === 'DRAFT' ? ` — ${t('pageDraft')}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.parentId ? t('pageChildHint') : t('pageGroupHint')}
                </p>
              </div>
            </div>

            {form.pageValue === NEW_PAGE ? (
              <div className="grid gap-1.5 rounded-lg border border-dashed border-border p-3">
                <Label htmlFor="custom-menu-new-page">{t('newPageTitleLabel')}</Label>
                <Input
                  id="custom-menu-new-page"
                  value={form.newPageTitle}
                  maxLength={CUSTOM_PAGE_TITLE_MAX_LENGTH}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, newPageTitle: event.target.value }))
                  }
                  placeholder={form.titles.en || t('titlePlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('newPageHint')}</p>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Switch
                id="custom-menu-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
              />
              <Label htmlFor="custom-menu-active" className="text-sm font-normal">
                {t('activeLabel')}
              </Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('saving') : editing ? tc('save') : t('createMenu')}
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
              {t('deleteDescription', { label: confirm ? menuLabel(confirm, locale) : '' })}
            </DialogDescription>
          </DialogHeader>
          {confirm && hasChildren(items, confirm.id) ? (
            <p className="text-sm text-destructive">{t('deleteChildrenNotice')}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t('deletePageKept')}</p>
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('previewTitle')}</DialogTitle>
            <DialogDescription>{t('previewDescription')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-sidebar p-3 text-sidebar-foreground">
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
              {td('customPagesGroup')}
            </p>
            {tops.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t('previewEmpty')}</p>
            ) : (
              <ul className="space-y-0.5">
                {tops.map((top) => {
                  const TopIcon = iconFor(top.icon)
                  const children = childrenOf(items, top.id)
                  const childrenVisible = children.filter(
                    (child) => child.isActive && child.page?.status === 'PUBLISHED',
                  )
                  const topVisible =
                    top.isActive &&
                    (top.page?.status === 'PUBLISHED' || childrenVisible.length > 0)
                  const topIsGroup = children.length > 0 && !top.page
                  return (
                    <li key={top.id}>
                      <span
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                          topVisible
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/40 line-through',
                        )}
                      >
                        <TopIcon className="size-4 shrink-0" />
                        <span className="truncate">{menuLabel(top, locale)}</span>
                        {topIsGroup ? (
                          <ChevronDown className="ms-auto size-3.5 shrink-0" />
                        ) : null}
                        {!topVisible ? (
                          <Badge variant="outline" className="ms-auto">
                            {t('previewHidden')}
                          </Badge>
                        ) : null}
                      </span>
                      {children.length > 0 ? (
                        <ul className="space-y-0.5">
                          {children.map((child) => {
                            const ChildIcon = iconFor(child.icon)
                            const visible = child.isActive && child.page?.status === 'PUBLISHED'
                            return (
                              <li key={child.id}>
                                <span
                                  className={cn(
                                    'flex items-center gap-2.5 rounded-lg ps-9 pe-3 py-1.5 text-sm',
                                    visible
                                      ? 'text-muted-foreground'
                                      : 'text-muted-foreground/40 line-through',
                                  )}
                                >
                                  <ChildIcon className="size-3.5 shrink-0" />
                                  <span className="truncate">{menuLabel(child, locale)}</span>
                                  {!visible ? (
                                    <Badge variant="outline" className="ms-auto">
                                      {t('previewHidden')}
                                    </Badge>
                                  ) : null}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChevronRight className="size-3.5 shrink-0" />
            {t('previewNote')}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {tc('cancel')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
