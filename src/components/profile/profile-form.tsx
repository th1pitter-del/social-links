'use client'

import { useRef, useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, ExternalLink, Globe, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { saveProfile, setProfilePublished } from '@/lib/actions/profile'
import { BIO_PLATFORM_GROUPS } from '@/lib/bio-platforms'
import {
  BIO_ACCENT_PRESETS,
  BIO_THEMES,
  bioButtonCssVars,
  bioButtonVisual,
  bioCardStyle,
  bioHeadingStyle,
  bioThemeButtonUsesAccent,
  isHexColor,
  resolveBioPalette,
  resolveBioTheme,
} from '@/lib/bio-themes'
import { BioLinkGlyph } from '@/components/profile/bio-link-glyph'

type BioLinkRow = { platform: string; label: string; url: string }

export type ProfileFormValues = {
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
  theme: string
  accent: string
  published: boolean
  links: BioLinkRow[]
}

const MAX_LINKS = 20

function platformLabel(key: string, websiteLabel: string) {
  if (key === 'website') return websiteLabel
  const match = BIO_PLATFORM_GROUPS.flatMap((group) => group.platforms).find(
    (platform) => platform.key === key,
  )
  return match?.label ?? key
}

export function ProfileForm({
  initial,
  liveHref,
}: {
  initial: ProfileFormValues
  /** Public URL of the saved profile; absent until the first save. */
  liveHref?: string
}) {
  const t = useTranslations('profileForm')
  const uploadT = useTranslations('uploads.errors')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [values, setValues] = useState<ProfileFormValues>(initial)
  const [uploading, setUploading] = useState(false)
  const groupLabels = {
    popular: t('platformGroupPopular'),
    social: t('platformGroupSocial'),
    creator: t('platformGroupCreator'),
    other: t('platformGroupOther'),
  } as const
  const fileRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateLink(index: number, patch: Partial<BioLinkRow>) {
    setValues((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }))
  }

  function addLink() {
    setValues((current) =>
      current.links.length >= MAX_LINKS
        ? current
        : { ...current, links: [...current.links, { platform: '', label: '', url: '' }] },
    )
  }

  function removeLink(index: number) {
    setValues((current) => ({ ...current, links: current.links.filter((_, i) => i !== index) }))
  }

  function uploadError(code?: string, maxMb?: number) {
    return code && uploadT.has(code) ? uploadT(code, { maxMb: maxMb ?? '' }) : t('uploadFailed')
  }

  async function uploadAvatar(file: File) {
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
      update('avatarUrl', payload.url)
      toast.success(t('imageUploaded'))
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function save() {
    setFieldErrors({})
    startTransition(async () => {
      const result = await saveProfile({
        handle: values.handle.trim(),
        displayName: values.displayName.trim(),
        bio: values.bio.trim(),
        avatarUrl: values.avatarUrl.trim(),
        theme: values.theme,
        accent: values.accent.trim(),
        links: values.links.map((link) => ({
          label: link.label.trim(),
          url: link.url.trim(),
          platform: link.platform,
        })),
      })
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        toast.error(result.error)
        return
      }
      setValues((current) => ({ ...current, published: result.published }))
      toast.success(t('savedToast'))
      router.refresh()
    })
  }

  function togglePublished() {
    startTransition(async () => {
      const result = await setProfilePublished(!values.published)
      if (!result.ok) {
        toast.error(result.error ?? t('updateFailed'))
        return
      }
      setValues((current) => ({ ...current, published: !current.published }))
      toast.success(!values.published ? t('publishedToast') : t('unpublishedToast'))
      router.refresh()
    })
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-medium">{t('profileTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('profileDescription')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle">{t('handleLabel')}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/bio/</span>
              <Input
                id="handle"
                value={values.handle}
                onChange={(event) => update('handle', event.target.value.toLowerCase())}
                placeholder={t('handlePlaceholder')}
              />
            </div>
            <FieldError errors={fieldErrors.handle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t('displayNameLabel')}</Label>
            <Input
              id="displayName"
              value={values.displayName}
              onChange={(event) => update('displayName', event.target.value)}
              placeholder={t('displayNamePlaceholder')}
              maxLength={80}
            />
            <FieldError errors={fieldErrors.displayName} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('bioLabel')}</Label>
            <Textarea
              id="bio"
              value={values.bio}
              onChange={(event) => update('bio', event.target.value)}
              placeholder={t('bioPlaceholder')}
              maxLength={500}
              rows={3}
            />
            <FieldError errors={fieldErrors.bio} />
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-medium">{t('appearanceTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('appearanceDescription')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('themeLabel')}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BIO_THEMES.map((theme) => {
                const selected = theme.id === values.theme
                const button = bioButtonVisual(theme.id, null)
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => update('theme', theme.id)}
                    aria-pressed={selected}
                    className="rounded-xl border p-2 text-start transition-colors hover:border-foreground/30"
                    style={selected ? { borderColor: 'var(--primary)' } : undefined}
                  >
                    <span
                      className="flex h-24 w-full flex-col items-center gap-1.5 overflow-hidden rounded-lg px-3 pt-3"
                      style={
                        {
                          '--bio-accent': theme.palette.accent,
                          backgroundColor: theme.palette.background,
                          backgroundImage: theme.backdrop,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: theme.backdropSize ?? 'cover',
                        } as CSSProperties
                      }
                    >
                      <span
                        className={
                          theme.card
                            ? 'flex w-full flex-col items-center gap-1.5 rounded-md border p-1.5'
                            : 'flex w-full flex-col items-center gap-1.5'
                        }
                        style={
                          theme.card
                            ? {
                                backgroundColor: theme.card.background,
                                borderColor: theme.card.border,
                                borderRadius: Math.min(theme.card.radius, 10),
                              }
                            : undefined
                        }
                      >
                        <span
                          className="size-5 rounded-full border"
                          style={{
                            backgroundColor: theme.palette.surface,
                            borderColor: theme.palette.border,
                          }}
                        />
                        {[0, 1].map((row) => (
                          <span
                            key={row}
                            className="flex h-4 w-full items-center gap-1 px-2"
                            style={{
                              backgroundColor: button.backgroundColor,
                              backgroundImage: button.backgroundImage,
                              border: `1px solid ${button.borderColor}`,
                              borderRadius: Math.min(button.borderRadius, 8),
                            }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: button.color, opacity: 0.8 }}
                            />
                            <span
                              className="h-1 flex-1 rounded-full"
                              style={{ backgroundColor: button.color, opacity: 0.55 }}
                            />
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-1 text-xs font-medium">
                      {theme.label}
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
            <FieldError errors={fieldErrors.theme} />
          </div>

          {bioThemeButtonUsesAccent(values.theme) ? (
            <div className="space-y-2">
              <Label htmlFor="accentColor">{t('accentLabel')}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => update('accent', '')}
                  aria-pressed={values.accent === ''}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-foreground/30"
                  style={values.accent === '' ? { borderColor: 'var(--primary)' } : undefined}
                >
                  {t('accentThemeDefault')}
                </button>
                {BIO_ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => update('accent', color)}
                    aria-label={color}
                    aria-pressed={values.accent.toLowerCase() === color.toLowerCase()}
                    className="size-8 rounded-full border-2 transition-transform motion-safe:hover:scale-105"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        values.accent.toLowerCase() === color.toLowerCase()
                          ? 'var(--foreground)'
                          : 'transparent',
                    }}
                  />
                ))}
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    id="accentColor"
                    type="color"
                    value={isHexColor(values.accent) ? values.accent : '#d5ff2f'}
                    onChange={(event) => update('accent', event.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border bg-transparent"
                  />
                  {t('accentCustom')}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{t('accentHint')}</p>
              <FieldError errors={fieldErrors.accent} />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">{t('logoLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="avatarUrl"
                value={values.avatarUrl}
                onChange={(event) => update('avatarUrl', event.target.value)}
                placeholder={t('avatarPlaceholder')}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadAvatar(file)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {t('upload')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('logoHint')}</p>
            <FieldError errors={fieldErrors.avatarUrl} />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{t('linksTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('linksDescription')}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={addLink}
              disabled={values.links.length >= MAX_LINKS}
              aria-label={t('addLink')}
            >
              <Plus />
            </Button>
          </div>

          {values.links.length === 0 ? (
            <button
              type="button"
              onClick={addLink}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="size-4" />
              {t('addFirstLink')}
            </button>
          ) : (
            <ul className="space-y-3">
              {values.links.map((link, index) => (
                <li key={index} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t('linkNumber', { number: index + 1 })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeLink(index)}
                      aria-label={t('removeLink')}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
                    <Select
                      value={link.platform || 'custom'}
                      onValueChange={(value) =>
                        updateLink(index, { platform: value === 'custom' ? '' : value })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <span className="flex min-w-0 items-center gap-2">
                          <BioLinkGlyph platform={link.platform} className="size-4 shrink-0" />
                          <span className="truncate">
                            {link.platform
                              ? platformLabel(link.platform, t('platformWebsite'))
                              : t('platformCustom')}
                          </span>
                        </span>
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72">
                        <SelectItem value="custom">
                          <span className="flex items-center gap-2">
                            <BioLinkGlyph platform={null} className="size-4" />
                            {t('platformCustom')}
                          </span>
                        </SelectItem>
                        {BIO_PLATFORM_GROUPS.map((group) => (
                          <SelectGroup key={group.key}>
                            <SelectLabel>{groupLabels[group.key]}</SelectLabel>
                            {group.platforms.map((platform) => (
                              <SelectItem key={platform.key} value={platform.key}>
                                <span className="flex items-center gap-2">
                                  <BioLinkGlyph platform={platform.key} className="size-4" />
                                  {platform.key === 'website'
                                    ? t('platformWebsite')
                                    : platform.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={link.label}
                      onChange={(event) => updateLink(index, { label: event.target.value })}
                      placeholder={t('buttonLabelPlaceholder')}
                      maxLength={60}
                    />
                  </div>
                  <Input
                    value={link.url}
                    onChange={(event) => updateLink(index, { url: event.target.value })}
                    placeholder="https://example.com"
                    className="mt-2"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex items-center gap-3">
          <Button type="button" size="lg" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t('saveProfile')}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={togglePublished} disabled={pending}>
            <Globe />
            {values.published ? t('unpublish') : t('publish')}
          </Button>
        </div>
      </div>

      <BioPreview liveHref={liveHref} values={values} />
    </div>
  )
}

function BioPreview({ values, liveHref }: { values: ProfileFormValues; liveHref?: string }) {
  const t = useTranslations('profileForm')
  const handle = values.handle.trim() || t('handleFallback')
  const name = values.displayName.trim() || t('nameFallback')
  const theme = resolveBioTheme(values.theme)
  const palette = resolveBioPalette(values.theme, values.accent)
  const buttonVars = bioButtonCssVars(values.theme, values.accent)
  const vars = {
    '--bio-accent': palette.accent,
    backgroundColor: palette.background,
    backgroundImage: theme.backdrop,
    backgroundRepeat: 'no-repeat',
    backgroundSize: theme.backdropSize ?? 'cover',
    color: palette.text,
    fontFamily: theme.bodyFont,
  } as CSSProperties

  return (
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">{t('preview')}</span>
      </div>
      <div
        className="overflow-hidden rounded-2xl border shadow-sm"
        style={{ ...vars, borderColor: palette.border }}
      >
        <div className="space-y-4 px-5 py-8">
          <div className={theme.card ? 'border p-4' : undefined} style={bioCardStyle(theme.card)}>
            <div className="flex flex-col items-center text-center">
              {values.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.avatarUrl}
                  alt=""
                  className="size-20 rounded-full border object-cover"
                  style={{ borderColor: palette.border }}
                />
              ) : (
                <div
                  className="flex size-20 items-center justify-center rounded-full border text-2xl font-semibold"
                  style={{ borderColor: palette.border, backgroundColor: palette.surface }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="mt-4 text-lg font-semibold" style={bioHeadingStyle(theme)}>
                {name}
              </p>
              <p className="text-xs" style={{ color: palette.muted }}>
                /bio/{handle}
              </p>
              {values.bio ? (
                <p
                  className="mt-2 text-center text-sm leading-relaxed"
                  style={{ color: palette.muted }}
                >
                  {values.bio}
                </p>
              ) : null}
            </div>
            <div className="mt-4 space-y-2">
              {values.links.length === 0 ? (
                <p
                  className="rounded-xl border border-dashed p-3 text-center text-xs"
                  style={{ borderColor: palette.border, color: palette.muted }}
                >
                  {t('emptyLinksNote')}
                </p>
              ) : (
                values.links.map((link, index) => (
                  <div
                    key={index}
                    className="bio-link flex items-center gap-2 px-4 py-3 text-sm"
                    style={buttonVars}
                  >
                    <BioLinkGlyph platform={link.platform} className="size-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {link.label.trim() || t('buttonFallback')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {liveHref && values.published ? (
        <Button variant="outline" size="lg" asChild className="mt-3 w-full">
          <a href={liveHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            {t('viewLivePage')}
          </a>
        </Button>
      ) : null}
    </div>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}
