'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Panel } from '@/components/admin/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Timestamp } from '@/components/timestamp'
import { cn } from 'cn'
import { locales, localeDirection, localeLabels, type Locale } from '@/i18n/config'
import {
  createBlogCategory,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogTag,
  updateBlogCategory,
  updateBlogTag,
} from '@/lib/actions/admin-blog'
import {
  BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH,
  BLOG_SLUG_PATTERN,
  BLOG_TERM_NAME_MAX_LENGTH,
  type BlogCategoryData,
  type BlogCategoryInput,
  type BlogTagData,
  type BlogTagInput,
} from '@/lib/blog'
import { formatNumber } from '@/lib/format'

type Term = BlogCategoryData | BlogTagData

type FormState = {
  names: Record<Locale, string>
  descriptions: Record<Locale, string>
  slug: string
  slugEdited: boolean
}

const EMPTY_NAMES = Object.fromEntries(locales.map((item) => [item, ''])) as Record<Locale, string>

const EMPTY_FORM: FormState = {
  names: EMPTY_NAMES,
  descriptions: EMPTY_NAMES,
  slug: '',
  slugEdited: false,
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 79)
}

function localizedName(term: Term, locale: Locale): string {
  const translations = term.translations ?? {}
  const value =
    'description' in term
      ? (translations as BlogCategoryData['translations'])?.[locale]?.name
      : (translations as BlogTagData['translations'])?.[locale]
  return value?.trim() ?? ''
}

