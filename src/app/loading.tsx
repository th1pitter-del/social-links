import { getTranslations } from 'next-intl/server'

import { PulseLoader } from '@/components/pulse-loader'

/**
 * The public pages are rendered from admin-managed content, so a slow response
 * would leave the previous page on screen with no sign of the next one. The
 * branded loader holds the viewport until the route arrives. The admin console
 * keeps its own shape-matching skeleton in `admin/loading.tsx`.
 */
export default async function SiteLoading() {
  const t = await getTranslations('common')
  return (
    <div className="fixed inset-0 z-[100] grid h-dvh w-full place-items-center overflow-hidden bg-background">
      <PulseLoader label={t('loading')} />
    </div>
  )
}
