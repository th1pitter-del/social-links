// Shared (client-safe) constants and types for admin-managed custom code
// snippets. Server data access lives in `custom-code-data.ts`.

export const CUSTOM_CODE_SLOTS = ['header', 'footer'] as const
export type CustomCodeSlot = (typeof CUSTOM_CODE_SLOTS)[number]

export function isCustomCodeSlot(value: string): value is CustomCodeSlot {
  return (CUSTOM_CODE_SLOTS as readonly string[]).includes(value)
}

export const CUSTOM_CODE_NAME_MAX_LENGTH = 80
export const CUSTOM_CODE_MAX_LENGTH = 20000

/** Serializable snippet shape shared by the admin UI and the public renderer. */
export type CustomCodeData = {
  id: string
  name: string
  slot: CustomCodeSlot
  code: string
  enabled: boolean
  position: number
}

export type CustomCodeInput = {
  name: string
  slot: string
  code: string
  enabled: boolean
}
