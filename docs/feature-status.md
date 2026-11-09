# Feature status — what is implemented vs. missing

Audit of the requested feature set against the current codebase. Legend:
**Done** = fully implemented and user-manageable · **Partial** = some pieces exist ·
**Missing** = not implemented.

| Feature | Status | Can the user manage it? |
| --- | --- | --- |
| Links | Done | Yes — create, preview, edit, activate/disable, delete, share, per-link stats |
| Short links | Done | Yes — create short redirects, copy, activate/disable, delete, click count, admin moderation |
| Link-in-bio | Done | Yes — publish a public `/bio/<handle>` page with profile + link list |
| Email lists | Done | Yes — aggregated across links, view, delete, CSV export |
| Files (lock files like links) | Done | Yes — upload private files, attach to a `FILE` link, delete |
| Insights → Analytics | Done | Yes — creator totals, 14-day chart, per-link breakdown |
| Insights → Milestones | Done | Yes — derived progress across links/views/unlocks/leads |
| My unlocks | Done | Yes — history of links unlocked while signed in |

All items below were previously listed as gaps and have since been implemented. The
remaining known limitations are listed at the end.

---

## 1. Links — Done

Fully implemented for both guest and registered creators.

- Create: `src/app/dashboard/links/new/page.tsx`, `src/app/create/page.tsx` (guest, one free link),
  server actions in `src/lib/actions/links.ts` (`createLink`, `createGuestLink`).
- List / manage: `src/app/dashboard/links/page.tsx`, row actions in
  `src/components/link-row-actions.tsx` (`setLinkStatus`, `deleteLink`).
- Edit: `src/app/dashboard/links/[id]/page.tsx`, form in `src/components/link-form.tsx`
  (`updateLink`).
- Public unlock page: `src/app/link/[slug]/page.tsx` + `src/components/unlock/unlock-experience.tsx`.
- Per-link stats shown on the edit page (views, unlock starts, completed unlocks) from
  `AnalyticsEvent`.
- Custom slug + expiry supported.
- Protected content supports **URL** or **FILE** (`contentType` in `prisma/schema.prisma`):
  the creator form offers "Website URL" or "File download". Legacy `TEXT` links still work.

**User can manage:** yes, every link they own (ownership enforced server-side via `ownerId`).

## 1a. Short links — Done

A plain URL shortener, independent of unlock links: no steps, sessions or analytics.

- Manage: `src/app/dashboard/short-links/page.tsx`, form in
  `src/components/short-link-form.tsx`, row actions in
  `src/components/short-link-row-actions.tsx`, server actions in
  `src/lib/actions/short-links.ts`.
- Public redirect: `src/app/s/[code]/route.ts` — `302` with `Cache-Control: no-store`,
  counting one click per request.
- Custom code optional; otherwise a 6-character code is generated. Owner-only — guest
  creation is not offered.
- Rate limit: `limits.shortLinkCreatePerHour` (default 60/hour), editable in
  `/admin/settings`.
- Admin: `/admin/short-links` lists every short link with owner, clicks and status
  (search + status filters, enable/disable, delete); the admin overview shows the
  short-link total, recorded clicks and the five most-clicked links.

## 2. Link-in-bio — Done

- Data model: `Profile` (handle, displayName, bio, avatarUrl, published) and `BioLink`
  (label, url, position) in `prisma/schema.prisma`.
- Editor: `src/app/dashboard/profile/page.tsx` + `src/components/profile/profile-form.tsx`,
  saved by `saveProfile` / `setProfilePublished` in `src/lib/actions/profile.ts`. Handles are
  validated (`HANDLE_PATTERN`), reserved handles are rejected, and uniqueness is checked.
- Public page: `src/app/bio/[handle]/page.tsx` (published profiles only, `noindex`) showing
  the profile, its bio links, and the owner's active unlock links.
- Avatar accepts an external http(s) URL or an internal uploaded image (`/api/media/...`).
- Validation: `profileInputSchema` in `src/lib/validation.ts` (max 20 links).

**User can manage:** yes, via Dashboard → Bio page.

## 3. Email lists — Done

