import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '../src/generated/prisma/client'
import { categories, tags, posts } from './seed-blog-content'
import { morePosts } from './seed-blog-content-more'

/**
 * Demo blog content: four categories, nine translated tags and ten articles
 * (nine published, one scheduled a few days ahead so the admin list shows the
 * SCHEDULED state). English copy with Spanish, Portuguese and Arabic overrides.
 * Cover images come from picsum.photos, so nothing local is required.
 *
 * Upsert semantics: re-running RESETS the demo rows to the content below —
 * edits made to these slugs in the admin editor are overwritten. Run with
 * `npm run db:seed:blog`.
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

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

async function main() {
  const author = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  if (!author) {
    throw new Error('No admin user found. Create an administrator before seeding the blog.')
  }

  const categoryIds = new Map<string, string>()
  for (const category of categories) {
    const row = await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        translations: category.translations,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        translations: category.translations,
      },
      select: { id: true },
    })
    categoryIds.set(category.slug, row.id)
    console.info(`[blog] Category "${category.name}" ready.`)
  }

  const tagIds = new Map<string, string>()
  for (const tag of tags) {
    const row = await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, translations: tag.translations },
      create: { name: tag.name, slug: tag.slug, translations: tag.translations },
      select: { id: true },
    })
    tagIds.set(tag.slug, row.id)
    console.info(`[blog] Tag "${tag.name}" ready.`)
  }

  for (const post of [...posts, ...morePosts]) {
    const publishedAt = new Date(now - post.publishedDaysAgo * DAY)
    const tagConnect = post.tags.map((slug) => ({ id: tagIds.get(slug) as string }))
    const data = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      coverAlt: post.coverAlt,
      status: 'PUBLISHED' as const,
      featured: post.featured,
      viewCount: post.viewCount,
      publishedAt,
      translations: post.translations,
      authorId: author.id,
      categoryId: categoryIds.get(post.category) as string,
    }
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { ...data, tags: { set: tagConnect } },
      create: { slug: post.slug, ...data, tags: { connect: tagConnect } },
    })
    const when =
      post.publishedDaysAgo < 0
        ? `scheduled for ${publishedAt.toISOString().slice(0, 10)}`
        : `published ${post.publishedDaysAgo}d ago`
    console.info(`[blog] "${post.title}" ${when}.`)
  }

  console.info(`[blog] Demo content ready. Author: ${author.name ?? 'admin'}.`)
}

main()
  .catch((error) => {
    console.error('[blog] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
