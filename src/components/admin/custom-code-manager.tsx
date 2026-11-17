'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ArrowDown,
  Braces,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Panel, PanelHeader } from '@/components/admin/panel'
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
import { Textarea } from '@/components/ui/textarea'
import {
  createCustomCode,
  deleteCustomCode,
  importLegacyCustomCodes,
  moveCustomCode,
  setCustomCodeEnabled,
  updateCustomCode,
} from '@/lib/actions/admin-custom-code'
import {
  CUSTOM_CODE_MAX_LENGTH,
  CUSTOM_CODE_NAME_MAX_LENGTH,
  CUSTOM_CODE_SLOTS,
  type CustomCodeData,
  type CustomCodeSlot,
} from '@/lib/custom-code'
import { cn } from 'cn'

type FormState = {
  name: string
  slot: CustomCodeSlot
  code: string
  enabled: boolean
}

const SLOT_ICONS = {
  header: ArrowUpToLine,
  footer: ArrowDownToLine,
} as const

function sortCodes(list: CustomCodeData[]): CustomCodeData[] {
  return [...list].sort(
    (a, b) =>
      a.slot.localeCompare(b.slot) || a.position - b.position || a.name.localeCompare(b.name),
  )
}

/** Swaps the moved snippet with its neighbor within the same slot. */
function applyMove(list: CustomCodeData[], id: string, direction: 'up' | 'down'): CustomCodeData[] {
  const target = list.find((item) => item.id === id)
  if (!target) return list
  const scope = sortCodes(list.filter((item) => item.slot === target.slot))
  const index = scope.findIndex((item) => item.id === id)
  const neighbor = direction === 'up' ? scope[index - 1] : scope[index + 1]
  if (!neighbor) return list
  return sortCodes(
    list.map((item) =>
      item.id === target.id
        ? { ...item, position: neighbor.position }
        : item.id === neighbor.id
          ? { ...item, position: target.position }
          : item,
    ),
  )
}

function firstLine(code: string) {
  const line = code.split('\n').find((part) => part.trim()) ?? ''
  return line.trim().slice(0, 120)
}

