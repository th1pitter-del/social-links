import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from './src/generated/prisma/client'

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

const SLUG = 'verify-probe'

async function main() {
  const demo = await prisma.setting.findUnique({ where: { key: 'demo.email' } })
  if (!demo) throw new Error('demo.email setting missing')
  const owner = await prisma.user.findUnique({ where: { email: demo.value }, select: { id: true, role: true } })
  if (!owner) throw new Error('demo admin user missing')

  await prisma.link.deleteMany({ where: { slug: SLUG } })
  const link = await prisma.link.create({
    data: {
      ownerId: owner.id,
      slug: SLUG,
      title: 'Verification probe',
      description: 'Throwaway link used to exercise step checks.',
      status: 'ACTIVE',
      contentType: 'URL',
      targetUrl: 'https://example.com/unlocked',
      actions: {
        create: [
          { type: 'GITHUB_FOLLOW', target: 'https://github.com/defunkt', position: 0 },
          { type: 'MASTODON_FOLLOW', target: 'https://mastodon.invalid/@probe', position: 1 },
          { type: 'VISIT', target: 'https://example.com/', position: 2 },
        ],
      },
    },
    select: { id: true, slug: true, actions: { select: { id: true, type: true } } },
  })
  console.log('owner role', owner.role)
  console.log(JSON.stringify(link, null, 2))
}
main().finally(() => prisma.$disconnect())
