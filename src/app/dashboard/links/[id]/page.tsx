import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/copy-button'
import { LinkForm, type LinkFormValues } from '@/components/link-form'
import { LinkRowActions } from '@/components/link-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getActionOptionMap, getEnabledActionOptions } from '@/lib/action-catalog'
import type { ActionOptionView } from '@/lib/action-defaults'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { isExpired } from '@/lib/unlock'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.meta')
  return { title: t('editLink') }
}

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

  const [views, starts, completed] = await Promise.all([
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'VIEW' } }),
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'UNLOCK_START' } }),
    prisma.analyticsEvent.count({ where: { linkId: link.id, type: 'UNLOCK_COMPLETE' } }),
  ])
  const conversion = views > 0 ? Math.round((completed / views) * 100) : 0

  const leads = link.actions.some((action) => actionCatalog.get(action.type)?.behavior === 'EMAIL')
    ? await prisma.emailLead.findMany({
        where: { linkId: link.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, email: true, consentAt: true },
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
            <Badge variant={link.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {ts(link.status.toLowerCase())}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {link.expiresAt
              ? isExpired(link.expiresAt)
                ? t('expired')
                : t('expiresOn', { date: link.expiresAt.toISOString().slice(0, 10) })
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

      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t('statViews')} value={views} />
        <Stat label={t('statStarts')} value={starts} />
        <Stat
          label={t('statCompleted')}
          value={completed}
          hint={t('conversionHint', { percent: conversion })}
        />
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
                      <td className="px-5 py-3 text-muted-foreground">
                        {lead.consentAt.toISOString().slice(0, 10)}
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

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
