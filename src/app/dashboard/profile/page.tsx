import { getTranslations } from 'next-intl/server'

import { ProfileForm, type ProfileFormValues } from '@/components/profile/profile-form'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function generateMetadata() {
  const t = await getTranslations('dashboard.meta')
  return { title: t('bioPage') }
}

function suggestHandle(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? 'user').split('@')[0]
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  return cleaned.length >= 2 ? cleaned : 'my-links'
}

export default async function ProfilePage() {
  const session = await requireUser()
  const t = await getTranslations('dashboard.bioPage')
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      handle: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      published: true,
      links: {
        orderBy: { position: 'asc' },
        select: { label: true, url: true },
      },
    },
  })

  const initial: ProfileFormValues = profile
    ? {
        handle: profile.handle,
        displayName: profile.displayName ?? '',
        bio: profile.bio ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        published: profile.published,
        links: profile.links.map((link) => ({ label: link.label, url: link.url })),
      }
    : {
        handle: suggestHandle(session.user.name, session.user.email),
        displayName: session.user.name ?? '',
        bio: '',
        avatarUrl: '',
        published: false,
        links: [],
      }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <ProfileForm initial={initial} />
    </div>
  )
}
