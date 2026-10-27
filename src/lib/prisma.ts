import 'server-only'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const adapter = new PrismaMariaDb(connectionString, {
    // Prisma ORM v7 removed the Rust query engine; queries run through the
    // mariadb driver's binary protocol by default.
    useTextProtocol: false,
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
