import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from 'cn'

/**
 * Submit-level state for the auth forms. The success tone copies the admin tile
 * idiom (token wash, light-safe text) and the error tone the destructive button,
 * so neither colour has to be re-derived per page.
 */
export function AuthNotice({
  tone,
  children,
}: {
  tone: 'success' | 'error'
  children: React.ReactNode
}) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert

  return (
    <div
      // A failure is announced; a success confirms something the submit already
      // produced, so it must not interrupt a screen reader mid-flow.
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300',
        tone === 'success'
          ? 'border-success/30 bg-success/5 text-emerald-700 dark:text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

/**
 * Message under a single field. Render it with the input pointing here through
 * aria-describedby so the announcement lands with the control, not after it.
 */
export function FieldErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p
      id={id}
      className="flex items-start gap-1.5 text-xs text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
    >
      <CircleAlert aria-hidden className="mt-px size-3 shrink-0" />
      <span className="min-w-0">{message}</span>
    </p>
  )
}
