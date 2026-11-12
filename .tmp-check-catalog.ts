import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from './src/generated/prisma/client'
import { ACTION_OPTION_DEFAULTS, SUPPORTED_PLATFORM_KEYS } from './src/lib/action-defaults'

const url = new URL(process.env.DATABASE_URL!)
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  }),
})

async function main() {
  const supported = new Set<string>(SUPPORTED_PLATFORM_KEYS)
  const builtIn = new Set(ACTION_OPTION_DEFAULTS.map((o) => o.key))
  const platforms = await prisma.platform.findMany({ select: { key: true, enabled: true } })
  const actions = await prisma.actionOption.findMany({
    select: { key: true, enabled: true, system: true, platform: { select: { key: true, enabled: true } } },
  })
  const offerablePlatforms = platforms.filter((p) => supported.has(p.key) && p.enabled)
  const offerable = actions.filter(
    (a) =>
      a.enabled &&
      a.platform?.enabled &&
      supported.has(a.platform.key) &&
      (!a.system || builtIn.has(a.key)),
  )
  console.log('offerable platforms', offerablePlatforms.length, 'offerable actions', offerable.length)
  const present = new Set(actions.map((a) => a.key))
  console.log('missing action rows:', ACTION_OPTION_DEFAULTS.filter((o) => !present.has(o.key)).map((o) => o.key))
  const pp = new Set(platforms.map((p) => p.key))
  console.log('missing platform rows:', SUPPORTED_PLATFORM_KEYS.filter((k) => !pp.has(k)))
  const disabled = offerable.filter((a) => !a.enabled)
  console.log('new checkable rows:', actions.filter((a) => ['GITHUB_FOLLOW','GITHUB_STAR','BLUESKY_FOLLOW','MASTODON_FOLLOW','STEAM_GROUP','TELEGRAM_JOIN','DISCORD_JOIN','TWITCH_FOLLOW','YOUTUBE_SUBSCRIBE','YOUTUBE_LIKE'].includes(a.key)).map((a) => `${a.key}:${a.platform?.key}:${a.enabled}`))
  console.log('disabled offerable', disabled.length)
}
main().finally(() => prisma.$disconnect())
