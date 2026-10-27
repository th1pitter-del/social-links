'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { writeAudit } from '@/lib/admin-utils'
import { prisma } from '@/lib/prisma'
import { consumeBySetting } from '@/lib/rate-limit'
import { requireAdmin } from '@/lib/session'
import { makeAbuseReportSchema } from '@/lib/validation'

export type ReportActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

function hashVisitorIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.BETTER_AUTH_SECRET ?? 'linkunlock'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

async function reporterIpHash() {
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? null
  return hashVisitorIp(ip)
}

/**
 * Public abuse report submission. Never exposes whether a link exists beyond
 * accepting or rejecting the report, and is rate limited per source address.
 */
export async function submitAbuseReport(raw: unknown): Promise<ReportActionResult> {
  const t = await getTranslations('errors')
  const parsed = makeAbuseReportSchema(t).safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form'
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return { ok: false, error: t('fixHighlightedFields'), fieldErrors }
  }

  const input = parsed.data
  const ipHash = await reporterIpHash()

  const limited = await consumeBySetting(
    `report:${ipHash ?? 'anon'}`,
    'limits.reportPerHour',
    5,
    60 * 60,
  )
  if (!limited.ok) {
    return { ok: false, error: t('reportsRateLimited') }
  }

  const link = await prisma.link.findUnique({
    where: { slug: input.slug },
    select: { id: true, slug: true },
  })
  if (!link) {
    return { ok: false, error: t('reportLinkNotFound') }
  }

  await prisma.abuseReport.create({
    data: {
      linkId: link.id,
      slug: link.slug,
      reason: input.reason,
      details: input.details,
      reporterEmail: input.reporterEmail ? input.reporterEmail.toLowerCase() : null,
      reporterIpHash: ipHash,
    },
  })

  revalidatePath('/admin/reports')
  return { ok: true }
}

export async function resolveAbuseReport(
  reportId: string,
  outcome: 'RESOLVED' | 'DISMISSED',
  options: { note?: string; disableLink?: boolean } = {},
): Promise<ReportActionResult> {
  const session = await requireAdmin()
  const t = await getTranslations('errors')

  const report = await prisma.abuseReport.findUnique({
    where: { id: reportId },
    select: { id: true, linkId: true, status: true },
  })
  if (!report) return { ok: false, error: t('reportNotFound') }
  if (report.status !== 'OPEN') return { ok: false, error: t('reportAlreadyClosed') }

  await prisma.$transaction(async (tx) => {
    await tx.abuseReport.update({
      where: { id: reportId },
      data: {
        status: outcome,
        resolutionNote: options.note?.trim() || null,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
      },
    })

    if (options.disableLink) {
      await tx.link.update({ where: { id: report.linkId }, data: { status: 'DISABLED' } })
    }
  })

  await writeAudit({
    action: options.disableLink ? 'report.resolve_disable' : `report.${outcome.toLowerCase()}`,
    targetType: 'abuseReport',
    targetId: reportId,
    details: JSON.stringify({ linkId: report.linkId, disableLink: !!options.disableLink }),
  })

  revalidatePath('/admin/reports')
  revalidatePath('/admin/links')
  return { ok: true }
}
