'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { UserRowActions } from '@/components/admin/user-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { bulkSetUserBanned } from '@/lib/actions/admin'

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  banned: boolean
  linkCount: number
  createdAt: string
}

function formatJoined(iso: string) {
  return iso.slice(0, 10)
}

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  const selectableIds = useMemo(
    () => users.filter((user) => user.id !== currentUserId).map((user) => user.id),
    [users, currentUserId],
  )
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds))
  }

  function bulk(banned: boolean) {
    const ids = [...selected]
    if (ids.length === 0) return
    startTransition(async () => {
      const result = await bulkSetUserBanned(ids, banned)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        banned
          ? t('users.bulkBannedToast', { count: ids.length })
          : t('users.bulkUnbannedToast', { count: ids.length }),
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
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk(false)}>
              {t('common.unban')}
            </Button>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => bulk(true)}>
              {t('common.ban')}
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
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-5 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label={t('users.selectAll')}
                />
              </th>
              <th className="px-5 py-3 font-medium">{t('users.colUser')}</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('users.colRole')}</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('users.colLinks')}</th>
              <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('users.colJoined')}</th>
              <th className="px-5 py-3 font-medium">{t('users.colStatus')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('users.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/40">
                <td className="px-5 py-4">
                  <Checkbox
                    checked={selected.has(user.id)}
                    onCheckedChange={() => toggle(user.id)}
                    disabled={user.id === currentUserId}
                    aria-label={t('users.selectUser', { email: user.email })}
                  />
                </td>
                <td className="px-5 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                    {user.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="hidden px-5 py-4 sm:table-cell">
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {t(`status.${user.role.toLowerCase()}`)}
                  </Badge>
                </td>
                <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell tabular-nums">
                  {user.linkCount}
                </td>
                <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell tabular-nums">
                  {formatJoined(user.createdAt)}
                </td>
                <td className="px-5 py-4">
                  {user.banned ? (
                    <Badge variant="destructive">{t('status.banned')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('status.active')}</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <UserRowActions
                    userId={user.id}
                    role={user.role}
                    banned={user.banned}
                    isSelf={user.id === currentUserId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
