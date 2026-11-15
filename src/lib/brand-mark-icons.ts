import {
  DoorOpen,
  FileKey2,
  FolderKey,
  FolderOpen,
  Globe,
  GlobeLock,
  Key,
  KeyRound,
  Link,
  Link2,
  LockKeyholeOpen,
  LockOpen,
  QrCode,
  Unlock,
  UnlockKeyhole,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icons selectable as the site mark in Settings. Keys are stored in the
 * `site.logoIcon` setting; '' keeps the shipped built-in mark. The order is the
 * order the admin grid shows them in.
 */
export const BRAND_MARK_ICONS = [
  { key: 'unlock', icon: Unlock },
  { key: 'lock-open', icon: LockOpen },
  { key: 'unlock-keyhole', icon: UnlockKeyhole },
  { key: 'lock-keyhole-open', icon: LockKeyholeOpen },
  { key: 'key', icon: Key },
  { key: 'key-round', icon: KeyRound },
  { key: 'link', icon: Link },
  { key: 'chain', icon: Link2 },
  { key: 'globe', icon: Globe },
  { key: 'globe-lock', icon: GlobeLock },
  { key: 'folder-open', icon: FolderOpen },
  { key: 'folder-key', icon: FolderKey },
  { key: 'file-key', icon: FileKey2 },
  { key: 'qr-code', icon: QrCode },
  { key: 'door-open', icon: DoorOpen },
] as const satisfies readonly { key: string; icon: LucideIcon }[]

export type BrandMarkIconKey = (typeof BRAND_MARK_ICONS)[number]['key']

export function isBrandMarkIcon(value: string | null | undefined): value is BrandMarkIconKey {
  const key = value?.trim() ?? ''
  return BRAND_MARK_ICONS.some((entry) => entry.key === key)
}

/** The selected icon component, or null for the built-in mark. */
export function brandMarkIcon(value: string | null | undefined): LucideIcon | null {
  return BRAND_MARK_ICONS.find((entry) => entry.key === value?.trim())?.icon ?? null
}
