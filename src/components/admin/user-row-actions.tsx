'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminSetUserRole, setUserBanned } from '@/lib/actions/admin'

export function UserRowActions({
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

  function changeRole(next: 'USER' | 'ADMIN') {
    startTransition(async () => {
      const result = await adminSetUserRole(userId, next)
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending || isSelf}
          aria-label={t('userActions.label')}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t('userActions.role')}</DropdownMenuLabel>
        <DropdownMenuItem disabled={role === 'ADMIN'} onSelect={() => changeRole('ADMIN')}>
          {t('userActions.promoteToAdmin')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={role === 'USER'} onSelect={() => changeRole('USER')}>
          {t('userActions.removeAdmin')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant={banned ? 'default' : 'destructive'}
          onSelect={toggleBan}
        >
          {banned ? t('userActions.unbanUser') : t('userActions.banUser')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
