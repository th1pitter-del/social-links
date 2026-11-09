'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AdminLinkRowActions } from '@/components/admin/link-row-actions'
import { formatNumber } from '@/lib/format'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { bulkSetLinkStatus } from '@/lib/actions/admin'

export type AdminLinkTableRow = {
  id: string
  slug: string
  title: string
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED'
  ownerEmail: string
  unlocks: number
  events: number
}

export function AdminLinksTable({ links }: { links: AdminLinkTableRow[] }) {
  const router = useRouter()
  const t = useTranslations('admin')
  const locale = useLocale()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  const ids = useMemo(() => links.map((link) => link.id), [links])
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ids))
  }

  function bulk(status: 'ACTIVE' | 'DISABLED') {
    const selectedIds = [...selected]
    if (selectedIds.length === 0) return
    startTransition(async () => {
      const result = await bulkSetLinkStatus(selectedIds, status)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        status === 'ACTIVE'
          ? t('links.bulkEnabledToast', { count: selectedIds.length })
          : t('links.bulkDisabledToast', { count: selectedIds.length }),
      )
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
          <span className="font-medium text-accent-text">{t('common.selected', { count: selected.size })}</span>
          <div className="ms-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk('ACTIVE')}>
              {t('common.enable')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => bulk('DISABLED')}
            >
              {t('common.disable')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setSelected(new Set())}
            >
              {t('common.clear')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-start text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-5 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label={t('links.selectAll')}
                />
              </th>
              <th className="px-5 py-3 font-medium">{t('links.colLink')}</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('links.colOwner')}</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">{t('links.colStatus')}</th>
              <th className="hidden px-5 py-3 text-end font-medium lg:table-cell">{t('links.colSessions')}</th>
              <th className="hidden px-5 py-3 text-end font-medium lg:table-cell">{t('links.colEvents')}</th>
              <th className="px-5 py-3 text-end font-medium">{t('links.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {links.map((link) => (
              <tr key={link.id} className="hover:bg-muted/40">
                <td className="px-5 py-4">
                  <Checkbox
                    checked={selected.has(link.id)}
                    onCheckedChange={() => toggle(link.id)}
                    aria-label={t('links.selectLink', { title: link.title })}
                  />
                </td>
                <td className="px-5 py-4">
                  <Link href={`/admin/links/${link.id}`} className="font-medium hover:underline">
                    {link.title}
                  </Link>
                  <Link
                    href={`/link/${link.slug}`}
                    target="_blank"
                    className="block font-mono text-xs text-muted-foreground hover:underline"
                  >
                    /link/{link.slug}
                  </Link>
                </td>
                <td className="hidden px-5 py-4 text-muted-foreground sm:table-cell">
                  {link.ownerEmail}
                </td>
                <td className="hidden px-5 py-4 md:table-cell">
                  <StatusPill
                    status={link.status}
                    label={t(`status.${link.status.toLowerCase()}`)}
                  />
                </td>
                <td className="hidden px-5 py-4 text-end text-muted-foreground lg:table-cell tabular-nums">
                  {formatNumber(locale, link.unlocks)}
                </td>
                <td className="hidden px-5 py-4 text-end text-muted-foreground lg:table-cell tabular-nums">
                  {formatNumber(locale, link.events)}
                </td>
                <td className="px-5 py-4 text-end">
                  <AdminLinkRowActions linkId={link.id} status={link.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
