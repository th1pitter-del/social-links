import { createElement } from 'react'
import { cn } from 'cn'

import { brandMarkIcon } from '@/lib/brand-mark-icons'
import { splitBrandName, type BrandNameStyle } from '@/lib/brand-name'

/**
 * The site mark. When an admin has uploaded a custom logo (`site.logoUrl`
 * setting), it renders that image; otherwise the selected built-in icon or the
 * shipped glyph is shown.
 *
 * The mark reads `--brand-mark-bg` / `--brand-mark-fg` so a bio page can paint
 * it in the profile's own palette; unset, the brand lime is the fallback.
 */
export function BrandMark({
  className,
  src,
  icon,
  alt = '',
}: {
  className?: string
  src?: string | null
  /** Selected `site.logoIcon` key; ignored when an image is set. */
  icon?: string | null
  alt?: string
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn('inline-block rounded-md object-contain', className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  const Icon = brandMarkIcon(icon)

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full', className)}
      style={{
        backgroundColor: 'var(--brand-mark-bg, #D5FF2F)',
        color: 'var(--brand-mark-fg, #050505)',
      }}
      aria-hidden
    >
      {Icon ? (
        createElement(Icon, { className: 'size-[58%]', strokeWidth: 2.4 })
      ) : (
        <svg
          viewBox="0 0 32 32"
          className="size-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          aria-hidden
        >
          <g transform="rotate(-45 16 16)">
            <rect x="3.6" y="11.4" width="13" height="9.2" rx="4.6" />
            <rect x="15.4" y="11.4" width="13" height="9.2" rx="4.6" />
          </g>
        </svg>
      )}
    </span>
  )
}

/**
 * The brand name with its two configured colors. A multi-word name colors the
 * first word and the remainder; a single word splits after `splitChars`
 * characters. Empty colors inherit the surrounding text color, so an
 * unconfigured site looks exactly as before.
 */
export function BrandName({
  name,
  brand,
  className,
}: {
  name: string
  brand?: BrandNameStyle
  className?: string
}) {
  const { first, second } = splitBrandName(name, brand?.splitChars ?? 0)
  if (!first && !second) return null

  const color1 = brand?.color1 ? { color: brand.color1 } : undefined
  const color2 = brand?.color2 ? { color: brand.color2 } : undefined

  return (
    <span className={className}>
      <span style={color1}>{first}</span>
      {second ? (
        <>
          {' '}
          <span style={color2}>{second}</span>
        </>
      ) : null}
    </span>
  )
}
