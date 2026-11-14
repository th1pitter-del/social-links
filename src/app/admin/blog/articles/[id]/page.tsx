import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { BlogPostEditor } from '@/components/admin/blog-post-editor'
import {
  getAdminBlogPostById,
  getBlogAuthorOptions,
  getBlogCategoryOptions,
  getBlogCoverLibrary,
} from '@/lib/blog-data'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getTranslations('admin.meta')
  return { title: t('blogEditArticle') }
}

export default async function EditBlogArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAdmin()
  const { id } = await params
  const post = await getAdminBlogPostById(id)
  if (!post) notFound()

  const [authors, categories, library] = await Promise.all([
    getBlogAuthorOptions(),
    getBlogCategoryOptions(),
    getBlogCoverLibrary(),
  ])

  // An author who has since lost the admin role still needs to appear selected.
  const authorOptions = post.author
    ? authors.some((author) => author.id === post.author?.id)
      ? authors
      : [post.author, ...authors]
    : authors

  return (
    <BlogPostEditor
      initial={post}
      authors={authorOptions}
      categories={categories}
      library={library}
      defaultAuthorId={session.user.id}
    />
  )
}
