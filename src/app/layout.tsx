import type { Metadata } from 'next'
import { Geist, Geist_Mono, Orbitron } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { JsonLd } from '@/components/json-ld'
import { AdNetworkCode } from '@/components/ads/ad-network-code'
import { BootLoader } from '@/components/boot-loader'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { isLocale, localeDirection, type Locale } from '@/i18n/config'
import { absoluteUrl, SITE_URL } from '@/lib/seo'
import { getSettingMap, getSiteSettings } from '@/lib/settings'
import { getThemeOverrideCss } from '@/lib/theme-palette'
import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Wordmark face: the techno geometric display used by bigame.ma for its brand.
// Only the brand name uses it; body copy stays on Geist.
const orbitron = Orbitron({
  variable: '--font-brand-family',
  weight: '900',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  const t = await getTranslations('meta')
  // Admin copy wins per locale; empty fields keep the generated defaults.
  const title = site.seoTitle || `${site.name} — ${t('title')}`
  const description = site.seoDescription || (site.hasCustomTagline ? site.tagline : t('description'))
  const shareImage = site.seoImage ? absoluteUrl(site.seoImage) : undefined
  const icon = site.seoIcon || site.faviconUrl

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${site.name}`,
    },
    description,
    applicationName: site.name,
    // Single source of truth for the tab icon: the admin SEO icon, then the
    // uploaded favicon, then the shipped SVG (SVG first, ICO fallback for older
    // tabs) otherwise. Keeping it in metadata avoids a second file-convention
    // `<link rel="icon">` outranking the admin value.
    icons: {
      icon: icon
        ? [{ url: icon }]
        : [
            { url: '/brand/link-unlocker-favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: '16x16 24x24 32x32 48x48' },
          ],
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: SITE_URL,
      siteName: site.name,
      images: shareImage ? [{ url: shareImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: shareImage ? [shareImage] : undefined,
    },
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [rawLocale, messages, settingMap, site, meta, common] = await Promise.all([
    getLocale(),
    getMessages(),
    getSettingMap(),
    getSiteSettings(),
    getTranslations('meta'),
    getTranslations('common'),
  ])
  const themeCss = getThemeOverrideCss(settingMap)
  const adNetworkCode = settingMap['ads.headScripts']?.trim() ?? ''
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'
  const description =
    site.seoDescription || (site.hasCustomTagline ? site.tagline : meta('description'))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: site.name,
        url: SITE_URL,
        logo: absoluteUrl(
          site.logoUrl || site.seoIcon || site.faviconUrl || '/brand/link-unlocker-mark.svg',
        ),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: site.name,
        description,
        inLanguage: new Intl.Locale(locale).toString(),
      },
    ],
  }

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Browser extensions write attributes onto body before React arrives, so
          this element is allowed to differ from the server markup. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <JsonLd data={jsonLd} />
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
        <AdNetworkCode code={adNetworkCode} />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            {/* After next-themes' blocking script, before the page, so the
                splash paints in the right theme and owns the first paint. */}
            <BootLoader label={common('loading')} />
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
