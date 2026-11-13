import { GitBranch, ShieldAlert } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { EmptyState, Panel, PanelContent, PanelHeader } from '@/components/admin/panel'
import { FilterTabs } from '@/components/admin/filter-tabs'
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

export default async function AdminUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  await requireAdmin()
  await syncOpenOperations()

  const { view } = await searchParams
  const showArchived = view === 'archived'

  const [capabilities, git, settings, history, activeCount, archivedCount, installing, t] =
    await Promise.all([
      getOpsCapabilities(),
      getLocalGitInfo(),
      getOpsSettings(),
      prisma.systemUpdate.findMany({
        where: { archivedAt: showArchived ? { not: null } : null },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),
      prisma.systemUpdate.count({ where: { archivedAt: null } }),
      prisma.systemUpdate.count({ where: { archivedAt: { not: null } } }),
      prisma.systemUpdate.count({ where: { status: 'INSTALLING' } }),
      getTranslations('admin.updates'),
    ])

  const unavailableReason =
    capabilities.reason === 'managed-host'
      ? t('unavailableManaged')
      : capabilities.reason === 'disabled'
        ? t('unavailableDisabled')
        : t('unavailableEnvironment')

  const busy = installing > 0

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          items={[
            {
              label: t('tabActive'),
              href: '/admin/updates',
              active: !showArchived,
              count: activeCount,
            },
            {
              label: t('tabArchived'),
              href: '/admin/updates?view=archived',
              active: showArchived,
              count: archivedCount,
            },
          ]}
        />
      </div>

      <Panel>
        <PanelHeader title={t('historyTitle')} description={t('historyDescription')} />
        {history.length === 0 ? (
          <PanelContent>
            <EmptyState>
              {t(showArchived ? 'historyEmptyArchived' : 'historyEmpty')}
            </EmptyState>
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
                    <td className="px-5 py-3 align-top">
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
                        <details className="group mt-1 max-w-md">
                          <summary className="cursor-pointer list-none">
                            <span className="line-clamp-2 text-xs break-words text-error">
                              {update.error}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground group-open:hidden">
                              {t('showError')}
                            </span>
                            <span className="mt-0.5 hidden text-[11px] text-muted-foreground group-open:block">
                              {t('hideError')}
                            </span>
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
                            {update.error}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <Badge variant={STATUS_VARIANT[update.status]}>
                        {t(`status.${update.status}`)}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3 align-top text-muted-foreground sm:table-cell">
                      {update.actorEmail ?? '—'}
                    </td>
                    <td className="hidden px-5 py-3 align-top text-muted-foreground md:table-cell">
                      <Timestamp value={update.startedAt} />
                    </td>
                    <td className="px-5 py-3 align-top">
                      <UpdateRowActions
                        updateId={update.id}
                        archived={showArchived}
                        canRollback={!showArchived && update.status === 'INSTALLED'}
                        disabled={!capabilities.updatesAvailable || busy || (git?.dirty ?? true)}
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
