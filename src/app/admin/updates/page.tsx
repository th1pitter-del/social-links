import { GitBranch, ShieldAlert } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { PageHeader } from '@/components/admin/page-header'
import { UpdateCheckPanel } from '@/components/admin/update-check-panel'
import { UpdateRowActions } from '@/components/admin/update-row-actions'
import { Timestamp } from '@/components/timestamp'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import {
  getLocalGitInfo,
  getOpsCapabilities,
  getOpsSettings,
  syncOpenOperations,
} from '@/lib/system/ops'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('updates') }
}

const STATUS_VARIANT = {
  INSTALLING: 'secondary',
  INSTALLED: 'default',
  FAILED: 'destructive',
  ROLLED_BACK: 'outline',
} as const

export default async function AdminUpdatesPage() {
  await requireAdmin()
  await syncOpenOperations()

  const [capabilities, git, settings, history, t] = await Promise.all([
    getOpsCapabilities(),
    getLocalGitInfo(),
    getOpsSettings(),
    prisma.systemUpdate.findMany({ orderBy: { startedAt: 'desc' }, take: 50 }),
    getTranslations('admin.updates'),
  ])

  const unavailableReason =
    capabilities.reason === 'managed-host'
      ? t('unavailableManaged')
      : capabilities.reason === 'disabled'
        ? t('unavailableDisabled')
        : t('unavailableEnvironment')

  const busy = history.some((update) => update.status === 'INSTALLING')

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} icon={GitBranch} />

      {!capabilities.updatesAvailable ? (
        <Panel>
          <PanelContent className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <ShieldAlert className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t('unavailableTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{unavailableReason}</p>
            </div>
          </PanelContent>
        </Panel>
      ) : null}

      {git ? (
        <Panel>
          <PanelHeader title={t('currentTitle')} description={t('currentDescription')} />
          <PanelContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground uppercase">{t('currentCommit')}</dt>
                <dd className="mt-1 font-mono">{git.shortCommit}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">{t('branch')}</dt>
                <dd className="mt-1 font-mono">{git.branch}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground uppercase">{t('remote')}</dt>
                <dd className="mt-1 truncate font-mono text-xs">{git.remoteUrl ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase">{t('workingTree')}</dt>
                <dd className="mt-1">
                  <Badge variant={git.dirty ? 'destructive' : 'secondary'}>
                    {git.dirty ? t('dirty') : t('clean')}
                  </Badge>
                </dd>
              </div>
            </dl>
            {git.dirty ? (
              <p className="mt-3 text-xs text-error">{t('dirtyBlocked')}</p>
            ) : null}
            {settings.processManager === 'none' ? (
              <p className="mt-3 text-xs text-muted-foreground">{t('restartNote')}</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('processManagerNote', {
                  manager: settings.processManager,
                  name: settings.processName,
                })}
              </p>
            )}
          </PanelContent>
        </Panel>
      ) : null}

      {capabilities.updatesAvailable ? (
        <Panel>
          <PanelHeader title={t('checkTitle')} description={t('checkDescription')} />
          <PanelContent>
            <UpdateCheckPanel dirty={git?.dirty ?? false} />
          </PanelContent>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title={t('historyTitle')} description={t('historyDescription')} />
        {history.length === 0 ? (
          <PanelContent>
            <EmptyState>{t('historyEmpty')}</EmptyState>
          </PanelContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-start text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('colChange')}</th>
                  <th className="px-5 py-3 font-medium">{t('colStatus')}</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">{t('colActor')}</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">{t('colStarted')}</th>
                  <th className="px-5 py-3 text-end font-medium">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((update) => (
                  <tr key={update.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <p className="flex items-center gap-2 font-mono text-xs">
                        <span>{update.fromCommit.slice(0, 7)}</span>
                        <span aria-hidden>→</span>
                        <span>{update.toCommit.slice(0, 7)}</span>
                        {update.isRollback ? (
                          <Badge variant="outline">{t('rollbackBadge')}</Badge>
                        ) : null}
                      </p>
                      {update.changelog ? (
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                          {update.changelog.split('\n')[0]}
                        </p>
                      ) : null}
                      {update.error ? (
                        <p className="mt-1 max-w-md text-xs text-error">{update.error}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[update.status]}>
                        {t(`status.${update.status}`)}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {update.actorEmail ?? '—'}
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                      <Timestamp value={update.startedAt} />
                    </td>
                    <td className="px-5 py-3">
                      {update.status === 'INSTALLED' ? (
                        <div className="flex justify-end">
                          <UpdateRowActions
                            updateId={update.id}
                            disabled={!capabilities.updatesAvailable || busy || (git?.dirty ?? true)}
                          />
                        </div>
                      ) : (
                        <p className="text-end text-xs text-muted-foreground">—</p>
                      )}
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
