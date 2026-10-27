import 'server-only'

import { prisma } from '@/lib/prisma'

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Fixed-window rate limiter backed by MySQL so limits survive restarts and work
 * across multiple Node processes. Used for authentication, link creation and
 * unlocking.
 */
export async function consume(
  key: string,
  options: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = options

  await prisma.$executeRaw`
    INSERT INTO \`RateLimitBucket\` (\`key\`, \`count\`, \`windowStart\`, \`expiresAt\`)
    VALUES (${key}, 1, NOW(3), DATE_ADD(NOW(3), INTERVAL ${windowSeconds} SECOND))
    ON DUPLICATE KEY UPDATE
      \`count\` = IF(\`expiresAt\` < NOW(3), 1, \`count\` + 1),
      \`windowStart\` = IF(\`expiresAt\` < NOW(3), NOW(3), \`windowStart\`),
      \`expiresAt\` = IF(\`expiresAt\` < NOW(3), DATE_ADD(NOW(3), INTERVAL ${windowSeconds} SECOND), \`expiresAt\`)
  `

  const [bucket] = await prisma.$queryRaw<
    Array<{ count: number; expiresAt: Date }>
  >`SELECT \`count\`, \`expiresAt\` FROM \`RateLimitBucket\` WHERE \`key\` = ${key}`

  if (!bucket) {
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((new Date(bucket.expiresAt).getTime() - Date.now()) / 1000),
  )

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  }
}

export function tooManyRequests(result: RateLimitResult) {
  return Response.json(
    { error: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    },
  )
}

/**
 * Reads a numeric limit from the admin-managed settings table and falls back to
 * a safe default when it is unset or invalid. This lets administrators adjust
 * rate limits from /admin/settings without a redeploy.
 */
export async function consumeBySetting(
  key: string,
  settingKey: string,
  fallbackLimit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const row = await prisma.setting.findUnique({
    where: { key: settingKey },
    select: { value: true },
  })
  const parsed = row ? Number.parseInt(row.value.trim(), 10) : Number.NaN
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackLimit
  return consume(key, { limit, windowSeconds })
}
