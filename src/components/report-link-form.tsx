'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitAbuseReport } from '@/lib/actions/reports'
import { ABUSE_REASONS } from '@/lib/validation'

export function ReportLinkForm({ slug }: { slug: string }) {
  const t = useTranslations('report')
  const [pending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [reason, setReason] = useState<(typeof ABUSE_REASONS)[number]>('SPAM')
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reasonLabels = {
    SPAM: t('reasons.SPAM'),
    MALWARE: t('reasons.MALWARE'),
    ILLEGAL: t('reasons.ILLEGAL'),
    COPYRIGHT: t('reasons.COPYRIGHT'),
    IMPERSONATION: t('reasons.IMPERSONATION'),
    OTHER: t('reasons.OTHER'),
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await submitAbuseReport({
        slug,
        reason,
        details: details.trim(),
        reporterEmail: email.trim(),
      })

      if (!result.ok) {
        setError(result.fieldErrors?.details?.[0] ?? result.error)
        toast.error(result.error)
        return
      }

      setSubmitted(true)
      toast.success(t('receivedBody'))
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <h2 className="font-medium">{t('receivedTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('receivedBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{t('linkLabel')}</Label>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">/u/{slug}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('reasonLabel')}</Label>
        <Select
          value={reason}
          onValueChange={(value) => setReason(value as (typeof ABUSE_REASONS)[number])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ABUSE_REASONS.map((value) => (
              <SelectItem key={value} value={value}>
                {reasonLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">{t('detailsLabel')}</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t('detailsPlaceholder')}
          className="min-h-32"
          maxLength={2000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reporterEmail">{t('emailLabel')}</Label>
        <Input
          id="reporterEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        onClick={submit}
        disabled={pending || details.trim().length < 10}
        className="w-full sm:w-auto"
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t('submit')}
      </Button>
    </div>
  )
}
