'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  LogIn,
  Plus,
  Search,
  Share2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/copy-button'
import { LinkCreatedDialog } from '@/components/link-created-dialog'
import { ActionGlyph, PlatformGlyph } from '@/components/brand-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createGuestLink, createLink, updateLink } from '@/lib/actions/links'
import {
  ACTION_OPTION_DEFAULTS,
  type ActionOptionView,
} from '@/lib/action-defaults'
import { actionLabel, platformLabel } from '@/lib/action-label'
import { formatNumber } from '@/lib/format'
import { SITE_URL } from '@/lib/seo'
import type { LinkInput } from '@/lib/validation'

const MAX_ACTIONS = 10

// Shown first in the action picker so the common choices are one click away.
// Every offered action is provable, so the list is the catalog itself.
const POPULAR_ACTION_KEYS = ACTION_OPTION_DEFAULTS.map((option) => option.key)

type ActionRow = {
  type: string
  label: string
  target: string
}

export type LinkFormValues = {
  title: string
  targetUrl: string
  coverImage: string
  slug: string
  expiresAt: string
  contentType: 'URL' | 'FILE'
  fileId: string
  fileName: string
  actions: ActionRow[]
}

export function LinkForm({
  mode,
  initial,
  linkId,
  actionTypes,
  guest = false,
  existingSlug,
  centered = false,
}: {
  mode: 'create' | 'edit'
  initial?: LinkFormValues
  linkId?: string
  actionTypes?: ActionOptionView[]
  guest?: boolean
  /** For guest mode: a link this browser already created, shown immediately. */
  existingSlug?: string
  /** Constrain the form to a centred, comfortable reading width. */
  centered?: boolean
}) {
  const t = useTranslations('linkForm')
  const actionT = useTranslations('actions')
  const platformT = useTranslations('platforms')
  const uploadT = useTranslations('uploads.errors')
  const locale = useLocale()
  const options: ActionOptionView[] =
    actionTypes && actionTypes.length > 0
      ? actionTypes
      : ACTION_OPTION_DEFAULTS.map((option) => ({
          key: option.key,
          label: option.label,
          platform: option.platform,
          platformLabel: option.platform,
          icon: option.icon,
          behavior: option.behavior,
        }))
  const optionFor = (type: string) => options.find((option) => option.key === type)
  const labelFor = (type: string) => {
    const option = optionFor(type)
    return option ? actionLabel(option, actionT) : type
  }
  const behaviorFor = (type: string) => optionFor(type)?.behavior ?? 'URL'

  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lockedFileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(existingSlug ?? null)
  const [shareOpen, setShareOpen] = useState(false)
  const [createdTitle, setCreatedTitle] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerPlatform, setPickerPlatform] = useState('popular')
  const [showMore, setShowMore] = useState(false)

  const [values, setValues] = useState<LinkFormValues>({
    title: '',
    targetUrl: '',
    coverImage: '',
    slug: '',
    expiresAt: '',
    contentType: 'URL',
    fileId: '',
    fileName: '',
    actions: [],
    ...initial,
  })

  const atMaxActions = values.actions.length >= MAX_ACTIONS

  function update<K extends keyof LinkFormValues>(key: K, value: LinkFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateAction(index: number, patch: Partial<ActionRow>) {
    setValues((current) => ({
      ...current,
      actions: current.actions.map((action, i) =>
        i === index ? { ...action, ...patch } : action,
      ),
    }))
  }

  function addAction(type: string) {
    setValues((current) =>
      current.actions.length >= MAX_ACTIONS
        ? current
        : {
            ...current,
            actions: [
              ...current.actions,
              { type, label: '', target: '' },
            ],
          },
    )
  }

  function removeAction(index: number) {
    setValues((current) => ({
      ...current,
      actions: current.actions.filter((_, i) => i !== index),
    }))
  }

  function openPicker() {
    setPickerQuery('')
    setPickerPlatform('popular')
    setPickerOpen(true)
  }

  const searching = pickerQuery.trim().length > 0

  const searchResults = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase()
    if (!query) return []
    return options.filter((option) => {
      const platform = option.platform
        ? platformLabel({ key: option.platform, label: option.platformLabel }, platformT)
        : t('generalPlatform')
      return (
        actionLabel(option, actionT).toLowerCase().includes(query) ||
        platform.toLowerCase().includes(query)
      )
    })
  }, [options, pickerQuery, actionT, platformT, t])

  const popularOptions = useMemo(
    () =>
      POPULAR_ACTION_KEYS.map((key) => options.find((option) => option.key === key)).filter(
        (option): option is ActionOptionView => Boolean(option),
      ),
    [options],
  )

  const platformGroups = useMemo(() => {
    const groups = new Map<string, ActionOptionView[]>()
    for (const option of options) {
      const label = option.platform
        ? platformLabel({ key: option.platform, label: option.platformLabel }, platformT)
        : t('generalPlatform')
      const list = groups.get(label)
      if (list) list.push(option)
      else groups.set(label, [option])
    }
    return [...groups.entries()]
      .map(([label, items]) => ({ label, items }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
  }, [options, t, platformT])

  const activeOptions = searching
    ? searchResults
    : pickerPlatform === 'popular'
      ? popularOptions
      : (platformGroups.find((group) => group.label === pickerPlatform)?.items ?? [])

  function uploadError(code?: string, maxMb?: number) {
    return code && uploadT.has(code) ? uploadT(code, { maxMb: maxMb ?? '' }) : t('uploadFailed')
  }

  async function uploadCover(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string; code?: string; maxMb?: number }
        | null
      if (!response.ok || !payload?.url) {
        toast.error(uploadError(payload?.code, payload?.maxMb))
        return
      }
      update('coverImage', payload.url)
      toast.success(t('imageUploaded'))
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function uploadLockedFile(file: File) {
    setUploadingFile(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/uploads/file', { method: 'POST', body })
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: string; code?: string; maxMb?: number }
        | null
      if (!response.ok || !payload?.id) {
        toast.error(uploadError(payload?.code, payload?.maxMb))
        return
      }
      setValues((current) => ({ ...current, fileId: payload.id as string, fileName: file.name }))
      toast.success(t('fileUploaded'))
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploadingFile(false)
      if (lockedFileInputRef.current) lockedFileInputRef.current.value = ''
    }
  }

  function submit() {
    setFieldErrors({})
    const payload: LinkInput = {
      title: values.title.trim(),
      coverImage: values.coverImage.trim(),
      slug: values.slug.trim(),
      contentType: values.contentType,
      targetUrl: values.contentType === 'URL' ? values.targetUrl.trim() : '',
      fileId: values.contentType === 'FILE' ? values.fileId : '',
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : '',
      actions: values.actions.map((action) => ({
        type: action.type,
        label: action.label.trim(),
        target: action.target.trim(),
      })),
    }

    startTransition(async () => {
      const result = guest
        ? await createGuestLink(payload)
        : mode === 'create'
          ? await createLink(payload)
          : await updateLink(linkId as string, payload)

      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        toast.error(result.error)
        if (result.requiresAuth) setNeedsAuth(true)
        return
      }

      if (guest) {
        toast.success(t('linkCreatedPublished'))
        setCreatedSlug(result.slug)
        setCreatedTitle(values.title.trim())
        setShareOpen(true)
        return
      }

      toast.success(mode === 'create' ? t('linkCreated') : t('linkSaved'))
      router.push(`/dashboard/links/${result.id}`)
      router.refresh()
    })
  }

  // Success panel for the guest flow: the link is already live, so instead of
  // redirecting we surface the shareable URL and an upsell to create an account.
  if (createdSlug) {
    const publicUrl = `${typeof window === 'undefined' ? SITE_URL : window.location.origin}/link/${createdSlug}`
    return (
      <>
        <div className={cn('rounded-2xl border bg-card p-6 text-center shadow-sm', centered && 'mx-auto w-full max-w-2xl')}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{t('successTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('successBody')}</p>
          <div className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-left text-sm">/link/{createdSlug}</code>
            <CopyButton value={publicUrl} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => setShareOpen(true)}
          >
            <Share2 /> {t('shareLink')}
          </Button>
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-left text-sm">
            <p className="font-medium">{t('upsellTitle')}</p>
            <p className="mt-1 text-muted-foreground">{t('upsellBody')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href="/sign-up">
                  <LogIn /> {t('createFreeAccount')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/sign-in">{t('haveAccount')}</Link>
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t('autoAddNote')}</p>
        </div>
        <LinkCreatedDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          url={publicUrl}
          title={createdTitle || t('successTitle')}
        />
      </>
    )
  }

  if (needsAuth) {
    return (
      <div className={cn('rounded-2xl border bg-card p-6 text-center shadow-sm', centered && 'mx-auto w-full max-w-2xl')}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <LogIn className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">{t('signInToContinue')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('freeLinkUsed')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/sign-up">
              <LogIn /> {t('createFreeAccount')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-in">{t('signIn')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn(centered && 'mx-auto w-full max-w-[1200px]')}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="font-medium">{t('detailsTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('detailsDescription')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t('titleLabel')}</Label>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(event) => update('title', event.target.value)}
                  placeholder={t('titlePlaceholder')}
                  maxLength={140}
                />
                <FieldError errors={fieldErrors.title} />
              </div>

              {guest ? (
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">{t('destinationLabel')}</Label>
                  <Input
                    id="targetUrl"
                    type="url"
                    value={values.targetUrl}
                    onChange={(event) => update('targetUrl', event.target.value)}
                    placeholder="https://example.com/download"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('destinationHint')}</p>
                  <FieldError errors={fieldErrors.targetUrl} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('unlockContent')}</Label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => update('contentType', 'URL')}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        values.contentType === 'URL'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t('contentTypeUrl')}
                    </button>
                    <button
                      type="button"
                      onClick={() => update('contentType', 'FILE')}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        values.contentType === 'FILE'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t('contentTypeFile')}
                    </button>
                  </div>

                  {values.contentType === 'URL' ? (
                    <div className="space-y-2 pt-2">
                      <Input
                        id="targetUrl"
                        type="url"
                        value={values.targetUrl}
                        onChange={(event) => update('targetUrl', event.target.value)}
                        placeholder="https://example.com/download"
                      />
                      <p className="text-xs text-muted-foreground">{t('destinationHint')}</p>
                      <FieldError errors={fieldErrors.targetUrl} />
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <input
                        ref={lockedFileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void uploadLockedFile(file)
                        }}
                      />
                      {values.fileId ? (
                        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">
                            {values.fileName || t('uploadedFile')}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setValues((c) => ({ ...c, fileId: '', fileName: '' }))}
                            aria-label={t('removeFile')}
                          >
                            <X />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => lockedFileInputRef.current?.click()}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? <Loader2 className="animate-spin" /> : <Upload />}
                          {t('uploadFile')}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('deliveredAfterVerification')}{' '}
                        <Link href="/dashboard/files" className="underline">
                          {t('manageFiles')}
                        </Link>
                      </p>
                      <FieldError errors={fieldErrors.fileId} />
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{t('stepsTitle')}</h2>
                  <p className="text-xs text-muted-foreground">{t('stepsDescription')}</p>
                </div>
                {values.actions.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={openPicker}
                    disabled={atMaxActions}
                    aria-label={t('addAction')}
                  >
                    <Plus />
                  </Button>
                ) : null}
              </div>

              {values.actions.length === 0 ? (
                <button
                  type="button"
                  onClick={openPicker}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                    <Plus className="size-4" />
                  </span>
                  {t('selectAction')}
                  <span className="text-xs">{t('noActionsYet')}</span>
                </button>
              ) : (
                <ul className="space-y-3">
                  {values.actions.map((action, index) => {
                    const option = optionFor(action.type)
                    return (
                      <li
                        key={index}
                        className={cn(
                          'rounded-xl border p-3',
                          'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <ActionGlyph
                              platform={option?.platform}
                              icon={option?.icon ?? 'link'}
                              className="size-4"
                            />
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {t('step', { number: index + 1 })}
                              </span>
                              <p className="truncate text-sm font-medium">{labelFor(action.type)}</p>
                              {option?.platform ? (
                                <Badge variant="secondary" className="hidden sm:inline-flex">
                                  {platformLabel(
                                    { key: option.platform, label: option.platformLabel },
                                    platformT,
                                  )}
                                </Badge>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="ml-auto text-muted-foreground hover:text-destructive"
                                onClick={() => removeAction(index)}
                                aria-label={t('removeAction')}
                              >
                                <X />
                              </Button>
                            </div>
                            {behaviorFor(action.type) === 'URL' ? (
                              <>
                                <Input
                                  value={action.target}
                                  onChange={(event) =>
                                    updateAction(index, { target: event.target.value })
                                  }
                                  placeholder="https://youtube.com/@channel"
                                  aria-label={t('actionTargetAria')}
                                />
                                <FieldError errors={fieldErrors[`actions.${index}.target`]} />
                              </>
                            ) : (
                              <p className="rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                                {t('emailNote')}
                              </p>
                            )}
                            <Input
                              value={action.label}
                              onChange={(event) => updateAction(index, { label: event.target.value })}
                              placeholder={t('customLabelPlaceholder')}
                              maxLength={120}
                              className="h-7 text-xs"
                              aria-label={t('customLabelAria')}
                            />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {values.actions.length > 0 ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={openPicker}
                    disabled={atMaxActions}
                  >
                    <Plus />
                    {t('addAction')}
                  </Button>
                  {atMaxActions ? (
                    <p className="text-center text-xs text-muted-foreground">
                      {t('maxActions', { max: MAX_ACTIONS })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border bg-card">
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left"
                aria-expanded={showMore}
              >
                <div>
                  <h2 className="font-medium">{t('moreOptions')}</h2>
                  <p className="text-xs text-muted-foreground">{t('moreOptionsDescription')}</p>
                </div>
                <ChevronDown
                  className={cn('size-4 shrink-0 text-muted-foreground transition-transform', showMore && 'rotate-180')}
                />
              </button>

              {showMore ? (
                <div
                  className={cn(
                    'space-y-4 border-t p-5',
                    'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300',
                  )}
                >
                  <div className="space-y-2">
                    <Label htmlFor="coverImage">{t('coverImageLabel')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="coverImage"
                        value={values.coverImage}
                        onChange={(event) => update('coverImage', event.target.value)}
                        placeholder={guest ? 'https://…' : t('coverUrlPlaceholder')}
                      />
                      {guest ? null : (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void uploadCover(file)
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                            {t('upload')}
                          </Button>
                        </>
                      )}
                    </div>
                    {guest ? (
                      <p className="text-xs text-muted-foreground">{t('guestCoverHint')}</p>
                    ) : null}
                    <FieldError errors={fieldErrors.coverImage} />
                    {values.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={values.coverImage}
                        alt={t('coverPreviewAlt')}
                        className="mt-2 h-24 w-full max-w-xs rounded-lg border object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="slug">{t('customUrlLabel')}</Label>
                      <Input
                        id="slug"
                        value={values.slug}
                        onChange={(event) => update('slug', event.target.value.toLowerCase())}
                        placeholder={t('slugPlaceholder')}
                      />
                      <FieldError errors={fieldErrors.slug} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">{t('expirationLabel')}</Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={values.expiresAt}
                        onChange={(event) => update('expiresAt', event.target.value)}
                      />
                      <FieldError errors={fieldErrors.expiresAt} />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {fieldErrors.form ? <FieldError errors={fieldErrors.form} /> : null}

            <div className="flex items-center gap-3">
              <Button type="button" size="lg" onClick={submit} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {mode === 'create' ? t('createLink') : t('saveChanges')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
                {t('cancel')}
              </Button>
            </div>
          </div>

          <LinkPreview values={values} options={options} />
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('pickerTitle')}</DialogTitle>
            <DialogDescription>{t('pickerDescription')}</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-8"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[210px_1fr]">
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1 sm:max-h-none sm:h-[52vh] sm:border-r sm:pr-3">
              <button
                type="button"
                onClick={() => {
                  setPickerPlatform('popular')
                  setPickerQuery('')
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted',
                  !searching && pickerPlatform === 'popular' && 'bg-muted font-medium',
                )}
              >
                <Sparkles className="size-4 shrink-0 text-amber-500" />
                <span className="flex-1">{t('popular')}</span>
              </button>

              <p className="px-2.5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('platformsHeading')}
              </p>

              {platformGroups.map((group) => {
                const active = !searching && pickerPlatform === group.label
                return (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => {
                      setPickerPlatform(group.label)
                      setPickerQuery('')
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted',
                      active && 'bg-muted font-medium',
                    )}
                  >
                    <PlatformGlyph
                      platform={group.label}
                      icon={group.items[0]?.icon ?? 'link'}
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(locale, group.items.length)}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="max-h-80 overflow-y-auto pr-1 sm:max-h-none sm:h-[52vh]">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {searching
                    ? t('results')
                    : pickerPlatform === 'popular'
                      ? t('popularActions')
                      : pickerPlatform}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(locale, activeOptions.length)}
                </span>
              </div>

              {activeOptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('noActionsFound')}</p>
              ) : (
                <div className="space-y-1">
                  {activeOptions.map((option) => {
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          addAction(option.key)
                          setPickerOpen(false)
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <ActionGlyph
                            platform={option.platform}
                            icon={option.icon}
                            className="size-4"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {actionLabel(option, actionT)}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {option.behavior === 'EMAIL' ? t('collectsEmail') : t('opensLink')}
                          </span>
                        </span>
                        {searching && option.platform ? (
                          <Badge variant="secondary">
                            {platformLabel(
                              { key: option.platform, label: option.platformLabel },
                              platformT,
                            )}
                          </Badge>
                        ) : null}
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function LinkPreview({
  values,
  options,
}: {
  values: LinkFormValues
  options: ActionOptionView[]
}) {
  const t = useTranslations('linkForm')
  const actionT = useTranslations('actions')
  const locale = useLocale()
  const optionFor = (type: string) => options.find((option) => option.key === type)
  const title = values.title.trim() || t('previewTitleFallback')
  const coverImage = values.coverImage.trim()
  const slug = values.slug.trim()
  const actions = values.actions

  // Everything below is read straight out of the form state: the preview is the
  // visitor's card with the owner's own inputs in it, not a stand-in picture of
  // one. Fields that are still empty say so instead of showing invented content.
  const isFile = values.contentType === 'FILE'
  const destination = (isFile ? values.fileName : values.targetUrl).trim()
  const hasDestination = (isFile ? values.fileId.trim() : values.targetUrl.trim()).length > 0
  const expiry = values.expiresAt ? new Date(values.expiresAt) : null
  const expiryLabel =
    expiry && !Number.isNaN(expiry.getTime())
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(expiry)
      : null
  const checklist = [
    { label: t('readyTitle'), filled: values.title.trim().length > 0 },
    { label: t('readyDestination'), filled: hasDestination },
    { label: t('readySteps'), filled: actions.length > 0 },
  ]
  const filled = checklist.filter((item) => item.filled).length

  return (
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">{t('livePreview')}</span>
        <Badge variant="secondary">{t('updatesLive')}</Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            className="h-32 w-full object-cover transition-[height] duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-1.5 w-full bg-primary" />
        )}

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t('sharedByYou')}
            </p>
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            {destination || expiryLabel ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {destination ? (
                  <span className="flex max-w-full items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                    {isFile ? (
                      <FileText className="size-3 shrink-0" />
                    ) : (
                      <ExternalLink className="size-3 shrink-0" />
                    )}
                    <span className="truncate">{destination}</span>
                  </span>
                ) : null}
                {expiryLabel ? (
                  <span className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                    <CalendarDays className="size-3 shrink-0" />
                    {t('previewExpires', { date: expiryLabel })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('progress')}</span>
              <span>{t('stepsCount', { total: actions.length + 1 })}</span>
            </div>
            <Progress value={0} />
          </div>

          {actions.length > 0 ? (
            <ol className="space-y-2">
              {actions.map((action, index) => {
                const option = optionFor(action.type)
                const label =
                  action.label.trim() ||
                  (option ? actionLabel(option, actionT) : action.type)
                return (
                  <li
                    key={index}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3',
                      'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
                    )}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <ActionGlyph
                          platform={option?.platform}
                          icon={option?.icon ?? 'link'}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{label}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {option?.behavior === 'EMAIL'
                          ? t('collectsEmailLong')
                          : t('opensNewTab')}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
              {t('noActionsYet')}
            </p>
          )}

          <Button size="lg" className="w-full" disabled>
            <Lock className="size-4" />
            {t('startUnlocking')}
          </Button>

          {/* The other half of the card: what the visitor is handed once the
              last step is complete. This is the part owners most want to see
              and could not see before. */}
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {t('previewAfterUnlock')}
            </p>
            {hasDestination ? (
              <p className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{destination}</span>
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                  {isFile ? t('previewDownload') : t('previewOpen')}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">{t('previewNoDestination')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Creation progress, from the real fields: nothing here can look like
          visitor data because every mark is derived from this form. */}
      <div className="mt-3 rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{t('readyHeading')}</p>
          <p className="text-[0.7rem] text-muted-foreground tabular-nums">
            {t('readyCount', { done: filled, total: checklist.length })}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round((filled / checklist.length) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('readyHeading')}
          className="mt-2 flex h-1 w-full items-center overflow-hidden rounded-full bg-muted"
        >
          {/* Width instead of the shadcn indicator's translateX, which fills from
              the wrong edge in Arabic. */}
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${(filled / checklist.length) * 100}%` }}
          />
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {checklist.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground"
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-3.5 items-center justify-center rounded-full border transition-colors duration-300',
                  item.filled
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
                )}
              >
                {item.filled ? <Check className="size-2.5" /> : null}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {slug ? t('willBeLiveAt', { slug }) : t('previewNote')}
      </p>
    </div>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}
