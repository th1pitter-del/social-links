import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/copy-button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('myUnlocks') }
}

export default async function MyUnlocksPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.unlocks')
  const unlocks = await prisma.userUnlock.findMany({
    where: { userId: session.user.id },
    orderBy: { unlockedAt: 'desc' },
    select: {
      id: true,
      unlockedAt: true,
      link: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          contentType: true,
        },
      },
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        {unlocks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {unlocks.map((u) => {
              const publicUrl = `${appUrl}/u/${u.link.slug}`
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/u/${u.link.slug}`} target="_blank" className="truncate font-medium hover:underline">
                      {u.link.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      /u/{u.link.slug} ·{' '}
                      {t('unlockedOn', { date: u.unlockedAt.toISOString().slice(0, 10) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton value={publicUrl} />
                    <Link href={`/u/${u.link.slug}`} target="_blank" aria-label={t('open')}>
                      <ExternalLink />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
