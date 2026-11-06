import Link from 'next/link'
import { Download, Mail } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { DeleteLeadButton } from '@/components/leads/delete-lead-button'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { deleteEmailLead } from '@/lib/actions/leads'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('emailLists') }
}

export default async function LeadsPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.leads')
  const locale = await getLocale()
  const countFormatter = new Intl.NumberFormat(locale)
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const leads = await prisma.emailLead.findMany({
    where: { link: { ownerId: session.user.id } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      consentAt: true,
      link: { select: { id: true, slug: true, title: true } },
    },
  })

  const uniqueEmails = new Set(leads.map((lead) => lead.email)).size

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {leads.length > 0 ? (
          <a href="/dashboard/leads/export" download>
            <Button variant="outline">
              <Download /> {t('exportAll')}
            </Button>
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm">{t('statTotal')}</span>
            <Mail className="size-4" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {countFormatter.format(leads.length)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm">{t('statUnique')}</span>
            <Mail className="size-4" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {countFormatter.format(uniqueEmails)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">{t('allAddresses')}</h2>
        </div>
        {leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('colEmail')}</th>
                  <th className="px-5 py-3 font-medium">{t('colSource')}</th>
                  <th className="px-5 py-3 font-medium">{t('colConsent')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-5 py-3 font-medium">{lead.email}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/links/${lead.link.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        {lead.link.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {dateFormatter.format(lead.consentAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DeleteLeadButton id={lead.id} action={deleteEmailLead} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
