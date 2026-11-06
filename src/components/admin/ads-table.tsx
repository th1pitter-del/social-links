'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Code2, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Panel } from '@/components/admin/panel'
import {
  createAdUnit,
  deleteAdUnit,
  moveAdUnit,
  setAdUnitEnabled,
  updateAdUnit,
} from '@/lib/actions/admin-ads'
import {
  AD_HTML_MAX_LENGTH,
  AD_LABEL_MAX_LENGTH,
  AD_NAME_MAX_LENGTH,
  AD_PLACEMENTS,
  AD_TYPES,
  type AdUnitData,
} from '@/lib/ads'
import { cn } from 'cn'

type FormState = {
  name: string
  placement: string
  type: string
  label: string
  url: string
  imageUrl: string
  html: string
  newTab: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  placement: 'unlock-top',
  type: 'link',
  label: '',
  url: '',
  imageUrl: '',
  html: '',
  newTab: true,
}

function sortAds(list: AdUnitData[]): AdUnitData[] {
  return [...list].sort(
    (a, b) =>
      a.placement.localeCompare(b.placement) ||
      a.position - b.position ||
      a.name.localeCompare(b.name),
  )
}

/** Swaps the moved ad with its neighbor within the same placement. */
function applyMove(list: AdUnitData[], id: string, direction: 'up' | 'down'): AdUnitData[] {
  const target = list.find((item) => item.id === id)
  if (!target) return list
  const scope = sortAds(list.filter((item) => item.placement === target.placement))
  const index = scope.findIndex((item) => item.id === id)
  const neighbor = direction === 'up' ? scope[index - 1] : scope[index + 1]
  if (!neighbor) return list
  return sortAds(
    list.map((item) =>
      item.id === target.id
        ? { ...item, position: neighbor.position }
        : item.id === neighbor.id
          ? { ...item, position: target.position }
          : item,
    ),
  )
}

