import { getTranslations } from 'next-intl/server'
import { ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/format'
import { stepEvidence } from '@/lib/verification-evidence'

/**
 * The owner's record of what was actually confirmed, shown on both the member
 * and admin link pages. It appears only once a step on this link can be checked
 * — a link made of one-press steps has nothing to report here.
 */
export async function StepEvidence({ linkId, locale }: { linkId: string; locale: string }) {
  const rows = await stepEvidence(linkId)
  if (!rows.some((row) => row.checkable)) return null

  const t = await getTranslations('verification')
  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" />
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-start text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-start font-medium">{t('colStep')}</th>
              <th className="px-5 py-3 text-end font-medium">{t('colOpened')}</th>
              <th className="px-5 py-3 text-end font-medium">{t('colVerified')}</th>
              <th className="px-5 py-3 text-end font-medium">{t('colUnchecked')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.actionId}>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.label}</span>
                    <Badge variant={row.checkable ? 'secondary' : 'outline'}>
                      {row.checkable ? t('checkable') : t('notCheckable')}
                    </Badge>
                  </div>
                </td>
                <td className="px-5 py-3 text-end text-muted-foreground tabular-nums">
                  {formatNumber(locale, row.opened)}
                </td>
                <td className="px-5 py-3 text-end font-medium tabular-nums">
                  {row.checkable ? formatNumber(locale, row.verified) : '—'}
                </td>
                <td className="px-5 py-3 text-end text-muted-foreground tabular-nums">
                  {row.checkable ? formatNumber(locale, row.unchecked) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t('uncheckedNote')}</p>
    </section>
  )
}