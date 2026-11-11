import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '../src/generated/prisma/client'

/**
 * Demonstration ad units, one per type, so every admin control and public
 * slot can be exercised before real campaigns exist. Safe to re-run: a row
 * whose name is already present is left untouched, so admin edits survive.
 *
 * Run with `npm run db:seed:ads`.
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

const demoAds = [
  {
    name: 'Demo · Link button (homepage top)',
    placement: 'home-top',
    type: 'link',
    label: 'Demo link ad — claim your reward',
    url: DEMO_TARGET,
    newTab: true,
  },
  {
    name: 'Demo · Banner (unlock page top)',
    placement: 'unlock-top',
    type: 'banner',
    label: 'Demo banner ad',
    url: DEMO_TARGET,
    imageUrl: 'https://placehold.co/1200x160/0B0D12/D5FF2F/png?text=Demo+Sponsor+Banner',
    newTab: true,
  },
  {
    name: 'Demo · Ad code (dashboard top)',
    placement: 'dashboard-top',
    type: 'html',
    html: [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;border:1px solid #1f2430;background:#0b0d12;padding:14px 16px;color:#e7e9ee;font:14px/1.4 system-ui,sans-serif">',
      '<div><strong style="color:#d5ff2f">Demo ad code</strong><br><span style="color:#9aa1ad">This box is raw HTML saved in the admin panel.</span></div>',
      '<a href="https://example.com/demo-ad" target="_blank" rel="sponsored noopener noreferrer" style="flex:none;border-radius:10px;background:#d5ff2f;padding:8px 14px;color:#0b0d12;font-weight:600;text-decoration:none">Open offer</a>',
      '</div>',
      // Proves the renderer executes scripts, which is what ad-network snippets need.
      '<script>document.currentScript.previousElementSibling.setAttribute("data-demo-script", "ran")</script>',
    ].join(''),
    newTab: true,
  },
] as const

async function main() {
  const positions = new Map<string, number>()
  for (const row of await prisma.adUnit.findMany({
    select: { placement: true, position: true },
  })) {
    positions.set(row.placement, Math.max(positions.get(row.placement) ?? -1, row.position))
  }

  for (const ad of demoAds) {
    const existing = await prisma.adUnit.findFirst({
      where: { name: ad.name },
      select: { id: true },
    })
    if (existing) {
      console.info(`[demo] Ad "${ad.name}" already exists - left unchanged.`)
      continue
    }
    const position = (positions.get(ad.placement) ?? -1) + 1
    positions.set(ad.placement, position)
    await prisma.adUnit.create({
      data: {
        name: ad.name,
        placement: ad.placement,
        type: ad.type,
        label: 'label' in ad ? ad.label : undefined,
        url: 'url' in ad ? ad.url : undefined,
        imageUrl: 'imageUrl' in ad ? ad.imageUrl : undefined,
        html: 'html' in ad ? ad.html : undefined,
        newTab: ad.newTab,
        enabled: true,
        position,
      },
    })
    console.info(`[demo] Created ${ad.type} ad "${ad.name}" in "${ad.placement}".`)
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
