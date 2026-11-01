'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { Panel } from '@/components/admin/panel'
import {
  createHeaderLink,
  deleteHeaderLink,
  moveHeaderLink,
  setHeaderLinkEnabled,
  updateHeaderLink,
} from '@/lib/actions/admin-ads'
import { HEADER_LINK_LABEL_MAX_LENGTH, type HeaderLinkData } from '@/lib/ads'
import { cn } from 'cn'

type FormState = { label: string; url: string; newTab: boolean }

const EMPTY_FORM: FormState = { label: '', url: '', newTab: true }

function sortLinks(list: HeaderLinkData[]): HeaderLinkData[] {
  return [...list].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
}

function applyMove(list: HeaderLinkData[], id: string, direction: 'up' | 'down'): HeaderLinkData[] {
  const sorted = sortLinks(list)
  const index = sorted.findIndex((item) => item.id === id)
  const target = sorted[index]
  const neighbor = direction === 'up' ? sorted[index - 1] : sorted[index + 1]
  if (!target || !neighbor) return list
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

export function HeaderLinksTable({ initial }: { initial: HeaderLinkData[] }) {
  const router = useRouter()
  const t = useTranslations('admin.headerLinks')
  const tc = useTranslations('admin.common')
  const [links, setLinks] = useState<HeaderLinkData[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HeaderLinkData | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirm, setConfirm] = useState<HeaderLinkData | null>(null)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(link: HeaderLinkData) {
    setEditing(link)
    setForm({ label: link.label, url: link.url, newTab: link.newTab })
    setDialogOpen(true)
  }

  function submitForm() {
    const input = { label: form.label, url: form.url, newTab: form.newTab }
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
      setLinks((current) => current.filter((item) => item.id !== confirm.id))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
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
        {links.map((link, index) => {
          const rowBusy = pending === link.id
          return (
            <li key={link.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      !link.enabled && 'text-muted-foreground',
                    )}
                  >
                    {link.label}
                  </p>
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
                  disabled={rowBusy || index <= 0}
                  aria-label={t('moveUpAria', { label: link.label })}
                  onClick={() => move(link, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={rowBusy || index >= links.length - 1}
                  aria-label={t('moveDownAria', { label: link.label })}
                  onClick={() => move(link, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('editAria', { label: link.label })}
                  onClick={() => openEdit(link)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('deleteAria', { label: link.label })}
                  onClick={() => setConfirm(link)}
                >
                  <Trash2 />
                </Button>
                <Switch
                  checked={link.enabled}
                  disabled={rowBusy}
                  onCheckedChange={(checked) => toggleEnabled(link, checked)}
                  aria-label={t('enableAria', { label: link.label })}
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
              <Label htmlFor="header-link-label">{t('labelLabel')}</Label>
              <Input
                id="header-link-label"
                value={form.label}
                onChange={(event) => setForm((f) => ({ ...f, label: event.target.value }))}
                maxLength={HEADER_LINK_LABEL_MAX_LENGTH}
                placeholder={t('labelPlaceholder')}
                autoFocus
              />
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
