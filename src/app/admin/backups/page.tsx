import { DatabaseBackup, FolderArchive, ShieldAlert } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BackupCreatePanel } from '@/components/admin/backup-create-panel'
import { BackupRowActions } from '@/components/admin/backup-row-actions'
import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { Timestamp } from '@/components/timestamp'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { getOpsCapabilities, getOpsSettings, syncOpenOperations } from '@/lib/system/ops'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('backups') }
}

const STATUS_VARIANT = {
  PENDING: 'secondary',
  RUNNING: 'secondary',
  READY: 'default',
  FAILED: 'destructive',
} as const

const KIND_LABEL = {
  DATABASE: 'kind.database',
  FILES: 'kind.files',
  FULL: 'kind.full',
} as const

export default async function AdminBackupsPage() {
  await requireAdmin()
  await syncOpenOperations()

  const [capabilities, settings, backups, t, locale] = await Promise.all([
    getOpsCapabilities(),
    getOpsSettings(),
    prisma.systemBackup.findMany({ orderBy: { startedAt: 'desc' }, take: 100 }),
    getTranslations('admin.backups'),
    getLocale(),
  ])

  const ready = backups.filter((backup) => backup.status === 'READY')
  const totalBytes = ready.reduce((sum, backup) => sum + Number(backup.sizeBytes ?? 0), 0)
  const last = ready[0] ?? null
  const busy = backups.some((backup) => backup.status === 'RUNNING' || backup.status === 'PENDING')

  const unavailableReason =
    capabilities.reason === 'managed-host'
      ? t('unavailableManaged')
      : capabilities.reason === 'disabled'
        ? t('unavailableDisabled')
        : t('unavailableEnvironment')

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} icon={DatabaseBackup} />

      {!capabilities.backupsAvailable ? (
        <Panel>
          <PanelContent className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <ShieldAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t('unavailableTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{unavailableReason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('storagePath')}: <span className="font-mono">{capabilities.backupDir}</span>
              </p>
            </div>
          </PanelContent>
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label={t('stats.ready')}
              value={ready.length}
              hint={t('stats.retention', { count: settings.retention })}
              tone="emerald"
              icon={DatabaseBackup}
            />
            <StatCard
              label={t('stats.size')}
              value={formatBytes(locale, totalBytes)}
              tone="violet"
              icon={FolderArchive}
            />
            <StatCard
              label={t('stats.last')}
              value={last ? formatBytes(locale, Number(last.sizeBytes ?? 0)) : t('stats.none')}
              hint={last ? t(`kind.${last.kind.toLowerCase()}`) : undefined}
              tone="sky"
              icon={FolderArchive}
            />
          </div>

          <Panel>
            <PanelHeader title={t('create.title')} description={t('create.description')} />
            <PanelContent>
              <BackupCreatePanel disabled={busy} />
              <p className="mt-3 text-xs text-muted-foreground">
                {t('storagePath')}: <span className="font-mono">{capabilities.backupDir}</span>
              </p>
            </PanelContent>
          </Panel>
        </>
      )}

      <Panel>
        <PanelHeader title={t('panelTitle')} description={t('panelDescription')} />
        {backups.length === 0 ? (
          <PanelContent>
            <EmptyState>{t('empty')}</EmptyState>
          </PanelContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('colBackup')}</th>
                  <th className="px-5 py-3 font-medium">{t('colStatus')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('colSize')}</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">{t('colCreated')}</th>
                  <th className="px-5 py-3 text-end font-medium">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {backups.map((backup) => {
                  const readyBackup = backup.status === 'READY' && Boolean(backup.filename)
                  return (
                    <tr key={backup.id} className="hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <p className="font-medium">{t(KIND_LABEL[backup.kind])}</p>
                        <p className="max-w-[22rem] truncate font-mono text-xs text-muted-foreground">
                          {backup.filename ?? backup.id}
                        </p>
                        {backup.error ? (
                          <p className="mt-1 max-w-sm text-xs text-error">{backup.error}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_VARIANT[backup.status]}>{t(`status.${backup.status}`)}</Badge>
                        {backup.restoredAt ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {t('restored')}: <Timestamp value={backup.restoredAt} />
                          </p>
                        ) : null}
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground tabular-nums sm:table-cell">
                        {backup.sizeBytes ? formatBytes(locale, Number(backup.sizeBytes)) : '—'}
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                        <Timestamp value={backup.startedAt} />
                        <p className="text-xs">{backup.createdByEmail ?? backup.createdByName ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <BackupRowActions
                          backupId={backup.id}
                          filename={backup.filename}
                          ready={readyBackup}
                          disabled={!capabilities.backupsAvailable || busy}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
