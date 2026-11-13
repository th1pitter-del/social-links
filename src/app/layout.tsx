import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { JsonLd } from '@/components/json-ld'
import { AdNetworkCode } from '@/components/ads/ad-network-code'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { isLocale, localeDirection, type Locale } from '@/i18n/config'
import { absoluteUrl, SITE_URL } from '@/lib/seo'
import { getSettingMap, getSiteSettings, getThemeOverrideCss } from '@/lib/settings'
import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  const t = await getTranslations('meta')
  const description = site.hasCustomTagline ? site.tagline : t('description')

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.name} — ${t('title')}`,
      template: `%s · ${site.name}`,
    },
    description,
    applicationName: site.name,
    // Single source of truth for the tab icon: the admin upload when set, the
    // shipped SVG (SVG first, ICO fallback for older tabs) otherwise. Keeping it
    // in metadata avoids a second file-convention `<link rel="icon">` outranking
    // the admin value.
    icons: {
      icon: site.faviconUrl
        ? [{ url: site.faviconUrl }]
        : [
            { url: '/brand/link-unlocker-favicon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: '16x16 24x24 32x32 48x48' },
          ],
    },
    openGraph: {
      type: 'website',
      title: `${site.name} — ${t('title')}`,
      description,
      url: SITE_URL,
      siteName: site.name,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [rawLocale, messages, settingMap, site, meta] = await Promise.all([
    getLocale(),
    getMessages(),
    getSettingMap(),
    getSiteSettings(),
    getTranslations('meta'),
  ])
  const themeCss = getThemeOverrideCss(settingMap)
  const adNetworkCode = settingMap['ads.headScripts']?.trim() ?? ''
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'
  const description = site.hasCustomTagline ? site.tagline : meta('description')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: site.name,
        url: SITE_URL,
        logo: absoluteUrl(site.logoUrl || site.faviconUrl || '/brand/link-unlocker-mark.svg'),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
