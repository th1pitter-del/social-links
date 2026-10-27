'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adminSetUserRole, setUserBanned } from '@/lib/actions/admin'

export function UserDetailActions({
  userId,
  role,
  banned,
  isSelf,
}: {
  userId: string
  role: 'USER' | 'ADMIN'
  banned: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [pending, startTransition] = useTransition()

  function changeRole(next: string) {
    if (next === role) return
    startTransition(async () => {
      const result = await adminSetUserRole(userId, next as 'USER' | 'ADMIN')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next === 'ADMIN' ? t('userActions.promotedToast') : t('userActions.demotedToast'))
      router.refresh()
    })
  }

  function toggleBan() {
    startTransition(async () => {
      const result = await setUserBanned(userId, !banned)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(banned ? t('userActions.unbannedToast') : t('userActions.bannedToast'))
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={role} onValueChange={changeRole} disabled={pending || isSelf}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USER">{t('status.user')}</SelectItem>
          <SelectItem value="ADMIN">{t('status.admin')}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant={banned ? 'outline' : 'destructive'}
        size="sm"
        onClick={toggleBan}
        disabled={pending || isSelf}
      >
        {banned ? t('userActions.unbanUser') : t('userActions.banUser')}
      </Button>
    </div>
  )
}
