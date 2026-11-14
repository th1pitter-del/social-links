import { createHash } from 'node:crypto'
import { headers } from 'next/headers'

import { BLOG_SLUG_PATTERN } from '@/lib/blog'
import { prisma } from '@/lib/prisma'
import { consume } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_CONTENT = new Response(null, { status: 204 })

/**
 * Read counter for public articles. Viewing is anonymous, so the bucket keys on
 * a hash of the address plus the slug: one count per reader per article per half
 * hour. The page itself stays cacheable - only this counter changes.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
    if (!slug || !BLOG_SLUG_PATTERN.test(slug)) return NO_CONTENT

    const now = new Date()
    const post = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
      select: { id: true },
    })
    if (!post) return NO_CONTENT

    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for')
    const address = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? 'anon'
    const salt = process.env.BETTER_AUTH_SECRET ?? 'linkunlock'
    const visitor = createHash('sha256')
      .update(`${salt}:${address}`)
      .digest('hex')
      .slice(0, 32)

    const limit = await consume(`blog:view:${visitor}:${post.id}`, {
      limit: 1,
      windowSeconds: 1800,
    })
    if (!limit.ok) return NO_CONTENT

    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })
  } catch {
    // A counter is never worth an error for the reader or the page.
  }
  return NO_CONTENT
}
