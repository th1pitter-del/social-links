'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import { toast } from 'sonner'

import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  /** Locale direction for the writing surface (Arabic is RTL). */
  dir?: 'ltr' | 'rtl'
  disabled?: boolean
  id?: string
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-xs"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
}

export function RichTextEditor({ value, onChange, dir = 'ltr', disabled, id }: RichTextEditorProps) {
  const t = useTranslations('admin.richText')
  const onChangeRef = useRef(onChange)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
        codeBlock: false,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-text min-h-72 px-4 py-3 focus:outline-none',
        dir,
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const next = value || ''
    if (editor.getHTML() === next) return
    if (!next && editor.isEmpty) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      underline: current?.isActive('underline') ?? false,
      strike: current?.isActive('strike') ?? false,
      heading2: current?.isActive('heading', { level: 2 }) ?? false,
      heading3: current?.isActive('heading', { level: 3 }) ?? false,
      bulletList: current?.isActive('bulletList') ?? false,
      orderedList: current?.isActive('orderedList') ?? false,
      blockquote: current?.isActive('blockquote') ?? false,
      link: current?.isActive('link') ?? false,
      alignLeft: current?.isActive({ textAlign: 'left' }) ?? false,
      alignCenter: current?.isActive({ textAlign: 'center' }) ?? false,
      alignRight: current?.isActive({ textAlign: 'right' }) ?? false,
      alignJustify: current?.isActive({ textAlign: 'justify' }) ?? false,
      inTable: current?.isActive('table') ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  })

  if (!editor) {
    return (
      <div className="rounded-lg border border-border bg-background">
        <div className="h-10 border-b border-border" />
        <div className="h-72 animate-pulse bg-muted/30" />
      </div>
    )
  }

  const blockValue = state?.heading2 ? 'h2' : state?.heading3 ? 'h3' : 'p'

  function openLinkDialog() {
    setLinkUrl((editor!.getAttributes('link').href as string | undefined) ?? '')
    setLinkOpen(true)
  }

  function applyLink() {
    const href = linkUrl.trim()
    if (!href) {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor!.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
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
      editor!.chain().focus().setImage({ src: payload.url, alt: file.name }).run()
    } catch {
      toast.error(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <Select
          value={blockValue}
          onValueChange={(next) => {
            if (next === 'p') editor.chain().focus().setParagraph().run()
            if (next === 'h2') editor.chain().focus().setHeading({ level: 2 }).run()
            if (next === 'h3') editor.chain().focus().setHeading({ level: 3 }).run()
          }}
        >
          <SelectTrigger size="sm" className="min-w-28" aria-label={t('blockLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">
              <Pilcrow /> {t('paragraph')}
            </SelectItem>
            <SelectItem value="h2">
              <Heading2 /> {t('heading2')}
            </SelectItem>
            <SelectItem value="h3">
              <Heading3 /> {t('heading3')}
            </SelectItem>
          </SelectContent>
        </Select>
        <ToolbarDivider />
        <ToolbarButton
          label={t('bold')}
          active={state?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label={t('italic')}
          active={state?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label={t('underline')}
          active={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolbarButton>
        <ToolbarButton
          label={t('strike')}
          active={state?.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t('bulletList')}
          active={state?.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label={t('orderedList')}
          active={state?.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          label={t('blockquote')}
          active={state?.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t('alignLeft')}
          active={state?.alignLeft}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft />
        </ToolbarButton>
        <ToolbarButton
          label={t('alignCenter')}
          active={state?.alignCenter}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter />
        </ToolbarButton>
        <ToolbarButton
          label={t('alignRight')}
          active={state?.alignRight}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight />
        </ToolbarButton>
        <ToolbarButton
          label={t('alignJustify')}
          active={state?.alignJustify}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label={t('link')} active={state?.link} onClick={openLinkDialog}>
          <LinkIcon />
        </ToolbarButton>
        <ToolbarButton
          label={t('image')}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        </ToolbarButton>
        <ToolbarButton
          label={t('table')}
          active={state?.inTable}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t('undo')}
          disabled={!state?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label={t('redo')}
          disabled={!state?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
        {state?.inTable ? (
          <>
            <ToolbarDivider />
            <ToolbarButton
              label={t('addRow')}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <Rows3 />
            </ToolbarButton>
            <ToolbarButton
              label={t('addColumn')}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <Columns3 />
            </ToolbarButton>
            <ToolbarButton
              label={t('deleteTable')}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 />
            </ToolbarButton>
          </>
        ) : null}
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

      <EditorContent editor={editor} />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('linkTitle')}</DialogTitle>
          </DialogHeader>
          <form
            className={cn('grid gap-3')}
            onSubmit={(event) => {
              event.preventDefault()
              applyLink()
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="rich-text-link">{t('linkUrl')}</Label>
              <Input
                id="rich-text-link"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com"
                autoFocus
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit">{t('applyLink')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
