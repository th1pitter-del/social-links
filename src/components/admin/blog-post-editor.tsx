'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Images,
  Loader2,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from 'cn'
import { PageHeader } from '@/components/admin/page-header'
import { Panel } from '@/components/admin/panel'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Timestamp } from '@/components/timestamp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  BLOG_EXCERPT_MAX_LENGTH,
  BLOG_SEO_DESCRIPTION_MAX_LENGTH,
  BLOG_SEO_TITLE_MAX_LENGTH,
  BLOG_SLUG_PATTERN,
  BLOG_TITLE_MAX_LENGTH,
  type BlogCoverOption,
  type BlogPostData,
  type BlogPostInput,
  type BlogPostStatus,
  type BlogPostTranslations,
} from '@/lib/blog'
import { autosaveBlogPost, createBlogPost, updateBlogPost } from '@/lib/actions/admin-blog'
import { formatNumber } from '@/lib/format'
import { locales, localeDirection, localeLabels, type Locale } from '@/i18n/config'

type LocaleDraft = {
  title: string
  excerpt: string
  content: string
  seoTitle: string
  seoDescription: string
}

function draftsFrom(post: BlogPostData | null): Record<Locale, LocaleDraft> {
  const drafts = {} as Record<Locale, LocaleDraft>
  for (const locale of locales) {
    const override = post?.translations?.[locale]
    drafts[locale] = {
      title: locale === 'en' ? (post?.title ?? '') : (override?.title ?? ''),
      excerpt: locale === 'en' ? (post?.excerpt ?? '') : (override?.excerpt ?? ''),
      content: locale === 'en' ? (post?.content ?? '') : (override?.content ?? ''),
      seoTitle: locale === 'en' ? (post?.seoTitle ?? '') : (override?.seoTitle ?? ''),
      seoDescription:
        locale === 'en' ? (post?.seoDescription ?? '') : (override?.seoDescription ?? ''),
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
    .slice(0, 79)
  if (!base) return ''
  return base.length === 2 ? `article-${base}` : base
}

/** ISO in, `YYYY-MM-DDTHH:mm` in the editor's own timezone out. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function toIso(local: string): string | null {
  if (!local) return null
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function BlogPostEditor({
  initial,
  authors,
  categories,
  library,
  defaultAuthorId,
}: {
  initial: BlogPostData | null
  authors: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  library: BlogCoverOption[]
  defaultAuthorId: string
}) {
  const t = useTranslations('admin.blog.editor')
  const tc = useTranslations('admin.common')
  const locale = useLocale()
  const router = useRouter()

  const [drafts, setDrafts] = useState<Record<Locale, LocaleDraft>>(() => draftsFrom(initial))
  const [activeLocale, setActiveLocale] = useState<Locale>('en')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(Boolean(initial))
  const [status, setStatus] = useState<BlogPostStatus>(initial?.status ?? 'DRAFT')
  const [publishedAt, setPublishedAt] = useState(() => toLocalInput(initial?.publishedAt ?? null))
  const [featured, setFeatured] = useState(initial?.featured ?? false)
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '')
  const [coverAlt, setCoverAlt] = useState(initial?.coverAlt ?? '')
  const [authorId, setAuthorId] = useState(initial?.author?.id ?? defaultAuthorId)
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '')
  const [tags, setTags] = useState(initial?.tags.map((tag) => tag.name).join(', ') ?? '')
  const [canonicalUrl, setCanonicalUrl] = useState(initial?.canonicalUrl ?? '')
  const [ogImage, setOgImage] = useState(initial?.ogImage ?? '')
  const [saving, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [libraryTarget, setLibraryTarget] = useState<'cover' | 'og' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draft = drafts[activeLocale]
  const isEnglish = activeLocale === 'en'
  const dir = localeDirection(activeLocale)

  function buildInput(nextStatus: BlogPostStatus = status): BlogPostInput {
    const translations: BlogPostTranslations = {}
    for (const locale of locales) {
      if (locale === 'en') continue
      const value = drafts[locale]
      const entry: BlogPostTranslations[typeof locale] = {}
      if (value.title.trim()) entry.title = value.title.trim()
      if (value.excerpt.trim()) entry.excerpt = value.excerpt.trim()
      if (value.content.trim()) entry.content = value.content
      if (value.seoTitle.trim()) entry.seoTitle = value.seoTitle.trim()
      if (value.seoDescription.trim()) entry.seoDescription = value.seoDescription.trim()
      if (Object.keys(entry).length) translations[locale] = entry
    }
    return {
      title: drafts.en.title,
      slug,
      excerpt: drafts.en.excerpt,
      content: drafts.en.content,
      coverImage,
      coverAlt,
      status: nextStatus,
      featured,
      publishedAt: nextStatus === 'PUBLISHED' ? toIso(publishedAt) : null,
      translations,
      seoTitle: drafts.en.seoTitle,
      seoDescription: drafts.en.seoDescription,
      canonicalUrl,
      ogImage,
      authorId,
      categoryId,
      tagNames: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
  }

  const snapshot = JSON.stringify(buildInput())
  const snapshotRef = useRef(snapshot)
  const baselineRef = useRef(snapshot)
  const [dirty, setDirty] = useState(false)
  const autosaveBusyRef = useRef(false)

  useEffect(() => {
    snapshotRef.current = snapshot
    setDirty(snapshot !== baselineRef.current)
  }, [snapshot])

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Autosave only touches drafts: a published article changes on an explicit save.
  useEffect(() => {
    if (!initial || initial.status !== 'DRAFT' || status !== 'DRAFT' || !dirty) return
    if (!drafts.en.title.trim()) return
    const timer = setTimeout(() => {
      if (autosaveBusyRef.current) return
      autosaveBusyRef.current = true
      setAutosaveState('saving')
      const sent = snapshotRef.current
      void autosaveBlogPost(initial.id, JSON.parse(sent) as BlogPostInput)
        .then((result) => {
          if (!result.ok) {
            setAutosaveState('error')
            return
          }
          setSavedAt(result.savedAt)
          setAutosaveState('saved')
          if (snapshotRef.current === sent) {
            baselineRef.current = sent
            setDirty(false)
          }
        })
        .catch(() => setAutosaveState('error'))
        .finally(() => {
          autosaveBusyRef.current = false
        })
    }, 2500)
    return () => clearTimeout(timer)
  }, [snapshot, dirty, drafts, initial, status])

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

  async function uploadImage(file: File) {
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
      setCoverImage(payload.url)
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function persist(nextStatus: BlogPostStatus, leaveAfter: boolean) {
    if (!drafts.en.title.trim()) {
      toast.error(t('titleRequired'))
      setActiveLocale('en')
      return
    }
    if (slug && !BLOG_SLUG_PATTERN.test(slug)) {
      toast.error(t('invalidSlug'))
      return
    }
    if (!authorId) {
      toast.error(t('authorRequired'))
      return
    }

    const input = buildInput(nextStatus)
    setStatus(nextStatus)
    startTransition(async () => {
      const result = initial
        ? await updateBlogPost(initial.id, input)
        : await createBlogPost(input)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      baselineRef.current = JSON.stringify({ ...input, status: nextStatus })
      setDirty(false)
      setAutosaveState('idle')
      const scheduledAt = input.publishedAt ? new Date(input.publishedAt).getTime() : null
      toast.success(
        nextStatus === 'PUBLISHED'
          ? scheduledAt && scheduledAt > Date.now()
            ? t('toasts.scheduled')
            : t('toasts.published')
          : t('toasts.saved'),
      )
      if (nextStatus === 'PUBLISHED') {
        router.push('/admin/blog/articles')
        return
      }
      if (!initial) {
        router.replace(`/admin/blog/articles/${result.post.id}`)
        return
      }
      if (leaveAfter) {
        router.push('/admin/blog/articles')
        return
      }
      router.refresh()
    })
  }

  function pickLibrary(url: string) {
    if (libraryTarget === 'og') setOgImage(url)
    else setCoverImage(url)
    setLibraryTarget(null)
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
                <Link href={`/blog/preview/${initial.id}`} target="_blank">
                  <ExternalLink />
                  {t('preview')}
                </Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link
                href="/admin/blog/articles"
                onClick={(event) => {
                  if (dirty && !window.confirm(t('unsavedConfirm'))) event.preventDefault()
                }}
              >
                {tc('cancel')}
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={() => persist(status, false)} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? tc('saving') : tc('save')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="p-4 sm:p-5">
          <div
            className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
            role="tablist"
            aria-label={t('translationsLabel')}
          >
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={activeLocale === item}
                onClick={() => setActiveLocale(item)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeLocale === item
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {localeLabels[item]}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`blog-title-${activeLocale}`}>
                {isEnglish ? t('titleLabel') : t('translatedTitleLabel')}
              </Label>
              <Input
                id={`blog-title-${activeLocale}`}
                dir={dir}
                value={draft.title}
                maxLength={BLOG_TITLE_MAX_LENGTH}
                onChange={(event) =>
                  isEnglish
                    ? updateEnglishTitle(event.target.value)
                    : updateDraft({ title: event.target.value })
                }
              />
              {!isEnglish ? (
                <p className="text-xs text-muted-foreground">{t('translationFallback')}</p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`blog-excerpt-${activeLocale}`}>{t('excerptLabel')}</Label>
              <Textarea
                id={`blog-excerpt-${activeLocale}`}
                dir={dir}
                value={draft.excerpt}
                maxLength={BLOG_EXCERPT_MAX_LENGTH}
                rows={3}
                onChange={(event) => updateDraft({ excerpt: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t('excerptHint')}</p>
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

            {!isEnglish ? (
              <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground">{t('seoForLocale')}</p>
                <div className="grid gap-1.5">
                  <Label htmlFor={`blog-seo-title-${activeLocale}`}>{t('seoTitleLabel')}</Label>
                  <Input
                    id={`blog-seo-title-${activeLocale}`}
                    dir={dir}
                    value={draft.seoTitle}
                    maxLength={BLOG_SEO_TITLE_MAX_LENGTH}
                    onChange={(event) => updateDraft({ seoTitle: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`blog-seo-description-${activeLocale}`}>
                    {t('seoDescriptionLabel')}
                  </Label>
                  <Textarea
                    id={`blog-seo-description-${activeLocale}`}
                    dir={dir}
                    value={draft.seoDescription}
                    maxLength={BLOG_SEO_DESCRIPTION_MAX_LENGTH}
                    rows={2}
                    onChange={(event) => updateDraft({ seoDescription: event.target.value })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="blog-slug">{t('slugLabel')}</Label>
              <Input
                id="blog-slug"
                value={slug}
                placeholder={t('slugPlaceholder')}
                className="font-mono text-xs"
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value.toLowerCase())
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('slugHint', { prefix: '/blog/' })}
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="blog-author">{t('authorLabel')}</Label>
              </div>
              <Select value={authorId || undefined} onValueChange={setAuthorId}>
                <SelectTrigger id="blog-author" className="w-full">
                  <SelectValue placeholder={t('authorPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {authors.map((author) => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="blog-category">{t('categoryLabel')}</Label>
              <Select
                value={categoryId || 'none'}
                onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}
              >
                <SelectTrigger id="blog-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noCategory')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="blog-tags">{t('tagsLabel')}</Label>
              <Textarea
                id="blog-tags"
                value={tags}
                rows={2}
                onChange={(event) => setTags(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('tagsHint')}</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="blog-featured" className="text-sm">
                  {t('featuredLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('featuredHint')}</p>
              </div>
              <Switch
                id="blog-featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
            </div>
          </Panel>

          <Panel className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{t('publishingTitle')}</p>
              {initial?.status === 'DRAFT' ? (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {autosaveState === 'saving'
                    ? t('autosaveSaving')
                    : autosaveState === 'error'
                      ? t('autosaveFailed')
                      : savedAt
                        ? t('autosaveSaved', {
                            time: new Intl.DateTimeFormat(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(savedAt)),
                          })
                        : t('autosaveIdle')}
                </span>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="blog-status">{t('statusLabel')}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as BlogPostStatus)
                  if (value === 'PUBLISHED' && !publishedAt) {
                    setPublishedAt(toLocalInput(new Date().toISOString()))
                  }
                }}
              >
                <SelectTrigger id="blog-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
                  <SelectItem value="PUBLISHED">{t('statusPublished')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === 'PUBLISHED' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="blog-published-at">{t('publishDateLabel')}</Label>
                <Input
                  id="blog-published-at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(event) => setPublishedAt(event.target.value)}
                />
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                  {t('publishDateHint')}
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                {t('statusHint')}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => persist('DRAFT', false)}
              >
                {t('saveDraft')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => persist('PUBLISHED', false)}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Send />}
                {t('publish')}
              </Button>
            </div>
          </Panel>

          <Panel className="space-y-3 p-4 sm:p-5">
            <div className="grid gap-2">
              <Label htmlFor="blog-cover">{t('coverLabel')}</Label>
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  className="h-32 w-full rounded-md border border-border object-cover"
                />
              ) : null}
              <Input
                id="blog-cover"
                value={coverImage}
                onChange={(event) => setCoverImage(event.target.value)}
                placeholder={t('imagePlaceholder')}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLibraryTarget('cover')}
                >
                  <Images />
                  {t('chooseFromLibrary')}
                </Button>
                {coverImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverImage('')}
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
                  if (file) void uploadImage(file)
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-cover-alt">{t('coverAltLabel')}</Label>
              <Input
                id="blog-cover-alt"
                value={coverAlt}
                maxLength={200}
                onChange={(event) => setCoverAlt(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('coverAltHint')}</p>
            </div>
          </Panel>

          <Panel className="space-y-4 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">{t('seoTitle')}</p>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-base-seo-title">{t('seoTitleLabel')}</Label>
              <Input
                id="blog-base-seo-title"
                value={drafts.en.seoTitle}
                maxLength={BLOG_SEO_TITLE_MAX_LENGTH}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    en: { ...current.en, seoTitle: event.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-base-seo-description">{t('seoDescriptionLabel')}</Label>
              <Textarea
                id="blog-base-seo-description"
                value={drafts.en.seoDescription}
                maxLength={BLOG_SEO_DESCRIPTION_MAX_LENGTH}
                rows={3}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    en: { ...current.en, seoDescription: event.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-canonical">{t('canonicalLabel')}</Label>
              <Input
                id="blog-canonical"
                value={canonicalUrl}
                onChange={(event) => setCanonicalUrl(event.target.value)}
                placeholder={t('canonicalPlaceholder')}
                className="text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-og-image">{t('ogImageLabel')}</Label>
              <Input
                id="blog-og-image"
                value={ogImage}
                onChange={(event) => setOgImage(event.target.value)}
                placeholder={t('imagePlaceholder')}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setLibraryTarget('og')}
              >
                <Images />
                {t('chooseFromLibrary')}
              </Button>
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
              <p>
                {t('views')}: {formatNumber(locale, initial.viewCount)}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>

      <Dialog open={libraryTarget !== null} onOpenChange={(open) => !open && setLibraryTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('libraryTitle')}</DialogTitle>
            <DialogDescription>{t('libraryDescription')}</DialogDescription>
          </DialogHeader>
          {library.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('libraryEmpty')}</p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {library.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => pickLibrary(asset.url)}
                  className="group overflow-hidden rounded-md border border-border text-start transition-colors hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                  title={asset.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
