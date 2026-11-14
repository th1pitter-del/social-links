import { Hash } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { BlogSubnav } from '@/components/admin/blog-subnav'
import { BlogTermManager } from '@/components/admin/blog-term-manager'
import { PageHeader } from '@/components/admin/page-header'
import { getAdminBlogTags } from '@/lib/blog-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blogTags') }
}

export default async function AdminBlogTagsPage() {
  await requireAdmin()
  const [t, tags] = await Promise.all([getTranslations('admin.blog'), getAdminBlogTags()])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Hash}
        title={t('tags.pageTitle')}
        description={t('tags.pageDescription')}
      />
      <BlogSubnav active="tags" />
      <BlogTermManager kind="tag" initial={tags} />
    </div>
  )
}
