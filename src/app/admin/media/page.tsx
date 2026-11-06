import { HardDrive } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { MediaRowActions } from '@/components/admin/media-row-actions'
import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { Timestamp } from '@/components/timestamp'
import { StatCard } from '@/components/admin/stat-card'
import { formatBytes } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('media') }
}

export default async function AdminMediaPage() {
  await requireAdmin()
  const t = await getTranslations('admin')
  const locale = await getLocale()

  const [assets, agg] = await Promise.all([
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
    }),
    prisma.mediaAsset.aggregate({
      _count: { _all: true },
      _sum: { size: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('media.totalFiles')} value={agg._count._all} tone="sky" icon={HardDrive} />
        <StatCard
          label={t('media.storageUsed')}
          value={formatBytes(locale, agg._sum.size ?? 0)}
          tone="violet"
          icon={HardDrive}
        />
      </div>

      {assets.length === 0 ? (
        <EmptyState>{t('media.noFiles')}</EmptyState>
      ) : (
        <Panel>
          <PanelHeader title={t('media.panelTitle')} description={t('media.panelDescription')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('media.colPreview')}</th>
                  <th className="px-5 py-3 font-medium">{t('media.colFile')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('media.colOwner')}</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">{t('media.colSize')}</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('media.colUploaded')}</th>
                  <th className="px-5 py-3 text-end font-medium">{t('media.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${asset.id}`}
                        alt=""
                        className="h-10 w-16 rounded border border-border object-cover"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <p className="max-w-xs truncate font-medium">{asset.filename}</p>
                      <p className="text-xs text-muted-foreground">{asset.mimeType}</p>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {asset.owner.email}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell tabular-nums">
                      {formatBytes(locale, asset.size)}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell tabular-nums">
                      {<Timestamp value={asset.createdAt} />}
                    </td>
                    <td className="px-5 py-3 text-end">
                      <MediaRowActions mediaId={asset.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
