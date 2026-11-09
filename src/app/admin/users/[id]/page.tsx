import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Activity, CalendarDays, Link2 } from 'lucide-react'

import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { UserDetailActions } from '@/components/admin/user-detail-actions'
import { Timestamp } from '@/components/timestamp'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/format'
import { requireAdmin } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('user') }
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAdmin()
  const t = await getTranslations('admin')
  const locale = await getLocale()
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      banReason: true,
      emailVerified: true,
      createdAt: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      },
      links: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: { select: { unlocks: true, abuseReports: true } },
        },
      },
    },
  })

  if (!user) notFound()

  const isSelf = user.id === session.user.id

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {t('userDetail.backToUsers')}
      </Link>

      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          <UserDetailActions
            userId={user.id}
            role={user.role}
            banned={user.banned}
            isSelf={isSelf}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
          {t(`status.${user.role.toLowerCase()}`)}
        </Badge>
        {user.banned ? (
          <Badge variant="destructive">{t('status.banned')}</Badge>
        ) : (
          <Badge variant="outline">{t('status.active')}</Badge>
        )}
        <Badge variant="outline">
          {user.emailVerified ? t('status.emailVerified') : t('status.emailUnverified')}
        </Badge>
      </div>

      {user.banned && user.banReason ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {t('userDetail.banReason', { reason: user.banReason })}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('userDetail.links')} value={user.links.length} tone="indigo" icon={Link2} />
        <StatCard
          label={t('userDetail.activeSessions')}
          value={user.sessions.length}
          tone="sky"
          icon={Activity}
        />
        <StatCard
          label={t('userDetail.registered')}
          value={<Timestamp value={user.createdAt} withTime={false} />}
          tone="slate"
          icon={CalendarDays}
        />
      </div>

      <Panel>
        <PanelHeader
          title={t('userDetail.linksPanelTitle')}
          description={t('userDetail.linksPanelDescription')}
        />
        {user.links.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('userDetail.noLinks')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('userDetail.colTitle')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('userDetail.colStatus')}</th>
                  <th className="hidden px-5 py-3 text-end font-medium md:table-cell">{t('userDetail.colSessions')}</th>
                  <th className="hidden px-5 py-3 text-end font-medium md:table-cell">{t('userDetail.colReports')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.links.map((link) => (
                  <tr key={link.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link href={`/admin/links/${link.id}`} className="font-medium hover:underline">
                        {link.title}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">/link/{link.slug}</p>
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <Badge
                        variant={
                          link.status === 'ACTIVE'
                            ? 'default'
                            : link.status === 'DISABLED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {t(`status.${link.status.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3 text-end text-muted-foreground md:table-cell tabular-nums">
                      {formatNumber(locale, link._count.unlocks)}
                    </td>
                    <td className="hidden px-5 py-3 text-end text-muted-foreground md:table-cell tabular-nums">
                      {formatNumber(locale, link._count.abuseReports)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={t('userDetail.sessionsTitle')}
          description={t('userDetail.sessionsDescription')}
        />
        {user.sessions.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('userDetail.noSessions')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('userDetail.colCreated')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('userDetail.colExpires')}</th>
                  <th className="px-5 py-3 font-medium">{t('userDetail.colDevice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.sessions.map((sessionRow) => (
                  <tr key={sessionRow.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      <Timestamp value={sessionRow.createdAt} />
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell tabular-nums">
                      <Timestamp value={sessionRow.expiresAt} />
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">
                      {sessionRow.userAgent ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