export function BlogTermManager({
  kind,
  initial,
}: {
  kind: 'category' | 'tag'
  initial: Term[]
}) {
  const isCategory = kind === 'category'
  const t = useTranslations(isCategory ? 'admin.blog.categories' : 'admin.blog.tags')
  const tc = useTranslations('admin.common')
  const locale = useLocale() as Locale
  const router = useRouter()

  const [terms, setTerms] = useState<Term[]>(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Term | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [activeLocale, setActiveLocale] = useState<Locale>('en')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Term | null>(null)
  const [, startTransition] = useTransition()

  const dir = localeDirection(activeLocale)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setActiveLocale('en')
    setDialogOpen(true)
  }

  function openEdit(term: Term) {
    const translations = term.translations ?? {}
    const names = { ...EMPTY_NAMES, en: term.name }
    const descriptions = { ...EMPTY_NAMES }
    if ('description' in term) {
      descriptions.en = term.description ?? ''
      for (const item of locales) {
        if (item === 'en') continue
        const value = (translations as BlogCategoryData['translations'])?.[item]
        names[item] = value?.name ?? ''
        descriptions[item] = value?.description ?? ''
      }
    } else {
      for (const item of locales) {
        if (item === 'en') continue
        names[item] = (translations as BlogTagData['translations'])?.[item] ?? ''
      }
    }
    setEditing(term)
    setForm({ names, descriptions, slug: term.slug, slugEdited: true })
    setActiveLocale('en')
    setDialogOpen(true)
  }

  function updateName(value: string) {
    setForm((current) => {
      const next = { ...current, names: { ...current.names, [activeLocale]: value } }
      if (activeLocale === 'en' && !current.slugEdited) next.slug = slugify(value)
      return next
    })
  }

  function submitForm() {
    if (!form.names.en.trim()) {
      setActiveLocale('en')
      toast.error(t('nameRequired'))
      return
    }
    if (form.slug && !BLOG_SLUG_PATTERN.test(form.slug)) {
      toast.error(t('invalidSlug'))
      return
    }

    setBusy(true)
    startTransition(async () => {
      let result: { ok: true } | { ok: false; error: string }
      if (isCategory) {
        const translations: NonNullable<BlogCategoryInput['translations']> = {}
        for (const item of locales) {
          if (item === 'en') continue
          const name = form.names[item].trim()
          const description = form.descriptions[item].trim()
          if (name || description) translations[item] = { name, description }
        }
        const input: BlogCategoryInput = {
          name: form.names.en,
          slug: form.slug,
          description: form.descriptions.en,
          translations,
        }
        result = editing
          ? await updateBlogCategory(editing.id, input)
          : await createBlogCategory(input)
      } else {
        const translations: NonNullable<BlogTagInput['translations']> = {}
        for (const item of locales) {
          if (item === 'en') continue
          const name = form.names[item].trim()
          if (name) translations[item] = name
        }
        const input: BlogTagInput = { name: form.names.en, slug: form.slug, translations }
        result = editing
          ? await updateBlogTag(editing.id, input)
          : await createBlogTag(input)
      }
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      toast.success(editing ? t('toasts.updated') : t('toasts.created'))
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!confirm) return
    const id = confirm.id
    setBusy(true)
    startTransition(async () => {
      const result = isCategory ? await deleteBlogCategory(id) : await deleteBlogTag(id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setTerms((current) => current.filter((term) => term.id !== id))
      setConfirm(null)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground">
          {t('count', { count: formatNumber(locale, terms.length) })}
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus />
          {isCategory ? t('newCategory') : t('newTag')}
        </Button>
      </div>

      {terms.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t('columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('columns.slug')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('columns.posts')}</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">{t('columns.updated')}</th>
                <th className="px-5 py-3 text-end font-medium">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {terms.map((term) => {
                const translated = localizedName(term, locale)
                return (
                  <tr key={term.id} className="group hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{term.name}</span>
                        {translated && translated !== term.name ? (
                          <Badge variant="outline">{translated}</Badge>
                        ) : null}
                      </div>
                      {'description' in term && term.description ? (
                        <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted-foreground">
                          {term.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {term.slug}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                      {formatNumber(locale, term.postCount)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      <Timestamp value={new Date(term.updatedAt)} withTime={false} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('editAria', { name: term.name })}
                          onClick={() => openEdit(term)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('deleteAria', { name: term.name })}
                          onClick={() => setConfirm(term)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editTitle') : t('newTitle')}</DialogTitle>
            <DialogDescription>{t('formDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitForm()
            }}
          >
            <div
              className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
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
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    activeLocale === item
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground',
                  )}
                >
                  {localeLabels[item]}
                </button>
              ))}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`blog-term-name-${activeLocale}`}>
                {activeLocale === 'en' ? t('nameLabel') : t('translatedNameLabel')}
              </Label>
              <Input
                id={`blog-term-name-${activeLocale}`}
                dir={activeLocale === 'en' ? undefined : dir}
                value={form.names[activeLocale]}
                maxLength={BLOG_TERM_NAME_MAX_LENGTH}
                onChange={(event) => updateName(event.target.value)}
                placeholder={
                  activeLocale === 'en' ? t('namePlaceholder') : t('translationFallback')
                }
              />
            </div>

            {isCategory ? (
              <div className="grid gap-1.5">
                <Label htmlFor={`blog-term-description-${activeLocale}`}>
                  {t('descriptionLabel')}
                </Label>
                <Textarea
                  id={`blog-term-description-${activeLocale}`}
                  dir={activeLocale === 'en' ? undefined : dir}
                  value={form.descriptions[activeLocale]}
                  maxLength={BLOG_CATEGORY_DESCRIPTION_MAX_LENGTH}
                  rows={2}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      descriptions: {
                        ...current.descriptions,
                        [activeLocale]: event.target.value,
                      },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">{t('descriptionHint')}</p>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="blog-term-slug">{t('slugLabel')}</Label>
              <Input
                id="blog-term-slug"
                value={form.slug}
                placeholder={t('slugPlaceholder')}
                className="font-mono text-xs"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slugEdited: true,
                    slug: event.target.value.toLowerCase(),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">{t('slugHint')}</p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {busy ? tc('saving') : editing ? tc('save') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription', { name: confirm?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isCategory ? t('deleteKeepsPosts') : t('deleteUnlinksPosts')}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                {tc('cancel')}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? tc('deleting') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
