import { getTranslations } from 'next-intl/server'

import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { Timestamp } from '@/components/timestamp'
import { Input } from '@/components/ui/input'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('auditLog') }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireAdmin()
  const t = await getTranslations('admin')
  const { q } = await searchParams
  const query = (q ?? '').trim().slice(0, 100)

  const logs = await prisma.auditLog.findMany({
    where: query
      ? {
          OR: [
            { action: { contains: query } },
            { actorEmail: { contains: query } },
            { targetType: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        actions={
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder={t('audit.filterPlaceholder')} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              {t('audit.filterButton')}
            </button>
          </form>
        }
      />

      <Panel>
        <PanelHeader title={t('audit.activityTitle')} description={t('audit.activityDescription')} />
        {logs.length === 0 ? (
          <div className="p-5">
            <EmptyState>{t('audit.noEntries')}</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('audit.colTime')}</th>
                  <th className="px-5 py-3 font-medium">{t('audit.colActor')}</th>
                  <th className="px-5 py-3 font-medium">{t('audit.colAction')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('audit.colTarget')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">
                      {<Timestamp value={log.createdAt} />}
                    </td>
                    <td className="px-5 py-3">{log.actorEmail ?? log.actorName ?? log.actorId}</td>
                    <td className="px-5 py-3 font-medium">{log.action}</td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {log.targetType}:{log.targetId?.slice(0, 8) ?? '—'}
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
