import { AdSlot } from '@/components/ads/ad-slot'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function UnlockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />

      <div className="flex flex-1 flex-col">
        <AdSlot placement="unlock-top" className="mx-auto w-full max-w-5xl px-4 pt-6" />
        {children}
        <AdSlot placement="unlock-bottom" className="mx-auto w-full max-w-5xl px-4 pb-8" />
      </div>

      <SiteFooter bordered={false} showBrand={false} compact />
    </div>
  )
}
