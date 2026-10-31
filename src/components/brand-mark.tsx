import { cn } from 'cn'

/**
 * The site mark. When an admin has uploaded a custom logo (`site.logoUrl`
 * setting), it renders that image; otherwise the built-in glyph is shown.
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
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-[#D5FF2F] text-[#050505]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M8 12h8" strokeLinecap="round" />
        <path d="M12 8v8" strokeLinecap="round" />
      </svg>
    </span>
  )
}
