import 'server-only'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/**
 * Builds a mariadb driver config from the connection URL. Remote hosts (cloud
 * MySQL such as TiDB, which mandates TLS) get an SSL config and a longer
 * connect timeout; local development keeps the plain connection string.
 */
function adapterOptions(connectionString: string) {
  const parsed = new URL(connectionString)
  if (LOCAL_HOSTS.has(parsed.hostname)) {
    return connectionString
  }
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

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const adapter = new PrismaMariaDb(adapterOptions(connectionString), {
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
