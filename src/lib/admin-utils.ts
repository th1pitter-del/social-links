import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

type AuditKey = 'actorId'|'actorName'|'actorEmail'|'action'|'targetType'|'targetId'|'details'|'ipHash'

export async function writeAudit(
  input: Partial<Record<AuditKey, string | null>>,
) {
  const session = await requireAdmin().catch(() => null)
  const actorId = input.actorId ?? session?.user.id ?? 'system'
  const actorName = input.actorName ?? session?.user.name ?? null
  const actorEmail = input.actorEmail ?? session?.user.email ?? null

  await prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      actorEmail,
      action: input.action ?? 'unknown',
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      details: input.details ?? null,
      ipHash: input.ipHash ?? null,
    },
  })
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany()
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value
    return acc
  }, {})
}

export async function setSetting(key: string, value: string, byUserId?: string) {
  const session = await requireAdmin().catch(() => null)
  await prisma.setting.upsert({
    where: { key },
    create: { key, value, updatedBy: byUserId ?? session?.user.id ?? null },
    update: { value, updatedBy: byUserId ?? session?.user.id ?? null, updatedAt: new Date() },
  })
}
