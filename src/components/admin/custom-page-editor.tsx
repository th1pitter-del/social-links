'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle2, ExternalLink, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from 'cn'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { PageHeader } from '@/components/admin/page-header'
import { Panel } from '@/components/admin/panel'
import { Timestamp } from '@/components/timestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CUSTOM_PAGE_EXCERPT_MAX_LENGTH,
  CUSTOM_PAGE_SLUG_PATTERN,
  CUSTOM_PAGE_TITLE_MAX_LENGTH,
  customPageHref,
  type CustomPageData,
  type CustomPageInput,
  type CustomPageStatus,
  type CustomPageTranslations,
} from '@/lib/custom-content'
import { createCustomPage, updateCustomPage } from '@/lib/actions/admin-content'
import { locales, localeDirection, localeLabels, type Locale } from '@/i18n/config'

type LocaleDraft = { title: string; excerpt: string; content: string }

function draftsFrom(page: CustomPageData | null): Record<Locale, LocaleDraft> {
  const drafts = {} as Record<Locale, LocaleDraft>
  for (const locale of locales) {
    const override = page?.translations?.[locale]
    drafts[locale] = {
      title: locale === 'en' ? (page?.title ?? '') : (override?.title ?? ''),
      excerpt: locale === 'en' ? (page?.excerpt ?? '') : (override?.excerpt ?? ''),
      content: locale === 'en' ? (page?.content ?? '') : (override?.content ?? ''),
    }
  }
  return drafts
}

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
  if (!base) return ''
  return base.length === 2 ? `page-${base}` : base
}

export function CustomPageEditor({ initial }: { initial: CustomPageData | null }) {
  const t = useTranslations('admin.contentPages')
  const tc = useTranslations('admin.common')
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<Locale, LocaleDraft>>(() => draftsFrom(initial))
  const [activeLocale, setActiveLocale] = useState<Locale>('en')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(Boolean(initial))
  const [status, setStatus] = useState<CustomPageStatus>(initial?.status ?? 'DRAFT')
  const [featuredImage, setFeaturedImage] = useState(initial?.featuredImage ?? '')
  const [saving, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draft = drafts[activeLocale]
  const isEnglish = activeLocale === 'en'
  const dir = localeDirection(activeLocale)

  function updateDraft(patch: Partial<LocaleDraft>) {
    setDrafts((current) => ({
      ...current,
      [activeLocale]: { ...current[activeLocale], ...patch },
    }))
  }

  function updateEnglishTitle(title: string) {
    setDrafts((current) => ({ ...current, en: { ...current.en, title } }))
    if (!slugEdited) setSlug(slugify(title))
  }

  async function uploadFeatured(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null
      if (!response.ok || !payload?.url) {
        toast.error(payload?.error ?? t('uploadFailed'))
        return
      }
      setFeaturedImage(payload.url)
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function save() {
    if (!drafts.en.title.trim()) {
      toast.error(t('titleRequired'))
      setActiveLocale('en')
      return
    }
    if (slug && !CUSTOM_PAGE_SLUG_PATTERN.test(slug)) {
      toast.error(t('invalidSlug'))
      return
    }

    const translations: CustomPageTranslations = {}
    for (const locale of locales) {
      if (locale === 'en') continue
      const value = drafts[locale]
      const entry: CustomPageTranslations[typeof locale] = {}
      if (value.title.trim()) entry.title = value.title.trim()
      if (value.excerpt.trim()) entry.excerpt = value.excerpt.trim()
      if (value.content.trim()) entry.content = value.content
      if (Object.keys(entry).length) translations[locale] = entry
    }

    const input: CustomPageInput = {
      title: drafts.en.title,
      slug,
      excerpt: drafts.en.excerpt,
      content: drafts.en.content,
      status,
      featuredImage,
      translations,
    }

    startTransition(async () => {
      const result = initial
        ? await updateCustomPage(initial.id, input)
        : await createCustomPage(input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('toasts.saved'))
      if (!initial) {
        router.replace(`/admin/content-pages/${result.page.id}`)
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={initial ? t('editTitle') : t('createTitle')}
        description={t('formDescription')}
        actions={
          <>
            {initial ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={customPageHref(initial.slug)} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  {t('preview')}
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/content-pages">{tc('cancel')}</Link>
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? tc('saving') : tc('save')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="p-4 sm:p-5">
          <div
            className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
            role="tablist"
            aria-label={t('translationsLabel')}
          >
            {locales.map((locale) => (
              <button
                key={locale}
                type="button"
                role="tab"
                aria-selected={activeLocale === locale}
                onClick={() => setActiveLocale(locale)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeLocale === locale
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {localeLabels[locale]}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`content-page-title-${activeLocale}`}>
                {isEnglish ? t('titleLabel') : t('translatedTitleLabel')}
              </Label>
              <Input
                id={`content-page-title-${activeLocale}`}
                dir={dir}
                value={draft.title}
                maxLength={CUSTOM_PAGE_TITLE_MAX_LENGTH}
                onChange={(event) =>
                  isEnglish ? updateEnglishTitle(event.target.value) : updateDraft({ title: event.target.value })
                }
              />
              {!isEnglish ? (
                <p className="text-xs text-muted-foreground">{t('translationFallback')}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`content-page-excerpt-${activeLocale}`}>{t('excerptLabel')}</Label>
              <Textarea
                id={`content-page-excerpt-${activeLocale}`}
                dir={dir}
                value={draft.excerpt}
                maxLength={CUSTOM_PAGE_EXCERPT_MAX_LENGTH}
                rows={2}
                onChange={(event) => updateDraft({ excerpt: event.target.value })}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t('contentLabel')}</Label>
              <RichTextEditor
                value={draft.content}
                onChange={(content) => updateDraft({ content })}
                dir={dir}
              />
              <p className="text-xs text-muted-foreground">{t('contentHint')}</p>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="content-page-slug">{t('slugLabel')}</Label>
              <Input
                id="content-page-slug"
                value={slug}
                placeholder={t('slugPlaceholder')}
                className="font-mono text-xs"
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value.toLowerCase())
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('slugHint', { prefix: '/dashboard/pages/' })}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="content-page-status">{t('statusLabel')}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CustomPageStatus)}
              >
                <SelectTrigger id="content-page-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{t('draft')}</SelectItem>
                  <SelectItem value="PUBLISHED">{t('published')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                {t('statusHint')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content-page-image">{t('imageLabel')}</Label>
              {featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featuredImage}
                  alt=""
                  className="h-28 w-full rounded-md border border-border object-cover"
                />
              ) : null}
              <Input
                id="content-page-image"
                value={featuredImage}
                onChange={(event) => setFeaturedImage(event.target.value)}
                placeholder="https://… or /api/media/…"
                className="text-xs"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {uploading ? t('uploading') : t('uploadImage')}
                </Button>
                {featuredImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeaturedImage('')}
                  >
                    <Trash2 />
                    {t('removeImage')}
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadFeatured(file)
                }}
              />
              <p className="text-xs text-muted-foreground">{t('imageHint')}</p>
            </div>
          </Panel>

          {initial ? (
            <Panel className="space-y-1 p-4 text-xs text-muted-foreground sm:p-5">
              <p>
                {t('createdAt')}: <Timestamp value={new Date(initial.createdAt)} />
              </p>
              <p>
                {t('updatedAt')}: <Timestamp value={new Date(initial.updatedAt)} />
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}