export function AdsTable({ initial }: { initial: AdUnitData[] }) {
  const router = useRouter()
  const t = useTranslations('admin.ads')
  const tc = useTranslations('admin.common')
  const uploadT = useTranslations('uploads.errors')
  const [ads, setAds] = useState<AdUnitData[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [placementFilter, setPlacementFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdUnitData | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirm, setConfirm] = useState<AdUnitData | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(
    () => (placementFilter === 'all' ? ads : ads.filter((ad) => ad.placement === placementFilter)),
    [ads, placementFilter],
  )

  const enabledCount = ads.filter((ad) => ad.enabled).length

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(ad: AdUnitData) {
    setEditing(ad)
    setForm({
      name: ad.name,
      placement: ad.placement,
      type: ad.type,
      label: ad.label ?? '',
      url: ad.url ?? '',
      imageUrl: ad.imageUrl ?? '',
      html: ad.html ?? '',
      newTab: ad.newTab,
    })
    setDialogOpen(true)
  }

  function uploadError(data: { error?: string; code?: string; maxMb?: number }) {
    if (data.code && uploadT.has(data.code)) {
      return uploadT(data.code, { maxMb: data.maxMb ?? '' })
    }
    return t('imageUploadFailed')
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const data = (await response.json()) as {
        url?: string
        error?: string
        code?: string
        maxMb?: number
      }
      if (!response.ok || !data.url) {
        toast.error(uploadError(data))
        return
      }
      setForm((current) => ({ ...current, imageUrl: data.url as string }))
      toast.success(t('imageUploadedToast'))
    } catch {
      toast.error(t('imageUploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  function submitForm() {
    const input = {
      name: form.name,
      placement: form.placement,
      type: form.type,
      label: form.label,
      url: form.url,
      imageUrl: form.imageUrl,
      html: form.html,
      newTab: form.newTab,
    }
    setBusy(true)
    startTransition(async () => {
      const result = editing
        ? await updateAdUnit(editing.id, input)
        : await createAdUnit(input)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setAds((current) =>
        sortAds(
          editing
            ? current.map((ad) => (ad.id === result.ad.id ? result.ad : ad))
            : [...current, result.ad],
        ),
      )
      setDialogOpen(false)
      toast.success(editing ? t('toasts.updated') : t('toasts.created'))
      router.refresh()
    })
  }

  function toggleEnabled(ad: AdUnitData, enabled: boolean) {
    setPending(ad.id)
    startTransition(async () => {
      const result = await setAdUnitEnabled(ad.id, enabled)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setAds((current) =>
        current.map((item) => (item.id === ad.id ? { ...item, enabled } : item)),
      )
      toast.success(enabled ? t('toasts.enabled') : t('toasts.disabled'))
      router.refresh()
    })
  }

  function move(ad: AdUnitData, direction: 'up' | 'down') {
    setPending(ad.id)
    startTransition(async () => {
      const result = await moveAdUnit(ad.id, direction)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setAds((current) => applyMove(current, ad.id, direction))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      const result = await deleteAdUnit(confirm.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setAds((current) => current.filter((item) => item.id !== confirm.id))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={placementFilter} onValueChange={setPlacementFilter}>
            <SelectTrigger className="w-56" aria-label={t('filterPlacement')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPlacements')}</SelectItem>
              {AD_PLACEMENTS.map((placement) => (
                <SelectItem key={placement} value={placement}>
                  {t(`placements.${placement}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('enabledCount', { enabled: enabledCount, total: ads.length })}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus />
          {t('newAd')}
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {filtered.map((ad) => {
          const scope = sortAds(ads.filter((item) => item.placement === ad.placement))
          const index = scope.findIndex((item) => item.id === ad.id)
          const rowBusy = pending === ad.id
          return (
            <li
              key={ad.id}
              className="group flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              {ad.type === 'banner' && ad.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-10 w-16 shrink-0 rounded-md border object-contain"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {ad.type === 'html' ? <Code2 className="size-4" /> : <Plus className="size-4" />}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      !ad.enabled && 'text-muted-foreground',
                    )}
                  >
                    {ad.name}
                  </p>
                  <Badge variant="secondary">{t(`placements.${ad.placement}`)}</Badge>
                  <Badge variant="outline">{t(`types.${ad.type}`)}</Badge>
                  {!ad.enabled ? <Badge variant="secondary">{tc('off')}</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {ad.type === 'html'
                    ? t('htmlPreview')
                    : ad.type === 'link'
                      ? ad.label || ad.url
                      : ad.url}
                </p>
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
                  aria-label={t('moveUpAria', { name: ad.name })}
                  onClick={() => move(ad, 'up')}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={rowBusy || index >= scope.length - 1}
                  aria-label={t('moveDownAria', { name: ad.name })}
                  onClick={() => move(ad, 'down')}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('editAria', { name: ad.name })}
                  onClick={() => openEdit(ad)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={t('deleteAria', { name: ad.name })}
                  onClick={() => setConfirm(ad)}
                >
                  <Trash2 />
                </Button>
                <Switch
                  checked={ad.enabled}
                  disabled={rowBusy}
                  onCheckedChange={(checked) => toggleEnabled(ad, checked)}
                  aria-label={t('enableAria', { name: ad.name })}
                />
              </div>
            </li>
          )
        })}
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            {t('empty')}
          </li>
        ) : null}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
              <Label htmlFor="ad-name">{t('nameLabel')}</Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                maxLength={AD_NAME_MAX_LENGTH}
                placeholder={t('namePlaceholder')}
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('placementLabel')}</Label>
                <Select
                  value={form.placement}
                  onValueChange={(value) => setForm((f) => ({ ...f, placement: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_PLACEMENTS.map((placement) => (
                      <SelectItem key={placement} value={placement}>
                        {t(`placements.${placement}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('typeLabel')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'banner' || form.type === 'link' ? (
              <div className="grid gap-2">
                <Label htmlFor="ad-url">{t('urlLabel')}</Label>
                <Input
                  id="ad-url"
                  value={form.url}
                  onChange={(event) => setForm((f) => ({ ...f, url: event.target.value }))}
                  placeholder="https://example.com/offer"
                />
                <p className="text-xs text-muted-foreground">{t('urlHint')}</p>
              </div>
            ) : null}

            {form.type === 'banner' ? (
              <div className="grid gap-2">
                <Label htmlFor="ad-image">{t('imageUrlLabel')}</Label>
                <div className="flex items-center gap-2">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-10 w-16 shrink-0 rounded-md border object-contain"
                    />
                  ) : null}
                  <Input
                    id="ad-image"
                    value={form.imageUrl}
                    onChange={(event) => setForm((f) => ({ ...f, imageUrl: event.target.value }))}
                    placeholder="https://example.com/banner.png"
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadImage(file)
                      event.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    aria-label={t('uploadImage')}
                    title={t('uploadImage')}
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}

            {form.type === 'banner' || form.type === 'link' ? (
              <div className="grid gap-2">
                <Label htmlFor="ad-label">{t('labelLabel')}</Label>
                <Input
                  id="ad-label"
                  value={form.label}
                  onChange={(event) => setForm((f) => ({ ...f, label: event.target.value }))}
                  maxLength={AD_LABEL_MAX_LENGTH}
                  placeholder={t('labelPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('labelHint')}</p>
              </div>
            ) : null}

            {form.type === 'html' ? (
              <div className="grid gap-2">
                <Label htmlFor="ad-html">{t('htmlLabel')}</Label>
                <Textarea
                  id="ad-html"
                  rows={6}
                  value={form.html}
                  onChange={(event) => setForm((f) => ({ ...f, html: event.target.value }))}
                  maxLength={AD_HTML_MAX_LENGTH}
                  placeholder={t('htmlPlaceholder')}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">{t('htmlHint')}</p>
              </div>
            ) : null}

            {form.type === 'banner' || form.type === 'link' ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="ad-newtab"
                  checked={form.newTab}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, newTab: checked }))}
                />
                <Label htmlFor="ad-newtab" className="text-sm font-normal">
                  {t('newTabLabel')}
                </Label>
              </div>
            ) : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('saving') : editing ? tc('save') : t('createAd')}
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
              {t('deleteDescription', { name: confirm?.name ?? '' })}
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
