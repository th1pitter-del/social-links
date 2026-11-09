'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createShortLink } from '@/lib/actions/short-links'
import { SITE_URL } from '@/lib/seo'

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="text-xs text-error">{errors[0]}</p>
}

export function ShortLinkForm() {
  const t = useTranslations('dashboard.shortLinks')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [targetUrl, setTargetUrl] = useState('')
  const [code, setCode] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [created, setCreated] = useState<string | null>(null)

  const origin = typeof window === 'undefined' ? SITE_URL : window.location.origin

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    startTransition(async () => {
      const result = await createShortLink({ targetUrl, code })
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      setCreated(result.code)
      setTargetUrl('')
      setCode('')
      router.refresh()
    })
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="font-semibold">{t('createTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('createDescription')}</p>
      </div>

      {created ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Link2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t('createdLabel')}</p>
            <p className="truncate text-sm font-medium">/s/{created}</p>
          </div>
          <CopyButton value={`${origin}/s/${created}`} />
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="short-target">{t('destinationLabel')}</Label>
          <Input
            id="short-target"
            type="url"
            inputMode="url"
            required
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder={t('destinationPlaceholder')}
            autoComplete="off"
          />
          <FieldError errors={fieldErrors.targetUrl} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="short-code">{t('codeLabel')}</Label>
          <Input
            id="short-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toLowerCase())}
            placeholder={t('codePlaceholder')}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {code ? t('preview', { code }) : t('codeHint')}
          </p>
          <FieldError errors={fieldErrors.code} />
        </div>

        <FieldError errors={fieldErrors.form} />

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
          {t('submit')}
        </Button>
      </form>
    </section>
  )
}
