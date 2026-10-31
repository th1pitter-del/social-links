import { FileLock2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { FileRowActions } from '@/components/admin/file-row-actions'
import { EmptyState, Panel, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { Timestamp } from '@/components/timestamp'
import { StatCard } from '@/components/admin/stat-card'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('lockedFiles') }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function AdminFilesPage() {
  await requireAdmin()
  const t = await getTranslations('admin')

  const [files, agg] = await Promise.all([
    prisma.storedFile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        owner: { select: { email: true } },
        links: { select: { id: true, title: true } },
      },
    }),
    prisma.storedFile.aggregate({
      _count: { _all: true },
      _sum: { size: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('files.title')}
        description={t('files.description')}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('files.totalFiles')} value={agg._count._all} tone="sky" icon={FileLock2} />
        <StatCard
          label={t('files.storageUsed')}
          value={formatSize(agg._sum.size ?? 0)}
          tone="violet"
          icon={FileLock2}
        />
      </div>

      {files.length === 0 ? (
        <EmptyState>{t('files.noFiles')}</EmptyState>
      ) : (
        <Panel>
          <PanelHeader title={t('files.panelTitle')} description={t('files.panelDescription')} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('files.colFile')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('files.colOwner')}</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">{t('files.colSize')}</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('files.colLinks')}</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('files.colUploaded')}</th>
                  <th className="px-5 py-3 text-end font-medium">{t('files.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <p className="max-w-xs truncate font-medium">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">{file.mimeType}</p>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {file.owner.email}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell tabular-nums">
                      {formatSize(file.size)}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                      {file.links.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="max-w-xs truncate">
                          {file.links.map((link) => link.title).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell tabular-nums">
                      {<Timestamp value={file.createdAt} />}
                    </td>
                    <td className="px-5 py-3 text-end">
                      <FileRowActions fileId={file.id} filename={file.filename} />
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
