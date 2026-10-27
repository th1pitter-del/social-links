import { randomBytes } from 'node:crypto'

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'dashboard',
  'sign-in',
  'sign-up',
  'login',
  'logout',
  'u',
  'new',
  'settings',
  'about',
  'contact',
  'privacy',
  'terms',
  'faq',
  'reset-password',
  'forgot-password',
  'create',
])

export function generateSlug(length = 8): string {
  const bytes = randomBytes(length)
  let slug = ''
  for (let i = 0; i < length; i += 1) {
    slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length]
  }
  return slug
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}
