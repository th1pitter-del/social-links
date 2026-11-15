import { createElement } from 'react'
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

import { brandMarkIcon } from '@/lib/brand-mark-icons'
import { splitBrandName } from '@/lib/brand-name'
import { absoluteUrl, SITE_URL } from '@/lib/seo'
import { getSiteSettings } from '@/lib/settings'

export const alt = 'Create a short link that unlocks after a visitor completes social steps'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Reads the admin-managed name, so it cannot be prerendered at build time.
export const dynamic = 'force-dynamic'

const platforms = ['YouTube', 'Instagram', 'Facebook', 'TikTok', 'Discord', 'Spotify', 'Website']

// Same wordmark face as the site (Orbitron 900). The card renderer needs the
// font binaries, so they are fetched once and inlined. Inter carries the rest
// of the card: satori falls back to the first registered face for everything,
// so a body font has to be present or the whole card would turn techno.
const BRAND_FONT_URL =
  'https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nysimxpg.ttf'
const TEXT_FONT_URL =
  'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf'
const TEXT_BOLD_FONT_URL =
  'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf'

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

const fontsPromise = Promise.all([
  fetchFont(BRAND_FONT_URL),
  fetchFont(TEXT_FONT_URL),
  fetchFont(TEXT_BOLD_FONT_URL),
]).then(([brand, text, textBold]) => ({ brand, text, textBold }))

function loadFonts() {
  return fontsPromise
}

/**
 * The configured logo (upload or bundled mark) as an inline image, or null so
 * the card falls back to the built-in mark. Formats the card renderer cannot
 * draw are skipped rather than breaking the whole image.
 */
async function loadLogo(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(absoluteUrl(url))
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!response.ok || !/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(type)) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

export default async function Image() {
  const [site, t] = await Promise.all([
    getSiteSettings(),
    // Crawlers do not send the locale cookie; pin the share card to English.
    getTranslations({ locale: 'en', namespace: 'meta' }),
  ])
  const host = new URL(SITE_URL).host
  const nameParts = splitBrandName(site.name, site.brand.splitChars)
  const MarkIcon = brandMarkIcon(site.logoIcon)
  const logo = await loadLogo(site.logoUrl)
  const { brand: brandFont, text: textFont, textBold: textBoldFont } = await loadFonts()
  const brandFontFamily = brandFont ? 'Orbitron' : textFont ? 'Inter' : 'sans-serif'
  // Arabic script is joined; tracking it breaks the letter connections.
  const brandTracking = /[\u0600-\u06FF]/.test(site.name) ? 0 : 4

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          padding: 72,
          background: 'linear-gradient(135deg, #0B0C09 0%, #050505 55%, #12160A 100%)',
          color: '#FFFFFF',
          fontFamily: textFont ? 'Inter' : 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -140,
            width: 460,
            height: 460,
            borderRadius: 120,
            border: '2px solid rgba(213,255,47,0.16)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- satori renders this card
            <img
              src={logo}
              width={64}
              height={64}
              alt=""
              style={{ borderRadius: 18, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: '#D5FF2F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {MarkIcon ? (
                createElement(MarkIcon, {
                  width: 36,
                  height: 36,
                  strokeWidth: 2.4,
                  color: '#050505',
                })
              ) : (
                <div style={{ display: 'flex', position: 'relative', width: 36, height: 36 }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 15,
                      left: 2,
                      width: 32,
                      height: 6,
                      borderRadius: 3,
                      background: '#050505',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 15,
                      width: 6,
                      height: 32,
                      borderRadius: 3,
                      background: '#050505',
                    }}
                  />
                </div>
              )}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontFamily: brandFontFamily,
              fontSize: 30,
              fontWeight: 900,
              letterSpacing: brandTracking,
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: site.brand.color1 || '#FFFFFF' }}>{nameParts.first}</span>
            <span style={{ color: site.brand.color2 || '#FFFFFF' }}>{nameParts.second}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              maxWidth: 900,
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {site.tagline}
          </div>
          <div
            style={{
              display: 'flex',
              maxWidth: 840,
              fontSize: 28,
              lineHeight: 1.45,
              color: '#92958C',
            }}
          >
            {t('description')}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {platforms.map((platform) => (
              <div
                key={platform}
                style={{
                  display: 'flex',
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: '1px solid #292A26',
                  background: '#151614',
                  color: '#D5FF2F',
                  fontSize: 20,
                }}
              >
                {platform}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', marginLeft: 24, fontSize: 24, color: '#92958C' }}>
            {host}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(textFont
          ? [{ name: 'Inter', data: textFont, weight: 400 as const, style: 'normal' as const }]
          : []),
        ...(textBoldFont
          ? [{ name: 'Inter', data: textBoldFont, weight: 600 as const, style: 'normal' as const }]
          : []),
        ...(brandFont
          ? [{ name: 'Orbitron', data: brandFont, weight: 900 as const, style: 'normal' as const }]
          : []),
      ],
    },
  )
}