export function CustomCodeManager({
  initial,
  legacy,
}: {
  initial: CustomCodeData[]
  legacy: Record<CustomCodeSlot, string>
}) {
  const router = useRouter()
  const t = useTranslations('admin.customCode')
  const tc = useTranslations('admin.common')
  const [codes, setCodes] = useState<CustomCodeData[]>(initial)
  const [pending, setPending] = useState<string | null>(null)
  const [importing, setImporting] = useState<CustomCodeSlot | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomCodeData | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    slot: 'header',
    code: '',
    enabled: true,
  })
  const [confirm, setConfirm] = useState<CustomCodeData | null>(null)
  const [, startTransition] = useTransition()

  function openCreate(slot: CustomCodeSlot) {
    setEditing(null)
    setForm({ name: '', slot, code: '', enabled: true })
    setDialogOpen(true)
  }

  function openEdit(code: CustomCodeData) {
    setEditing(code)
    setForm({ name: code.name, slot: code.slot, code: code.code, enabled: code.enabled })
    setDialogOpen(true)
  }

  function submitForm() {
    const input = {
      name: form.name,
      slot: form.slot,
      code: form.code,
      enabled: form.enabled,
    }
    setBusy(true)
    startTransition(async () => {
      const result = editing
        ? await updateCustomCode(editing.id, input)
        : await createCustomCode(input)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setCodes((current) =>
        sortCodes(
          editing
            ? current.map((item) => (item.id === result.code.id ? result.code : item))
            : [...current, result.code],
        ),
      )
      setDialogOpen(false)
      toast.success(editing ? t('toasts.updated') : t('toasts.created'))
      router.refresh()
    })
  }

  function toggleEnabled(code: CustomCodeData, enabled: boolean) {
    setPending(code.id)
    startTransition(async () => {
      const result = await setCustomCodeEnabled(code.id, enabled)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setCodes((current) =>
        current.map((item) => (item.id === code.id ? { ...item, enabled } : item)),
      )
      toast.success(enabled ? t('toasts.enabled') : t('toasts.disabled'))
      router.refresh()
    })
  }

  function move(code: CustomCodeData, direction: 'up' | 'down') {
    setPending(code.id)
    startTransition(async () => {
      const result = await moveCustomCode(code.id, direction)
      setPending(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setCodes((current) => applyMove(current, code.id, direction))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    startTransition(async () => {
      const result = await deleteCustomCode(confirm.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setCodes((current) => current.filter((item) => item.id !== confirm.id))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  function importLegacy(slot: CustomCodeSlot) {
    setImporting(slot)
    startTransition(async () => {
      const result = await importLegacyCustomCodes(slot)
      setImporting(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.code) {
        setCodes((current) => sortCodes([...current, result.code as CustomCodeData]))
      }
      toast.success(t('toasts.imported'))
      router.refresh()
    })
  }

  return (
    <section className="space-y-6">
      {CUSTOM_CODE_SLOTS.map((slot) => {
        const list = sortCodes(codes.filter((code) => code.slot === slot))
        const Icon = SLOT_ICONS[slot]
        return (
          <Panel key={slot}>
            <PanelHeader
              title={
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {t(`slots.${slot}.title`)}
                  <Badge variant="secondary">{list.length}</Badge>
                </span>
              }
              description={t(`slots.${slot}.description`)}
              actions={
                <Button type="button" size="sm" onClick={() => openCreate(slot)}>
                  <Plus />
                  {t('add')}
                </Button>
              }
            />

            {legacy[slot] && list.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3 sm:px-5">
                <p className="flex min-w-0 items-start gap-2 text-xs text-foreground/85">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-accent-text" aria-hidden />
                  {t('legacy.notice')}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={importing === slot}
                  onClick={() => importLegacy(slot)}
                >
                  {importing === slot ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t('legacy.import')}
                </Button>
              </div>
            ) : null}

            <ul className="divide-y divide-border">
              {list.map((code) => {
                const scope = sortCodes(codes.filter((item) => item.slot === code.slot))
                const index = scope.findIndex((item) => item.id === code.id)
                const rowBusy = pending === code.id
                return (
                  <li key={code.id} className="group flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Braces className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            !code.enabled && 'text-muted-foreground',
                          )}
                        >
                          {code.name}
                        </p>
                        {!code.enabled ? <Badge variant="secondary">{tc('off')}</Badge> : null}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {firstLine(code.code)}
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
                        aria-label={t('moveUpAria', { name: code.name })}
                        onClick={() => move(code, 'up')}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={rowBusy || index >= scope.length - 1}
                        aria-label={t('moveDownAria', { name: code.name })}
                        onClick={() => move(code, 'down')}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={t('editAria', { name: code.name })}
                        onClick={() => openEdit(code)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={t('deleteAria', { name: code.name })}
                        onClick={() => setConfirm(code)}
                      >
                        <Trash2 />
                      </Button>
                      <Switch
                        checked={code.enabled}
                        disabled={rowBusy}
                        onCheckedChange={(checked) => toggleEnabled(code, checked)}
                        aria-label={t('enableAria', { name: code.name })}
                      />
                    </div>
                  </li>
                )
              })}
              {list.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
                  {t('empty')}
                </li>
              ) : null}
            </ul>
          </Panel>
        )
      })}

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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="code-name">{t('nameLabel')}</Label>
                <Input
                  id="code-name"
                  value={form.name}
                  onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                  maxLength={CUSTOM_CODE_NAME_MAX_LENGTH}
                  placeholder={t('namePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('slotLabel')}</Label>
                <Select
                  value={form.slot}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, slot: value as CustomCodeSlot }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_CODE_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {t(`slots.${slot}.title`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code-snippet">{t('codeLabel')}</Label>
              <Textarea
                id="code-snippet"
                rows={8}
                value={form.code}
                onChange={(event) => setForm((f) => ({ ...f, code: event.target.value }))}
                maxLength={CUSTOM_CODE_MAX_LENGTH}
                placeholder={t('codePlaceholder')}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{t('codeHint')}</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="code-enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
              />
              <Label htmlFor="code-enabled" className="text-sm font-normal">
                {t('enabledLabel')}
              </Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? tc('saving') : editing ? tc('save') : t('add')}
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
    </section>
  )
}
