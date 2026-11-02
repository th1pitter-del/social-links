import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { isLocale, localeDirection, type Locale } from '@/i18n/config'
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings()
  const t = await getTranslations('meta')
  const description = site.hasCustomTagline ? site.tagline : t('description')

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: `${site.name} — ${t('title')}`,
      template: `%s · ${site.name}`,
    },
    description,
    // Single source of truth for the tab icon: the admin upload when set, the
    // shipped `public/favicon.ico` otherwise. Keeping it in metadata avoids a
    // second file-convention `<link rel="icon">` outranking the admin value.
    icons: { icon: [{ url: site.faviconUrl || '/favicon.ico' }] },
    openGraph: {
      type: 'website',
      title: `${site.name} — ${t('title')}`,
      description,
      url: appUrl,
      siteName: site.name,
    },
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [rawLocale, messages, themeCss] = await Promise.all([
    getLocale(),
    getMessages(),
    getSettingMap().then(getThemeOverrideCss),
  ])
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en'

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
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
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
