import { getTranslations } from 'next-intl/server'

import { BlogPostEditor } from '@/components/admin/blog-post-editor'
import {
  getBlogAuthorOptions,
  getBlogCategoryOptions,
  getBlogCoverLibrary,
} from '@/lib/blog-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blogNewArticle') }
}

export default async function NewBlogArticlePage() {
  const session = await requireAdmin()
  const [authors, categories, library] = await Promise.all([
    getBlogAuthorOptions(),
    getBlogCategoryOptions(),
    getBlogCoverLibrary(),
  ])

  return (
    <BlogPostEditor
      initial={null}
      authors={authors}
      categories={categories}
      library={library}
      defaultAuthorId={session.user.id}
    />
  )
}
