import Link from 'next/link'
import { Link2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { LinkRowActions } from '@/components/link-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('myLinks') }
}

export default async function LinksPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.links')
  const tc = await getTranslations('dashboard.common')
  const ts = await getTranslations('dashboard.status')

  const links = await prisma.link.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { unlocks: true, actions: true, events: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/links/new">{tc('createLink')}</Link>
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Link2 className="size-5" />
          </div>
          <h2 className="mt-4 font-medium">{t('noLinksTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('noLinksDescription')}</p>
          <Button className="mt-5" asChild>
            <Link href="/dashboard/links/new">{tc('createLink')}</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('colLink')}</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('colStatus')}</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">{t('colSessions')}</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">{t('colEvents')}</th>
                <th className="px-5 py-3 text-right font-medium">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.map((link) => (
                <tr key={link.id}>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/links/${link.id}`}
                      className="font-medium hover:underline"
                    >
                      {link.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">/u/{link.slug}</p>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <Badge variant={link.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {ts(link.status.toLowerCase())}
                    </Badge>
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">
                    {link._count.unlocks}
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">
                    {link._count.events}
                  </td>
                  <td className="px-5 py-4">
                    <LinkRowActions id={link.id} slug={link.slug} status={link.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
