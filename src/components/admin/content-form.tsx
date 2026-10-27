'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Bold,
  Eye,
  Heading2,
  Heading3,
  Link as LinkIcon,
  List,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/markdown'
import { updateSetting } from '@/lib/actions/admin-settings'
import { CONTENT_VALUE_MAX_LENGTH } from '@/lib/validation'
import { cn } from 'cn'

type PageDef = {
  page: string
  title: string
  value: string
  defaultValue: string
}

type PendingSelection = { page: string; start: number; end: number }

const TOOLBAR: {
  key: string
  icon: typeof Bold
  run: 'wrap' | 'prefix'
  open: string
  close?: string
}[] = [
  { key: 'heading', icon: Heading2, run: 'prefix', open: '## ' },
  { key: 'subheading', icon: Heading3, run: 'prefix', open: '### ' },
  { key: 'list', icon: List, run: 'prefix', open: '- ' },
  { key: 'bold', icon: Bold, run: 'wrap', open: '**', close: '**' },
  { key: 'link', icon: LinkIcon, run: 'wrap', open: '[', close: '](https://url)' },
]

export function ContentForm({ pages }: { pages: PageDef[] }) {
  const router = useRouter()
  const t = useTranslations('admin.content')
  const tc = useTranslations('admin.common')
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(pages.map((page) => [page.page, page.value])),
  )
  const [views, setViews] = useState<Record<string, 'write' | 'preview'>>(
    Object.fromEntries(pages.map((page) => [page.page, 'write' as const])),
  )
  const [pendingPage, setPendingPage] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const pendingSelection = useRef<PendingSelection | null>(null)

  // Restore the caret after a toolbar edit re-renders the textarea value.
  useEffect(() => {
    const pending = pendingSelection.current
    if (!pending) return
    const element = textareaRefs.current[pending.page]
    if (element) {
      element.focus()
      element.setSelectionRange(pending.start, pending.end)
    }
    pendingSelection.current = null
  }, [values])

  function setValue(page: string, next: string) {
    setValues((current) => ({ ...current, [page]: next }))
  }

  function applyWrap(page: string, open: string, close: string) {
    const element = textareaRefs.current[page]
    const value = values[page] ?? ''
    const start = element?.selectionStart ?? value.length
    const end = element?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || 'text'
    const next = value.slice(0, start) + open + selected + close + value.slice(end)
    if (next === value) return
    setValue(page, next)
    pendingSelection.current = {
      page,
      start: start + open.length,
      end: start + open.length + selected.length,
    }
  }

  function applyPrefix(page: string, marker: string) {
    const element = textareaRefs.current[page]
    const value = values[page] ?? ''
    const cursor = element?.selectionStart ?? value.length
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
    const newlineIndex = value.indexOf('\n', cursor)
    const lineEnd = newlineIndex === -1 ? value.length : newlineIndex
    const line = value.slice(lineStart, lineEnd)
    const removing = line.startsWith(marker)
    const next = removing
      ? value.slice(0, lineStart) + line.slice(marker.length) + value.slice(lineEnd)
      : value.slice(0, lineStart) + marker + line + value.slice(lineEnd)
    if (next === value) return
    setValue(page, next)
    const caret = Math.max(lineStart, cursor + (removing ? -marker.length : marker.length))
    pendingSelection.current = { page, start: caret, end: caret }
  }

  function runTool(page: string, tool: (typeof TOOLBAR)[number]) {
    if (tool.run === 'prefix') {
      applyPrefix(page, tool.open)
    } else {
      applyWrap(page, tool.open, tool.close ?? '')
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>, page: string) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault()
      applyWrap(page, '**', '**')
    }
  }

  function save(page: string) {
    setPendingPage(page)
    startTransition(async () => {
      const result = await updateSetting(`content.${page}`, values[page] ?? '')
      setPendingPage(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('savedToast'))
      router.refresh()
    })
  }

  function revertToDefault(page: string, defaultValue: string) {
    setValue(page, defaultValue)
    toast.info(t('restoredToast'))
  }

  return (
    <div className="space-y-6">
      {pages.map((page) => {
        const value = values[page.page] ?? ''
        const dirty = value !== page.value
        const atDefault = value === page.defaultValue
        const overLimit = value.length > CONTENT_VALUE_MAX_LENGTH
        const preview = views[page.page] === 'preview'
        const busy = pendingPage === page.page
        return (
          <section key={page.page} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="flex items-center gap-2 font-medium">
                    {page.title}
                    {dirty ? (
                      <span
                        className="size-1.5 rounded-full bg-amber-500"
                        title={t('unsavedChanges')}
                        aria-label={t('unsavedChanges')}
                      />
                    ) : null}
                  </h2>
                  <code className="text-xs text-muted-foreground">content.{page.page}</code>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="inline-flex rounded-lg border border-border p-0.5"
                  role="group"
                  aria-label={t('editorModeLabel', { title: page.title })}
                >
                  <button
                    type="button"
                    onClick={() => setViews((c) => ({ ...c, [page.page]: 'write' }))}
                    aria-pressed={!preview}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
                      !preview ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Pencil className="size-3.5" /> {t('write')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViews((c) => ({ ...c, [page.page]: 'preview' }))}
                    aria-pressed={preview}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
                      preview ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Eye className="size-3.5" /> {t('preview')}
                  </button>
                </div>

                <span
                  className={cn(
                    'text-xs tabular-nums',
                    overLimit ? 'font-medium text-destructive' : 'text-muted-foreground',
                  )}
                  title={t('limitTitle', { max: CONTENT_VALUE_MAX_LENGTH })}
                >
                  {value.length}/{CONTENT_VALUE_MAX_LENGTH}
                </span>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={atDefault}
                  onClick={() => revertToDefault(page.page, page.defaultValue)}
                  title={t('resetTitle')}
                >
                  <RotateCcw className="size-3.5" /> {t('reset')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !dirty || overLimit}
                  onClick={() => save(page.page)}
                >
                  {busy ? tc('saving') : tc('save')}
                </Button>
              </div>
            </div>

            {!preview ? (
              <div className="mt-3 rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5">
                  {TOOLBAR.map((tool) => {
                    const Icon = tool.icon
                    const hint = t(`toolbar.${tool.key}`)
                    return (
                      <button
                        key={tool.key}
                        type="button"
                        title={hint}
                        aria-label={hint}
                        onClick={() => runTool(page.page, tool)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Icon className="size-4" />
                      </button>
                    )
                  })}
                </div>
                <Textarea
                  ref={(element) => {
                    textareaRefs.current[page.page] = element
                  }}
                  rows={14}
                  value={value}
                  onChange={(event) => setValue(page.page, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(event, page.page)}
                  aria-label={t('contentLabel', { title: page.title })}
                  className="min-h-72 rounded-none border-0 px-3 py-3 text-sm leading-6 shadow-none focus-visible:border-0 focus-visible:ring-0"
                />
              </div>
            ) : (
              <div className="mt-3 min-h-72 rounded-lg border border-border bg-background p-4">
                {value.trim() ? (
                  <Markdown content={value} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('nothingToPreview')}</p>
                )}
              </div>
            )}
          </section>
        )
      })}
      <p className="text-xs text-muted-foreground">
        {t.rich('formattingHelp', {
          code: (chunks) => <code>{chunks}</code>,
        })}
      </p>
    </div>
  )
}