- Capture: the `EMAIL` action stores leads on unlock — `EmailLead` model, unique on
  `(linkId, email)`, written by `markActionComplete` (requires explicit consent).
- Aggregated area: `src/app/dashboard/leads/page.tsx` lists every lead across the owner's
  links with totals and unique-email count.
- Delete: `deleteEmailLead` in `src/lib/actions/leads.ts` (ownership enforced).
- Export: cross-link CSV at `src/app/dashboard/leads/export/route.ts`; per-link CSV still
  available at `src/app/dashboard/links/[id]/leads/route.ts` (both ownership-enforced,
  `no-store`).

**User can manage:** yes — view, delete, export.

## 4. Files (lock files) — Done

- Data model: `StoredFile` (filename, mimeType, size, owner) and `Link.fileId`, with
  `LinkContentType.FILE`. Migration: `20261016004800_stored_files` (supersedes the short-lived
  `LinkFile` table).
- Storage: private disk storage in `src/lib/file-storage.ts` (`MEDIA_STORAGE_DIR/files`),
  MIME allowlist (`LOCKED_FILE_MIME_TYPES`), size limit from `limits.fileMaxMb`.
- Upload: `src/app/api/uploads/file/route.ts` (signed-in owners, rate limited).
- Attach: the link editor's "File download" mode uploads/selects a file.
- Creator manager: `src/app/dashboard/files/page.tsx` (list, storage totals, delete).
- Delete: `deleteStoredFileAction` disables links that referenced the file.
- Secure delivery: content is only released by `claimContent` when the session is
  `VERIFIED`; the browser gets `/api/unlock/[token]/download`, which re-checks expiry,
  verification and action completion before streaming. The owner-only
  `/api/files/[id]` route is authenticated and ownership-checked.

**User can manage:** yes — upload, attach, view, delete.

## 5. Insights

### 5a. Analytics — Done

- Data layer: `AnalyticsEvent` with `VIEW`, `UNLOCK_START`, `ACTION_DONE`,
  `UNLOCK_COMPLETE`.
- Creator overview: `src/app/dashboard/page.tsx` (links, views, starts, conversions).
- Creator analytics: `src/app/dashboard/analytics/page.tsx` — totals, 14-day views vs
  completed-unlocks chart (`src/components/admin/bar-chart.tsx`), and a per-link table with
  conversion.
- Per-link totals on the edit page; admin platform-wide stats + 14-day chart.

**User can manage:** read-only insights (no date-range filter yet).

### 5b. Milestones — Done

- Derived, with no dedicated table: `src/app/dashboard/milestones/page.tsx` computes progress
  from link count, views, completed unlocks and email leads, and renders progress bars.

**User can manage:** view progress (milestones are computed, not edited).

## 6. My unlocks — Done

- `UserUnlock` model (`@@unique([userId, linkId])`) records a durable history entry when a
  **signed-in** visitor claims content (`claimContent`).
- Dashboard page: `src/app/dashboard/unlocks/page.tsx` lists unlocked links with dates and
  copy/open actions.

**User can manage:** view history.

---

## 7. Known limitations / optional next steps

- **Analytics depth:** no unique-visitor estimates, referrer/source, device or country
  breakdowns, and no date-range filter for creators.
- **Milestones** are derived and stateless — nothing is persisted or notified when a
  milestone is reached.
- **My unlocks** records history but does not re-issue protected content without repeating
  the link's unlock steps; it links back to `/link/<slug>`.
- **Files:** admins have a locked-file browser at `/admin/files` (list, storage totals, the
  links that deliver each file, and delete — which disables those links). No per-owner storage
  quota yet.
- **Email lists:** no tags/segments, unsubscribe handling, or campaign sending.
- **Bio page:** no theme customization or link ordering UI beyond array order; avatar is a
  URL or uploaded image.
- The `rules.socialPlatforms` / `rules.contentPolicy` settings are editable and exposed via
  `getSiteSettings()` but are not yet enforced.
- The action catalog is fully editable: admins can create/delete custom platforms, add actions
  to any platform, and remove custom actions. Built-in (`system`) platforms and actions are
  protected — they can be renamed, enabled/disabled, but not deleted. Deletion is refused while
  a row is still referenced by a link.
