'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Globe, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { saveProfile, setProfilePublished } from '@/lib/actions/profile'

type BioLinkRow = { label: string; url: string }

export type ProfileFormValues = {
  handle: string
  displayName: string
  bio: string
  avatarUrl: string
  published: boolean
  links: BioLinkRow[]
}

const MAX_LINKS = 20

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const t = useTranslations('profileForm')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [values, setValues] = useState<ProfileFormValues>(initial)
  const [uploading, setUploading] = useState(false)
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
        : { ...current, links: [...current.links, { label: '', url: '' }] },
    )
  }

  function removeLink(index: number) {
    setValues((current) => ({ ...current, links: current.links.filter((_, i) => i !== index) }))
  }

  async function uploadAvatar(file: File) {
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
        links: values.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      })
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        toast.error(result.error)
        return
      }
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

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">{t('avatarLabel')}</Label>
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
                  <div className="mt-2 space-y-2">
                    <Input
                      value={link.label}
                      onChange={(event) => updateLink(index, { label: event.target.value })}
                      placeholder={t('buttonLabelPlaceholder')}
                      maxLength={60}
                    />
                    <Input
                      value={link.url}
                      onChange={(event) => updateLink(index, { url: event.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
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

      <BioPreview values={values} />
    </div>
  )
}

function BioPreview({ values }: { values: ProfileFormValues }) {
  const t = useTranslations('profileForm')
  const handle = values.handle.trim() || t('handleFallback')
  const name = values.displayName.trim() || t('nameFallback')

  return (
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">{t('preview')}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-20 w-full bg-gradient-to-r from-primary via-pulse-lime-soft to-[#a8c61e]" />
        <div className="space-y-4 p-5">
          <div className="-mt-12 flex flex-col items-center">
            {values.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.avatarUrl}
                alt=""
                className="size-20 rounded-full border-4 border-card object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border-4 border-card bg-muted text-2xl font-semibold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="mt-3 text-lg font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">/bio/{handle}</p>
            {values.bio ? (
              <p className="mt-2 text-center text-sm text-muted-foreground">{values.bio}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            {values.links.length === 0 ? (
              <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                {t('emptyLinksNote')}
              </p>
            ) : (
              values.links.map((link, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background px-4 py-3 text-center text-sm font-medium"
                >
                  {link.label.trim() || t('buttonFallback')}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}
