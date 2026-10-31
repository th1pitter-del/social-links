import { getTranslations } from 'next-intl/server'

function Block({ className }: { className: string }) {
  return <div aria-hidden className={`motion-safe:animate-pulse rounded-lg bg-muted ${className}`} />
}

/**
 * Admin panels read from several tables at once, so a slow query left the
 * previous page on screen with no sign that anything was happening. This
 * mirrors the overview's shape - hero, four tiles, two panels - so the wait
 * reads as the page arriving rather than as the app being stuck.
 */
export default async function AdminLoading() {
  const t = await getTranslations('admin')
  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">
        {t('common.loading')}
      </p>
      <div className="space-y-2">
        <Block className="h-7 w-52" />
        <Block className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Block className="h-40 lg:col-span-2" />
        <Block className="h-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Block className="h-64 lg:col-span-2" />
        <Block className="h-64" />
      </div>
    </div>
  )
}
