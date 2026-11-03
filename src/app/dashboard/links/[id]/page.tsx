import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { BarChart, type BarChartPoint } from '@/components/admin/bar-chart'
import { CopyButton } from '@/components/copy-button'
import { FunnelStages } from '@/components/dashboard/funnel-stages'
import { StatusPill } from '@/components/status-pill'
import { LinkForm, type LinkFormValues } from '@/components/link-form'
import { LinkRowActions } from '@/components/link-row-actions'
import { Button } from '@/components/ui/button'
import { getActionOptionMap, getEnabledActionOptions } from '@/lib/action-catalog'
import type { ActionOptionView } from '@/lib/action-defaults'
import { buildDayBuckets, windowStart } from '@/lib/activity-buckets'
import { prisma } from '@/lib/prisma'
import { verifierFor } from '@/lib/verification'
import { requireUser } from '@/lib/session'
import { isExpired } from '@/lib/unlock'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta')
  return { title: t('editLink') }
}

const DAYS = 14

export default async function EditLinkPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireUser()
  const t = await getTranslations('dashboard.editLink')
  const tc = await getTranslations('dashboard.common')
  const ts = await getTranslations('dashboard.status')
  const locale = await getLocale()

  const link = await prisma.link.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      slug: true,
      title: true,
      coverImage: true,
      status: true,
      contentType: true,
      targetUrl: true,
      fileId: true,
      file: { select: { filename: true } },
      expiresAt: true,
      actions: { orderBy: { position: 'asc' }, select: { type: true, label: true, target: true } },
      _count: { select: { unlocks: true } },
    },
  })

  if (!link) notFound()

  const actionCatalog = await getActionOptionMap()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = `${appUrl}/u/${link.slug}`

  const since = windowStart(DAYS)
  const [views, starts, completed, seriesEvents] = await Promise.all([
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'VIEW' } }),
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'UNLOCK_START' } }),
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'UNLOCK_COMPLETE' } }),
    prisma.analyticsEvent.findMany({
      where: { linkId: link.id, type: { in: ['VIEW', 'UNLOCK_COMPLETE'] }, createdAt: { gte: since } },
      select: { type: true, createdAt: true },
    }),
  ])
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  const startsShare = views > 0 ? Math.round((starts / views) * 100) : 0
  const completedShare = views > 0 ? Math.round((completed / views) * 100) : 0
  const stages = [
    { label: t('statViews'), value: views, share: 100 },
    {
      label: t('statStarts'),
      value: starts,
      share: startsShare,
      note: t('shareOfViews', { percent: startsShare }),
    },
    {
      label: t('statCompleted'),
      value: completed,
      share: completedShare,
      note: t('shareOfStarts', {
        percent: starts > 0 ? Math.round((completed / starts) * 100) : 0,
      }),
    },
  ]

  const series = buildDayBuckets(seriesEvents, DAYS)
  const buckets: BarChartPoint[] = series.buckets.map((bucket) => ({
    label: `${bucket.date.getDate()}`,
    primary: bucket.primary,
    secondary: bucket.secondary,
  }))

  const leads = link.actions.some((action) => actionCatalog.get(action.type)?.behavior === 'EMAIL')
    ? await prisma.emailLead.findMany({
        where: { linkId: link.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, email: true, consentAt: true },
      })
    : []

  // Public-record checks leave a proof string behind; the owner gets to read it.
  const verifiable = link.actions.some((action) =>
    verifierFor(actionCatalog.get(action.type)?.platform),
  )
  const proofs = verifiable
    ? await prisma.unlockActionCompletion.findMany({
        where: { verified: true, linkAction: { linkId: link.id } },
        orderBy: { completedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          proof: true,
          completedAt: true,
          linkAction: {
            select: {
              label: true,
              option: { select: { label: true, platform: { select: { label: true } } } },
            },
          },
        },
      })
    : []

  const initial: LinkFormValues = {
    title: link.title,
    targetUrl: link.contentType === 'URL' ? (link.targetUrl ?? '') : '',
    coverImage: link.coverImage ?? '',
    slug: link.slug,
    expiresAt: link.expiresAt ? toDatetimeLocal(link.expiresAt) : '',
    contentType: link.contentType === 'FILE' ? 'FILE' : 'URL',
    fileId: link.fileId ?? '',
    fileName: link.file?.filename ?? '',
    actions: link.actions.map((action) => ({
      type: action.type,
      label: action.label ?? '',
      target: action.target,
    })),
  }

  // Keep existing actions selectable even if an admin later hides their type,
  // so editing a link never silently drops an action.
  const enabledActionTypes = await getEnabledActionOptions()
  const usedTypes = new Set(link.actions.map((action) => action.type))
  const actionTypes: ActionOptionView[] = [
    ...enabledActionTypes,
    ...[...usedTypes]
      .filter((type) => !enabledActionTypes.some((option) => option.key === type))
      .map((type) => {
        const option = actionCatalog.get(type)
        return {
          key: type,
          label: t('hiddenAction', { label: option?.label ?? type }),
          platform: option?.platform ?? null,
          icon: option?.icon ?? 'link',
          behavior: option?.behavior ?? 'URL',
        }
      }),
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{link.title}</h1>
            <StatusPill status={link.status} label={ts(link.status.toLowerCase())} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {link.expiresAt
              ? isExpired(link.expiresAt)
                ? t('expired')
                : t('expiresOn', { date: dateFormatter.format(link.expiresAt) })
              : t('noExpiry')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/u/${link.slug}?preview=1`} target="_blank">
            <Button variant="outline">{tc('preview')}</Button>
          </Link>
          <LinkRowActions id={link.id} slug={link.slug} status={link.status} />
        </div>
      </div>

      {/* One card for this link's numbers: the funnel answers "where do visitors
          stop", the series under it answers "when". Splitting them into three
          identical number tiles, as before, answered neither. */}
      <div className="rounded-2xl border bg-card">
        <div className="p-5">
          <h2 className="text-sm font-medium">{t('funnelTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('funnelDescription')}</p>
          {views > 0 ? (
            <FunnelStages stages={stages} locale={locale} className="mt-4" />
          ) : (
            <p className="mt-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t('noVisits')}
            </p>
          )}
        </div>
        <div className="border-t p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-sm font-medium">{t('activityTitle')}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('lastDays', { days: DAYS })}
            </span>
          </div>
          <BarChart
            className="mt-4"
            points={buckets}
            startDate={series.startDate}
            primaryLabel={t('statViews')}
            secondaryLabel={t('statCompleted')}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{t('publicUrl')}</p>
          <p className="truncate text-sm font-medium">{publicUrl}</p>
        </div>
        <CopyButton value={publicUrl} />
        <Link href={`/u/${link.slug}`} target="_blank">
          <ExternalLink />
        </Link>
      </div>

      <LinkForm mode="edit" linkId={link.id} initial={initial} actionTypes={actionTypes} />

      {link.actions.some((action) => action.type === 'EMAIL') ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{t('leadsTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('leadsDescription')}</p>
            </div>
            {leads.length > 0 ? (
              <a href={`/dashboard/links/${link.id}/leads`} download>
                <Button variant="outline" size="sm">
                  {tc('exportCsv')}
                </Button>
              </a>
            ) : null}
          </div>

          {leads.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
              {t('noLeads')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('colEmail')}</th>
                    <th className="px-5 py-3 font-medium">{t('colConsent')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-5 py-3">{lead.email}</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">
                        {dateFormatter.format(lead.consentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {verifiable ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-medium">{t('verifiedTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('verifiedDescription')}</p>
          </div>

          {proofs.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
              {t('noVerified')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('colVerifiedAction')}</th>
                    <th className="px-5 py-3 font-medium">{t('colEvidence')}</th>
                    <th className="px-5 py-3 font-medium">{t('colVerifiedAt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {proofs.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {row.linkAction.option?.platform?.label ?? row.linkAction.label}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground" dir="ltr">
                        {row.proof}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">
                        {dateFormatter.format(row.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

/** Formats a Date for a `datetime-local` input using the server's local time. */
function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}
