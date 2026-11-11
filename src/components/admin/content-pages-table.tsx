'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ExternalLink, FilePlus2, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Panel } from '@/components/admin/panel'
import { StatusPill } from '@/components/status-pill'
import { Timestamp } from '@/components/timestamp'
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
import { Switch } from '@/components/ui/switch'
import { customPageHref, type CustomPageData } from '@/lib/custom-content'
import { deleteCustomPage, setCustomPageStatus } from '@/lib/actions/admin-content'

export function ContentPagesTable({ initial }: { initial: CustomPageData[] }) {
  const t = useTranslations('admin.contentPages')
  const tc = useTranslations('admin.common')
  const [pages, setPages] = useState(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<CustomPageData | null>(null)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  function togglePublished(page: CustomPageData, published: boolean) {
    setPending(page.id)
    startTransition(async () => {
      const status = published ? 'PUBLISHED' : 'DRAFT'
      const result = await setCustomPageStatus(page.id, status)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPages((current) =>
        current.map((item) => (item.id === page.id ? { ...item, status } : item)),
      )
      toast.success(published ? t('toasts.published') : t('toasts.unpublished'))
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      const result = await deleteCustomPage(confirm.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setPages((current) => current.filter((item) => item.id !== confirm.id))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
    })
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground">
          {t('count', { count: pages.length, published: pages.filter((p) => p.status === 'PUBLISHED').length })}
        </p>
        <Button type="button" size="sm" asChild>
          <Link href="/admin/content-pages/new">
            <FilePlus2 />
            {t('newPage')}
          </Link>
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {pages.map((page) => {
          const rowBusy = pending === page.id
          return (
            <li key={page.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/content-pages/${page.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {page.title}
                  </Link>
                  <StatusPill
                    status={page.status}
                    label={page.status === 'PUBLISHED' ? t('published') : t('draft')}
                  />
                  {page.menuItemCount > 0 ? (
                    <Badge variant="outline">
                      {t('menuItems', { count: page.menuItemCount })}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">/dashboard/pages/{page.slug}</span>
                  <span>
                    {t('updated')} <Timestamp value={new Date(page.updatedAt)} />
                  </span>
                </div>
              </div>

              {rowBusy ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}

              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('previewAria', { title: page.title })}
                  title={t('preview')}
                  asChild
                >
                  <a href={customPageHref(page.slug)} target="_blank" rel="noreferrer">
                    <ExternalLink />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('editAria', { title: page.title })}
                  asChild
                >
                  <Link href={`/admin/content-pages/${page.id}`}>
                    <Pencil />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('deleteAria', { title: page.title })}
                  onClick={() => setConfirm(page)}
                >
                  <Trash2 />
                </Button>
                <Switch
                  checked={page.status === 'PUBLISHED'}
                  disabled={rowBusy}
                  onCheckedChange={(checked) => togglePublished(page, checked)}
                  aria-label={t('publishAria', { title: page.title })}
                />
              </div>
            </li>
          )
        })}
        {pages.length === 0 ? (
          <li className="px-4 py-10 text-center sm:px-5">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/admin/content-pages/new">
                <FilePlus2 />
                {t('newPage')}
              </Link>
            </Button>
          </li>
        ) : null}
      </ul>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { title: confirm?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          {confirm && confirm.menuItemCount > 0 ? (
            <p className="text-sm text-destructive">
              {t('deleteInUse', { count: confirm.menuItemCount })}
            </p>
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
