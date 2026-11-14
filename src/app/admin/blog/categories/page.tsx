import { Tags } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { BlogSubnav } from '@/components/admin/blog-subnav'
import { BlogTermManager } from '@/components/admin/blog-term-manager'
import { PageHeader } from '@/components/admin/page-header'
import { getAdminBlogCategories } from '@/lib/blog-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blogCategories') }
}

export default async function AdminBlogCategoriesPage() {
  await requireAdmin()
  const [t, categories] = await Promise.all([
    getTranslations('admin.blog'),
    getAdminBlogCategories(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Tags}
        title={t('categories.pageTitle')}
        description={t('categories.pageDescription')}
      />
      <BlogSubnav active="categories" />
      <BlogTermManager kind="category" initial={categories} />
    </div>
  )
}
