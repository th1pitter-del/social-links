import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { hashPassword } from 'better-auth/crypto'

import { ACTION_OPTION_DEFAULTS } from '../src/lib/action-defaults'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/** Remote hosts (cloud MySQL such as TiDB) require TLS; local stays plain. */
function adapterOptions(url: string) {
  const parsed = new URL(url)
  if (LOCAL_HOSTS.has(parsed.hostname)) return url
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    ssl: {},
    connectTimeout: 15000,
  }
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(adapterOptions(connectionString)) })

// The platforms this build offers. Rows for retired built-ins stay in existing
// databases but are hidden from the panel by the supported-key list.
const PLATFORM_DEFAULTS = [
  { key: 'youtube', label: 'YouTube', icon: 'video', position: 0 },
  { key: 'instagram', label: 'Instagram', icon: 'camera', position: 1 },
  { key: 'facebook', label: 'Facebook', icon: 'users', position: 2 },
  { key: 'tiktok', label: 'TikTok', icon: 'music', position: 3 },
  { key: 'discord', label: 'Discord', icon: 'message', position: 4 },
  { key: 'spotify', label: 'Spotify', icon: 'music', position: 5 },
  { key: 'none', label: 'Website', icon: 'globe', position: 6 },
] as const

async function seedPlatforms() {
  for (const platform of PLATFORM_DEFAULTS) {
    await prisma.platform.upsert({
      where: { key: platform.key },
      create: {
        key: platform.key,
        label: platform.label,
        icon: platform.icon,
        position: platform.position,
        system: true,
      },
      update: {
        label: platform.label,
        icon: platform.icon,
        position: platform.position,
      },
    })
  }
  console.info(`[seed] Ensured ${PLATFORM_DEFAULTS.length} built-in platforms.`)
}

async function seedActionOptions() {
  const platforms = await prisma.platform.findMany({
    select: { id: true, key: true, label: true },
  })
  const platformByLabel = Object.fromEntries(platforms.map((p) => [p.label, p.id]))
  const noneId = platforms.find((p) => p.key === 'none')?.id

  for (const option of ACTION_OPTION_DEFAULTS) {
    const platformId = option.platform
      ? (platformByLabel[option.platform] ?? noneId)
      : noneId

    await prisma.actionOption.upsert({
      where: { key: option.key },
      create: {
        key: option.key,
        label: option.label,
        platformId,
        icon: option.icon,
        behavior: option.behavior,
        position: option.position,
        system: true,
      },
      update: {
        label: option.label,
        platformId,
        icon: option.icon,
        behavior: option.behavior,
        position: option.position,
      },
    })
  }
  console.info(`[seed] Ensured ${ACTION_OPTION_DEFAULTS.length} built-in action options.`)
}

async function main() {
  await seedPlatforms()
  await seedActionOptions()

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.info('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin seed.')
    return
  }

  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      name: process.env.ADMIN_NAME ?? 'Administrator',
      email: email.toLowerCase(),
      emailVerified: true,
      role: 'ADMIN',
    },
    update: { role: 'ADMIN' },
  })

  const existingAccount = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: 'credential' },
  })

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: admin.id,
        accountId: admin.id,
        providerId: 'credential',
        password: await hashPassword(password),
        scope: 'credential',
      },
    })
    console.info(`[seed] Seeded admin account for ${admin.email}`)
  } else {
    console.info(`[seed] Admin account already exists for ${admin.email}`)
  }
}

main()
  .catch((error) => {
    console.error('[seed] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })