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
      className={cn('inline-flex items-center justify-center rounded-md', className)}
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
        strokeWidth="4.2"
        strokeLinecap="round"
        aria-hidden
      >
        <rect x="6.2" y="17" width="19.6" height="10" rx="5" />
        <path d="M10.8 17v-6.6a5.2 5.2 0 0 1 10.4 0" />
      </svg>
    </span>
  )
}
