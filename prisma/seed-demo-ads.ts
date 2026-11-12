import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '../src/generated/prisma/client'

/**
 * Placeholder ad units, one standard-size creative per slot, so every public
 * page shows exactly where and how large a sponsored banner will render.
 * Creatives live in `public/ads` at their true pixel size.
 *
 * Re-run safe: rows already present are left untouched, so admin edits and
 * reordering survive. Run with `npm run db:seed:ads`.
 */
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

const DEMO_TARGET = 'https://example.com/demo-ad'

const BILLBOARD = '/ads/billboard-970x250.svg'
const LEADERBOARD = '/ads/leaderboard-728x90.svg'
const RECTANGLE = '/ads/rectangle-300x250.svg'
const MOBILE = '/ads/mobile-320x100.svg'

/** Earlier demo rows this seed replaces; only demo-named rows are touched. */
const LEGACY_NAMES = [
  'Demo · Link button (homepage top)',
  'Demo · Banner (unlock page top)',
  'Demo · Ad code (dashboard top)',
]

const demoAds = [
  { placement: 'home-top', imageUrl: BILLBOARD },
  { placement: 'home-mid', imageUrl: BILLBOARD },
  { placement: 'home-bottom', imageUrl: LEADERBOARD },
  { placement: 'page-top', imageUrl: BILLBOARD },
  { placement: 'page-bottom', imageUrl: LEADERBOARD },
  { placement: 'unlock-top', imageUrl: LEADERBOARD },
  { placement: 'unlock-bottom', imageUrl: LEADERBOARD },
  { placement: 'bio-top', imageUrl: RECTANGLE },
  { placement: 'bio-bottom', imageUrl: MOBILE },
  { placement: 'dashboard-top', imageUrl: LEADERBOARD },
  { placement: 'dashboard-bottom', imageUrl: LEADERBOARD },
] as const

const SIZE_LABELS: Record<string, string> = {
  [BILLBOARD]: '970 × 250',
  [LEADERBOARD]: '728 × 90',
  [RECTANGLE]: '300 × 250',
  [MOBILE]: '320 × 100',
}

function nameFor(ad: (typeof demoAds)[number]) {
  return `Placeholder · ${ad.placement} · ${SIZE_LABELS[ad.imageUrl]}`
}

async function main() {
  const removed = await prisma.adUnit.deleteMany({ where: { name: { in: LEGACY_NAMES } } })
  if (removed.count > 0) {
    console.info(`[demo] Removed ${removed.count} legacy demo ad(s).`)
  }

  const positions = new Map<string, number>()
  for (const row of await prisma.adUnit.findMany({
    select: { placement: true, position: true },
  })) {
    positions.set(row.placement, Math.max(positions.get(row.placement) ?? -1, row.position))
  }

  for (const ad of demoAds) {
    const name = nameFor(ad)
    const existing = await prisma.adUnit.findFirst({
      where: { name },
      select: { id: true },
    })
    if (existing) {
      console.info(`[demo] Ad "${name}" already exists - left unchanged.`)
      continue
    }
    const position = (positions.get(ad.placement) ?? -1) + 1
    positions.set(ad.placement, position)
    await prisma.adUnit.create({
      data: {
        name,
        placement: ad.placement,
        type: 'banner',
        label: 'Placeholder ad — your campaign could be here',
        url: DEMO_TARGET,
        imageUrl: ad.imageUrl,
        newTab: true,
        enabled: true,
        position,
      },
    })
    console.info(`[demo] Created banner "${name}".`)
  }

  const total = await prisma.adUnit.count()
  console.info(`[demo] ${total} ad unit(s) in the database.`)
}

main()
  .catch((error) => {
    console.error('[demo] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
