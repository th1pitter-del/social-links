'use client'

import { useTranslations } from 'next-intl'

import { NavRow, type SiteNavItem } from '@/components/site-nav'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

/**
 * Account controls for the bio header's hamburger. Bio pages keep the user
 * menu out of the bar at every width, so this block carries the account rows
 * (or Sign in for guests) inside the menu instead.
 */
export function BioMenuAccount({
  account,
  signedIn,
  userLabel,
}: {
  account: SiteNavItem[]
  signedIn: boolean
  userLabel?: string
}) {
  const t = useTranslations('common')

  return (
    <div className="flex flex-col gap-1">
      <DropdownMenuSeparator />
      <DropdownMenuGroup aria-labelledby="bio-menu-account">
        <DropdownMenuLabel id="bio-menu-account">
          {signedIn ? userLabel : t('account')}
        </DropdownMenuLabel>
        {signedIn ? (
          account.map((item) => (
            <DropdownMenuItem
              key={item.label}
              asChild
              variant={item.destructive ? 'destructive' : undefined}
            >
              <NavRow item={item} />
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem asChild>
            <NavRow item={{ href: '/sign-in', label: t('signIn'), icon: 'logIn' }} />
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
    </div>
  )
}
