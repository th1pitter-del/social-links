import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from './src/generated/prisma/client'

const url = new URL(process.env.DATABASE_URL!)
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  }),
})

async function main() {
  const link = await prisma.link.findUnique({
    where: { slug: 'verify-probe' },
    select: {
      id: true,
      unlocks: {
        select: {
          id: true, status: true,
          completions: { select: { verified: true, proof: true, linkAction: { select: { type: true } } } },
        },
      },
    },
  })
  console.log(JSON.stringify(link, null, 2))
}
main().finally(() => prisma.$disconnect())
