'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('blog.error')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('description')}</p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw />
        {t('retry')}
      </Button>
    </main>
  )
}
