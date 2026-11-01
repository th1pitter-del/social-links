import { getTranslations } from 'next-intl/server'

import { getActiveHeaderLinks } from '@/lib/ads-data'

/**
 * Admin-managed link strip shown in the header of every user link page
 * (/u/[slug] and /bio/[handle]). Renders nothing until links are configured.
 */
export async function UserPageNav() {
  const [links, t] = await Promise.all([
    getActiveHeaderLinks(),
    getTranslations('userPage'),
  ])
  if (links.length === 0) return null

  return (
    <nav aria-label={t('headerNavLabel')} className="border-b border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-5 overflow-x-auto px-4 py-2 text-sm">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target={link.newTab ? '_blank' : undefined}
            rel={link.newTab ? 'noopener noreferrer' : undefined}
            className="shrink-0 text-muted-foreground whitespace-nowrap transition-colors hover:text-foreground hover:underline underline-offset-4"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
