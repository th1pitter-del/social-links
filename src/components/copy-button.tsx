'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useTranslations('common')
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} type="button">
      {copied ? <Check /> : <Copy />}
      {label ?? (copied ? t('copied') : t('copy'))}
    </Button>
  )
}
