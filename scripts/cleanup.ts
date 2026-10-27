import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) })

/**
 * Retention cleanup.
 *
 * Unlock sessions and rate-limit buckets are transient by design. Analytics
 * events are kept unless RETENTION_ANALYTICS_DAYS is set, because the dashboard
 * reports are built from them.
 */
function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

async function main() {
  const now = new Date()
  const analyticsDays = numberFromEnv('RETENTION_ANALYTICS_DAYS', 0)

  const buckets = await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  const sessions = await prisma.unlockSession.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  let events = { count: 0 }
  if (analyticsDays > 0) {
    events = await prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - analyticsDays * 86_400_000) } },
    })
  }

  console.info(
    `[cleanup] rate limit buckets: ${buckets.count}, expired unlock sessions: ${sessions.count}, analytics events: ${events.count}`,
  )
}

main()
  .catch((error) => {
    console.error('[cleanup] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
