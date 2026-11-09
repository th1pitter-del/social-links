import { Scissors } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { ShortLinkForm } from '@/components/short-link-form'
import { ShortLinkRowActions } from '@/components/short-link-row-actions'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

function targetLabel(targetUrl: string) {
  try {
    const url = new URL(targetUrl)
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return targetUrl
  }
}

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('shortLinks') }
}

export default async function ShortLinksPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.shortLinks')
  const ts = await getTranslations('dashboard.status')
  const locale = await getLocale()
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  const links = await prisma.shortLink.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      targetUrl: true,
      status: true,
      clicks: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <ShortLinkForm />

      {links.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Scissors className="size-5" />
          </div>
          <h2 className="mt-4 font-medium">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('colLink')}</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('colClicks')}</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">{t('colStatus')}</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('colCreated')}</th>
                <th className="px-5 py-3 text-right font-medium">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.map((link) => (
                <tr key={link.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">/s/{link.code}</p>
                    <p className="max-w-[28rem] truncate text-xs text-muted-foreground">
                      {targetLabel(link.targetUrl)}
                    </p>
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground sm:table-cell">
                    {formatNumber(locale, link.clicks)}
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <Badge variant={link.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {ts(link.status.toLowerCase())}
                    </Badge>
                  </td>
                  <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell">
                    {dateFormatter.format(link.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <ShortLinkRowActions id={link.id} code={link.code} status={link.status} />
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
