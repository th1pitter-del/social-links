import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'

import { prisma } from '@/lib/prisma'

/**
 * Guest link ownership.
 *
 * A visitor may create a single link without an account. The link is stored
 * with `ownerId = null` and a random `guestToken`; the browser holds a signed
 * cookie containing that token, which is the server-side record used to enforce
 * the one-free-link limit and to hand the link over to the account on sign-in.
 */
const COOKIE_NAME = 'lu_guest'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function secret() {
  return process.env.BETTER_AUTH_SECRET ?? 'guest-cookie-dev-secret'
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function verify(rawId: string, signature: string): boolean {
  const expected = Buffer.from(sign(rawId))
  const provided = Buffer.from(signature)
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}

export function createGuestToken(): string {
  return randomBytes(24).toString('hex')
}

/** Reads and verifies the signed guest token, or null when absent/invalid. */
export async function getGuestToken(): Promise<string | null> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return null
  const separator = raw.indexOf('.')
  if (separator <= 0) return null
  const id = raw.slice(0, separator)
  const signature = raw.slice(separator + 1)
  return verify(id, signature) ? id : null
}

/** Sets the signed guest cookie. Only callable from server actions / handlers. */
export async function setGuestCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, `${token}.${sign(token)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearGuestCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Salted hash of the visitor IP, used only for abuse rate limiting. */
export async function guestIpKey(): Promise<string> {
  const headerList = await headers()
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip')?.trim() ??
    'local'
  return createHmac('sha256', secret()).update(`guest-ip:${ip}`).digest('hex')
}

/**
 * Transfers every link created by this browser as a guest onto the account and
 * clears the guest cookie. Safe to call on every sign-in/sign-up.
 */
export async function claimGuestLinks(userId: string): Promise<number> {
  const token = await getGuestToken()
  if (!token) return 0

  const result = await prisma.link.updateMany({
    where: { guestToken: token, ownerId: null },
    data: { ownerId: userId, guestToken: null },
  })

  await clearGuestCookie()
  return result.count
}
