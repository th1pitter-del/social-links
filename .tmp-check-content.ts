import 'dotenv/config'
import { PrismaClient } from './src/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const url = new URL(process.env.DATABASE_URL!)
const adapter = new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) })
const prisma = new PrismaClient({ adapter })

async function main() {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: 'content.' } },
    select: { key: true, value: true },
  })
  for (const row of rows) {
    console.log(row.key, 'len', row.value.length, '| hasVerifyDenial', /do not connect|18 actions|not account checks/i.test(row.value))
  }
  const platforms = await prisma.platform.count()
  const actions = await prisma.actionOption.count()
  console.log('platforms', platforms, 'actions', actions)
}
main().finally(() => prisma.$disconnect())
