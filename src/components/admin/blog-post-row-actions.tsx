'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ExternalLink, Eye, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { Switch } from '@/components/ui/switch'
import { deleteBlogPost, setBlogPostStatus } from '@/lib/actions/admin-blog'
import { effectiveBlogPostStatus, type BlogPostSummary } from '@/lib/blog'

export function BlogPostRowActions({ post }: { post: BlogPostSummary }) {
  const t = useTranslations('admin.blog.list')
  const tc = useTranslations('admin.common')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const published = post.status === 'PUBLISHED'
  const publicVisible = effectiveBlogPostStatus(post) === 'PUBLISHED'

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setBlogPostStatus(post.id, next ? 'PUBLISHED' : 'DRAFT')
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(next ? t('toasts.published') : t('toasts.unpublished'))
      router.refresh()
    })
  }

  function confirmDelete() {
    setBusy(true)
    startTransition(async () => {
      const result = await deleteBlogPost(post.id)
      setBusy(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setConfirm(false)
      toast.success(t('toasts.deleted'))
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {pending ? <Loader2 className="me-1 size-4 animate-spin text-muted-foreground" /> : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t('previewAria', { title: post.title })}
        title={t('preview')}
        asChild
      >
        <Link href={`/blog/preview/${post.id}`} target="_blank">
          <Eye />
        </Link>
      </Button>
      {publicVisible ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('openAria', { title: post.title })}
          title={t('openPublic')}
          asChild
        >
          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="icon-xs" aria-label={t('editAria')} asChild>
        <Link href={`/admin/blog/articles/${post.id}`}>
          <Pencil />
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t('deleteAria', { title: post.title })}
        onClick={() => setConfirm(true)}
      >
        <Trash2 />
      </Button>
      <Switch
        checked={published}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={t('publishAria', { title: post.title })}
      />

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>{t('deleteDescription', { title: post.title })}</DialogDescription>
          </DialogHeader>
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
    </div>
  )
}
