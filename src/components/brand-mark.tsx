import { cn } from 'cn'

/**
 * The site mark. When an admin has uploaded a custom logo (`site.logoUrl`
 * setting), it renders that image; otherwise the built-in glyph is shown.
 *
 * The glyph reads `--brand-mark-bg` / `--brand-mark-fg` so a bio page can paint
 * it in the profile's own palette; unset, the brand lime is the fallback.
 */
export function BrandMark({
  className,
  src,
  alt = '',
}: {
  className?: string
  src?: string | null
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

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full', className)}
      style={{
        backgroundColor: 'var(--brand-mark-bg, #D5FF2F)',
        color: 'var(--brand-mark-fg, #050505)',
      }}
      aria-hidden
    >
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
    </span>
  )
}
