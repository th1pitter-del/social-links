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

const PLATFORM_DEFAULTS = [
  { key: 'youtube', label: 'YouTube', icon: 'video', position: 0 },
  { key: 'tiktok', label: 'TikTok', icon: 'music', position: 1 },
  { key: 'instagram', label: 'Instagram', icon: 'camera', position: 2 },
  { key: 'facebook', label: 'Facebook', icon: 'users', position: 3 },
  { key: 'x', label: 'X', icon: 'at', position: 4 },
  { key: 'threads', label: 'Threads', icon: 'at', position: 5 },
  { key: 'discord', label: 'Discord', icon: 'message', position: 6 },
  { key: 'twitch', label: 'Twitch', icon: 'tv', position: 7 },
  { key: 'kick', label: 'Kick', icon: 'play', position: 8 },
  { key: 'reddit', label: 'Reddit', icon: 'newspaper', position: 9 },
  { key: 'telegram', label: 'Telegram', icon: 'send', position: 10 },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'message', position: 11 },
  { key: 'snapchat', label: 'Snapchat', icon: 'camera', position: 12 },
  { key: 'linkedin', label: 'LinkedIn', icon: 'users', position: 13 },
  { key: 'pinterest', label: 'Pinterest', icon: 'bookmark', position: 14 },
  { key: 'spotify', label: 'Spotify', icon: 'music', position: 15 },
  { key: 'soundcloud', label: 'SoundCloud', icon: 'music', position: 16 },
  { key: 'github', label: 'GitHub', icon: 'star', position: 17 },
  { key: 'medium', label: 'Medium', icon: 'newspaper', position: 18 },
  { key: 'tumblr', label: 'Tumblr', icon: 'newspaper', position: 19 },
  { key: 'vimeo', label: 'Vimeo', icon: 'video', position: 20 },
  { key: 'patreon', label: 'Patreon', icon: 'crown', position: 21 },
  { key: 'kofi', label: 'Ko-fi', icon: 'gift', position: 22 },
  { key: 'steam', label: 'Steam', icon: 'gamepad', position: 23 },
  { key: 'etsy', label: 'Etsy', icon: 'shopping', position: 24 },
  { key: 'substack', label: 'Substack', icon: 'mail', position: 25 },
  { key: 'mastodon', label: 'Mastodon', icon: 'rss', position: 26 },
  { key: 'bluesky', label: 'Bluesky', icon: 'at', position: 27 },
  { key: 'vk', label: 'VK', icon: 'users', position: 28 },
  { key: 'quora', label: 'Quora', icon: 'message', position: 29 },
  { key: 'none', label: 'Custom action', icon: 'globe', position: 30 },
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