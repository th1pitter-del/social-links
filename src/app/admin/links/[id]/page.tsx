import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Activity, Flag, Mail, MousePointerClick } from 'lucide-react'

import { AdminLinkRowActions } from '@/components/admin/link-row-actions'
import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { Badge } from '@/components/ui/badge'
import { StatusPill } from '@/components/status-pill'
import { Timestamp } from '@/components/timestamp'
import { getActionOptionMap } from '@/lib/action-catalog'
import { actionLabel } from '@/lib/action-label'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('link') }
}

export default async function AdminLinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const [t, tr, actionT] = await Promise.all([
    getTranslations('admin'),
    getTranslations('report'),
    getTranslations('actions'),
  ])
  const { id } = await params

  const link = await prisma.link.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      contentType: true,
      targetUrl: true,
      textContent: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true, banned: true } },

      actions: {
        orderBy: { position: 'asc' },
        select: { id: true, type: true, label: true, target: true, verification: true },
      },
      abuseReports: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, reason: true, status: true, createdAt: true },
      },
      unlocks: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          status: true,

          createdAt: true,
          ipHash: true,
        },
      },
      _count: { select: { unlocks: true, events: true, emailLeads: true, abuseReports: true } },
    },
  })

  if (!link) notFound()

  const actionCatalog = await getActionOptionMap()
  const actionName = (type: string) => {
    const option = actionCatalog.get(type)
    return option ? actionLabel(option, actionT) : type
  }

  const openReports = link.abuseReports.filter((report) => report.status === 'OPEN').length

  return (
    <div className="space-y-6">
      <Link
        href="/admin/links"
        className="inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {t('linkDetail.backToLinks')}
      </Link>

      <PageHeader
        title={link.title}
        description={`/u/${link.slug}`}
        actions={<AdminLinkRowActions linkId={link.id} status={link.status} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={link.status} label={t(`status.${link.status.toLowerCase()}`)} />
        <Badge variant="outline">{t(`linkDetail.contentTypes.${link.contentType}`)}</Badge>
        {openReports > 0 ? (
          <Badge variant="destructive">{t('linkDetail.openReports', { count: openReports })}</Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('linkDetail.sessions')}
          value={link._count.unlocks}
          tone="indigo"
          icon={MousePointerClick}
        />
        <StatCard label={t('linkDetail.events')} value={link._count.events} tone="violet" icon={Activity} />
        <StatCard label={t('linkDetail.emailLeads')} value={link._count.emailLeads} tone="sky" icon={Mail} />
        <StatCard
          label={t('linkDetail.reports')}
          value={link._count.abuseReports}
          tone={openReports > 0 ? 'rose' : 'slate'}
          icon={Flag}
        />
      </div>

      <Panel>
        <PanelHeader title={t('linkDetail.details')} />
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('linkDetail.owner')}</dt>
            <dd className="mt-0.5">
              {link.owner ? (
                <>
                  <Link
                    href={`/admin/users/${link.owner.id}`}
                    className="font-medium hover:underline"
                  >
                    {link.owner.name}
                  </Link>{' '}
                  <span className="text-muted-foreground">({link.owner.email})</span>
                  {link.owner.banned ? (
                    <Badge variant="destructive" className="ml-2">
                      {t('status.banned')}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">{t('common.guestWithoutAccount')}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('linkDetail.expires')}</dt>
            <dd className="mt-0.5 tabular-nums">
              {link.expiresAt ? (
                <Timestamp value={link.expiresAt} />
              ) : (
                t('common.noExpiry')
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('linkDetail.created')}</dt>
            <dd className="mt-0.5 tabular-nums">
              <Timestamp value={link.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('linkDetail.updated')}</dt>
            <dd className="mt-0.5 tabular-nums">
              <Timestamp value={link.updatedAt} />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('linkDetail.protectedContent')}</dt>
            <dd className="mt-0.5 break-words">
              {link.contentType === 'URL' ? (
                <span className="font-mono text-xs">{link.targetUrl}</span>
              ) : (
                <span className="whitespace-pre-wrap">{link.textContent}</span>
              )}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <PanelHeader title={t('linkDetail.actionsTitle')} />
        {link.actions.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('linkDetail.noActions')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colType')}</th>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colLabel')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('linkDetail.colTarget')}</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">{t('linkDetail.colVerification')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {link.actions.map((action) => (
                  <tr key={action.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">{actionName(action.type)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{action.label ?? '—'}</td>
                    <td className="hidden max-w-xs truncate px-5 py-3 font-mono text-xs sm:table-cell">
                      {action.target}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                      {t(`status.${action.verification.toLowerCase().replace('_', '')}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title={t('linkDetail.unlocksTitle')} />
        {link.unlocks.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('linkDetail.noUnlocks')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colCreated')}</th>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colStatus')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('linkDetail.colVisitor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {link.unlocks.map((unlock) => (
                  <tr key={unlock.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      <Timestamp value={unlock.createdAt} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill
                        status={unlock.status}
                        label={t(`status.${unlock.status.toLowerCase()}`)}
                      />
                    </td>
                    <td className="hidden px-5 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                      {unlock.ipHash?.slice(0, 12) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHeader title={t('linkDetail.reportsTitle')} />
        {link.abuseReports.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('linkDetail.noReports')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colDate')}</th>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colReason')}</th>
                  <th className="px-5 py-3 font-medium">{t('linkDetail.colStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {link.abuseReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      <Timestamp value={report.createdAt} />
                    </td>
                    <td className="px-5 py-3">{tr(`reasons.${report.reason}`)}</td>
                    <td className="px-5 py-3">
                      <StatusPill
                        status={report.status}
                        label={t(`status.${report.status.toLowerCase()}`)}
                      />
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
