import { cn } from 'cn'

export function BrandMark({ className }: { className?: string }) {
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
