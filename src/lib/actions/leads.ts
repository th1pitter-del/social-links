'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function deleteEmailLead(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireUser()
  const t = await getTranslations('errors')
  if (!id) return { ok: false, error: t('missingLeadId') }

  const lead = await prisma.emailLead.findFirst({
    where: { id, link: { ownerId: session.user.id } },
    select: { id: true },
  })
  if (!lead) return { ok: false, error: t('leadNotFound') }

  await prisma.emailLead.delete({ where: { id } })
  revalidatePath('/dashboard/leads')
  return { ok: true }
}
