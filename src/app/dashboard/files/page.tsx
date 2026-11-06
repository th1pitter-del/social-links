import { FileText, HardDrive } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

import { DeleteFileButton } from '@/components/files/delete-file-button'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { deleteStoredFileAction } from '@/lib/actions/files'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('files') }
}

export default async function FilesPage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.files')
  const tc = await getTranslations('dashboard.common')
  const locale = await getLocale()
  const files = await prisma.storedFile.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
  })

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  const sizeFormatter = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    unitDisplay: 'short',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const countFormatter = new Intl.NumberFormat(locale)
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const formatMb = (bytes: number) => sizeFormatter.format(bytes / (1024 * 1024))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm">{t('statFiles')}</span>
            <FileText className="size-4" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {countFormatter.format(files.length)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm">{t('statTotalSize')}</span>
            <HardDrive className="size-4" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{formatMb(totalBytes)}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-medium">{t('yourFiles')}</h2>
        </div>
        {files.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('colFilename')}</th>
                  <th className="px-5 py-3 font-medium">{t('colType')}</th>
                  <th className="px-5 py-3 font-medium">{t('colSize')}</th>
                  <th className="px-5 py-3 font-medium">{t('colUploaded')}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {files.map((file) => (
                  <tr key={file.id}>
                    <td className="px-5 py-3 font-medium">{file.filename}</td>
                    <td className="px-5 py-3 text-muted-foreground">{file.mimeType}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatMb(file.size)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {dateFormatter.format(file.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/api/files/${file.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            {tc('download')}
                          </Button>
                        </a>
                        <DeleteFileButton id={file.id} action={deleteStoredFileAction} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
