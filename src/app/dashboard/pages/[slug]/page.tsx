import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { Timestamp } from '@/components/timestamp'
import { pageText } from '@/lib/custom-content'
import { getCustomPageBySlug } from '@/lib/custom-content-data'
import { sanitizeRichText } from '@/lib/rich-text'
import { requireUser } from '@/lib/session'
import { localeDirection, type Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

async function visiblePage(slug: string) {
  const [page, session] = await Promise.all([getCustomPageBySlug(slug), requireUser()])
  if (!page) return null
  if (page.status !== 'PUBLISHED' && session.user.role !== 'ADMIN') return null
  return page
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await visiblePage(slug)
  if (!page) return {}
  const locale = (await getLocale()) as Locale
  return { title: pageText(page, locale).title }
}

export default async function CustomContentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await visiblePage(slug)
  if (!page) notFound()

  const locale = (await getLocale()) as Locale
  const t = await getTranslations('customPages')
  const text = pageText(page, locale)
  const html = sanitizeRichText(text.content)
  const draft = page.status !== 'PUBLISHED'

  return (
    <article className="w-full max-w-3xl space-y-6 pt-4 sm:pt-6">
      {draft ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {t('draftNotice')}
        </p>
      ) : null}

      <header className="space-y-4">
        {page.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.featuredImage}
            alt=""
            className="aspect-[16/9] w-full rounded-2xl border object-cover"
          />
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
        {text.excerpt ? (
          <p className="text-base text-muted-foreground">{text.excerpt}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t('updated')} <Timestamp value={new Date(page.updatedAt)} withTime={false} />
        </p>
      </header>

      {html ? (
        <div
          className="rich-text"
          dir={localeDirection(locale)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}
    </article>
  )
}
