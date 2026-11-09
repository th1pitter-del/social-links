# Project workflow — what we created

This document summarizes the full implementation of the Social Link Unlocker platform as of this session. It covers scope, architecture, data model, business rules, user journeys, admin tooling, security, operations and verification.

## 1. Project goal
- Free Next.js social link-unlocking platform. Creators publish links that require visitors to complete configured social actions before content is revealed.
- Free to use; no premium plans, subscriptions or monetization step.
- Protected content is never served before every configured action is completed and verified server-side.
- All core scope implemented: public site + auth, guest one-free-link creation, creator dashboard, admin panel, unlock flow, abuse reports, email leads export, preview for owners, retention/cleanup, email webhook transport. Plus the feature pack: link-in-bio profiles, locked-file protected content, aggregated email lists, creator analytics, milestones and "My unlocks".

## 2. Technology stack
- Next.js 16.4.0 (App Router, Turbopack, `src/` dir)
- React 19.3.0, TypeScript 5.x
- Tailwind CSS v4, shadcn/ui (Radix primitives; "nova" preset) — new shadcn CLI uses `-b radix -p nova`
- Prisma 7.10.0 with MySQL 8.4 adapter (`@prisma/adapter-mariadb`)
- better-auth 1.7.7 (email/password, Prisma adapter, cookie-based sessions, server actions)
- zod 4.6.7 for shared validation
- lucide-react (updated icons; some brand icons unavailable in v1; replaced YouTube → Video)
- sonner for toasts
- dotenv 18.x, tsx (seed + scripts)

## 3. Application structure
### Routes (App Router)
- **(auth)**: `layout.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` (uses server actions, client forms)
- **Dashboard (creator)**:
  - `dashboard/layout.tsx` (requires auth via `requireUser` and redirects)
  - `dashboard/page.tsx` (overview: totals, views/unlocks)
  - `dashboard/links/page.tsx` (owner's links)
  - `dashboard/links/new/page.tsx` (create)
  - `dashboard/links/[id]/page.tsx` (edit: metadata, actions, expiry, live unlock preview beside the form, preview button, per-link stats, email leads preview/export link)
  - `dashboard/links/[id]/leads/route.ts` (CSV export, ownership-enforced; no-store; 401/404 on failure)
  - `dashboard/analytics/page.tsx` (creator totals, 14-day views vs unlocks chart, per-link conversion table)
  - `dashboard/leads/page.tsx` (aggregated email leads across all owned links, delete + CSV) and `dashboard/leads/export/route.ts` (cross-link CSV)
  - `dashboard/files/page.tsx` (locked-file manager: list, storage totals, delete) and `dashboard/unlocks/page.tsx` (My unlocks history)
  - `dashboard/milestones/page.tsx` (derived progress across links/views/unlocks/leads)
  - `dashboard/profile/page.tsx` (link-in-bio editor: handle, display name, bio, avatar, ordered links, publish toggle)
- **Admin** (separate console UI: dark slate sidebar + light content, scoped by the `.admin-theme` token block in `globals.css`; shell in `components/admin/admin-shell.tsx`, shared primitives in `components/admin/{page-header,stat-card,panel,filter-tabs,bar-chart}.tsx`):
  - `layout.tsx` (requires ADMIN; renders `AdminShell` with site name + open-reports badge)
  - `page.tsx` (overview: 6 stat cards, 14-day view/unlock bar chart, open reports, newest users, top links by views)
  - `users/page.tsx` (search + all/admins/banned tabs, bulk ban/unban), `users/[id]/page.tsx` (detail: role change, ban/unban, links, sessions), `users/export/route.ts` (CSV, honors search/status)
  - `links/page.tsx` (search + all/active/draft/disabled tabs, bulk enable/disable), `links/[id]/page.tsx` (detail: actions, unlock sessions, reports, protected content), `links/export/route.ts` (CSV, honors search/status)
  - `reports/page.tsx` (open/resolved/dismissed tabs; Resolve, Resolve & disable link, Dismiss; closed list)
  - `platforms/page.tsx` (master/detail Platforms & Action Types: enable/disable a platform and its individual actions, edit action display labels, create/delete custom platforms, add actions to any platform, delete custom actions), `content/page.tsx` (markdown editor for the public page bodies: formatting toolbar, write/preview toggle, character counter against `CONTENT_VALUE_MAX_LENGTH`, unsaved-change indicator, reset-to-default), `media/page.tsx` (list + delete uploaded cover images + storage stats), `files/page.tsx` (list + delete owners' locked files, showing the links that deliver them, + storage stats), `settings/page.tsx` (redirects to the first group; groups live at `settings/[group]/page.tsx` + `settings/[group]/layout.tsx` — site-content, rate-limits, upload-limits, platform-rules, defined in `components/admin/settings-config.ts` with `settings-nav.tsx`), `audit/page.tsx` (audit trail with text filter)
- **Public**:
  - `page.tsx` (landing page, feature list with `Video` icon)
  - `u/[slug]/page.tsx` (unlock page: renders `UnlockExperience`; handles DISABLED/DRAFT/EXPIRED; owner-only `?preview=1`, blocks DRAFT+non-owner)
  - `report/page.tsx` (public abuse report form, checks link exists)
  - `create/page.tsx` (guest link creation: no account required; authenticated visitors are redirected to `dashboard/links/new`)
   - `faq/page.tsx`, `contact/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`
   - `bio/[handle]/page.tsx` (public link-in-bio page for published profiles: avatar, bio, bio links, and the owner's active unlock links; `noindex`)
 - **API**:
    - `api/auth/[...all]/route.ts` (better-auth handlers)
   - `api/uploads/route.ts` (owner cover-image upload: validates type/size via settings, stores bytes privately, records `MediaAsset`)
   - `api/uploads/file/route.ts` (owner locked-file upload: MIME allowlist + `limits.fileMaxMb`, stores bytes privately, records `StoredFile`)
   - `api/media/[id]/route.ts` (serves cover images; public by design)
   - `api/files/[id]/route.ts` (owner-only download of a stored file; authenticated + ownership-checked, 404 otherwise)
   - `api/unlock/[token]/download/route.ts` (post-unlock protected file stream; requires a non-expired VERIFIED session with every action completed)
   - `api/dev/*` (temporary e2e routes existed during verification and were removed)

### Middleware/proxy
- `src/proxy.ts`: cookie-only optimistic redirects for `/dashboard` and `/admin` (per Next 16: middleware renamed to `proxy.ts`). Real authorization is rechecked on every server action/page/handler.

### Core libs (`src/lib/`)
- `prisma.ts`: `PrismaClient` (MariaDB adapter, `../src/generated/prisma`)
- `auth.ts`: better-auth config. `sendResetPassword` POSTs to `EMAIL_WEBHOOK_URL` (optional bearer + `EMAIL_FROM`) → falls back to console.info in dev, logs warning in prod.
- `auth-client.ts`: browser client
- `session.ts`: `getSession()`, `requireUser()`, `requireAdmin()` (server guards, redirect)
- `guest.ts`: guest link ownership — `createGuestToken`, `getGuestToken`/`setGuestCookie`/`clearGuestCookie` (HMAC-signed `lu_guest` cookie keyed by `BETTER_AUTH_SECRET`), `guestIpKey` (salted IP hash for the anti-abuse rate limit), `claimGuestLinks(userId)` (transfers `guestToken` links to an account and clears the cookie)
- `rate-limit.ts`: MySQL fixed-window via `RateLimitBucket` (atomic upsert), returns `ok/remaining/retryAfterSeconds`, `tooManyRequests()` helper
- `slug.ts`: slug generation + reserved slugs
- `validation.ts`: zod v4 schemas (`linkInputSchema` with content-type branching + `expiresAt` sanity check), `ACTION_KEY_PATTERN`, `httpUrlSchema`, `emailCaptureSchema`, `slugParamSchema`, enums, `CONTENT_VALUE_MAX_LENGTH`
- `unlock.ts`: public types, `getPublicUnlockLink` (includes `ownerId`, actions ordered), `isExpired`
- `mailer.ts`: webhook-based mail sender (JSON POST to `EMAIL_WEBHOOK_URL`, 10s timeout)
- `admin-utils.ts`: `writeAudit()` (records `AuditLog` with actor from the admin session), `getSettings()`, `setSetting()`
- `settings.ts` (`server-only`): DB-backed site/content/settings with cached reads and defaults; `getSiteSettings`, `getSettingMap`, `getPageContent`, `CONTENT_PAGES`, `CONTENT_PAGE_TITLES`, `DEFAULT_CONTENT`
- `media.ts`: private media storage on disk (`MEDIA_STORAGE_DIR`), `deleteMedia`, size/type limits from settings
- `file-storage.ts`: private locked-file storage (`MEDIA_STORAGE_DIR/files`), MIME allowlist (`LOCKED_FILE_MIME_TYPES`), `limits.fileMaxMb` size limit, `saveStoredFile`/`getStoredFile`/`readStoredFileBytes`/`createStoredFileStream`/`deleteStoredFile` (deleting disables links that referenced the file)
- `action-catalog.ts` (`server-only`, React-cached): `getActionOptionMap`, `getEnabledActionOptions` (what the creator link editor offers), `getAllActionOptions`, `getAllPlatforms`, `getEnabledPlatforms` — reads the admin-managed Platform/ActionOption catalog; platform action options expose `behavior` + `system` for the admin UI
- `action-defaults.ts`: built-in catalog data (~31 platforms, ~101 action options) seeded by `prisma/seed.ts`
- `action-icons.ts`: `actionIcon()` id → lucide component map used by admin + creator UIs
- `utils.ts`: `cn()`

### Server actions (`src/lib/actions/`)
- `auth.ts`: `signUpAction`, `signInAction`, `signOutAction`, `requestPasswordResetAction`, `resetPasswordAction` with per-IP rate limits and generic error messages; successful sign-in/sign-up calls `claimGuestLinks` to transfer the browser's guest links onto the account
- `links.ts`: `createLink` (rate-limited by user, validates input, enforces slug uniqueness/reserved, transactionally creates the link), `createGuestLink` (same validation/persistence via the shared `createLinkRecord`, but the link is owned by a signed-cookie guest token, published `ACTIVE` immediately, limited to one free link per browser and rate-limited per hashed IP), `updateLink` (replaces actions, preserves invariants), `setLinkStatus`, `deleteLink`
- `unlock.ts`: `getUnlockState`, `startUnlock` (rate-limited by hashed IP, preview-mode allows owner-only DRAFT preview without analytics), `markActionComplete` (handles EMAIL → upsert EmailLead + consent check, flips the session to VERIFIED once every action is done), `claimContent` (only when `VERIFIED`, logs UNLOCK_COMPLETE, returns the protected payload; for `FILE` it returns a `/api/unlock/[token]/download` URL, and for signed-in visitors it upserts a `UserUnlock` history entry)
- `files.ts`: `deleteStoredFileAction` (owner-only delete of a stored file)
- `leads.ts`: `deleteEmailLead` (ownership enforced via the lead's link owner)
- `profile.ts`: `saveProfile` (upsert `Profile`, replace `BioLink`s, handle uniqueness/reserved checks), `setProfilePublished` (publish toggle)
- `admin.ts`: `setUserBanned` (blocks self-ban, deletes sessions, clears ban on unban), `adminSetUserRole` (blocks self-role-change), `bulkSetUserBanned`, `adminSetLinkStatus`, `bulkSetLinkStatus`, `setPlatformEnabled`, `setActionOptionEnabled`, `updateActionOptionLabel` (trim/length validation, stamps `updatedBy`), `createPlatform`, `deletePlatform` (refuses `system`, refuses in-use), `createActionOption`, `deleteActionOption` (refuses `system`, refuses in-use), `deleteMediaAsset`, `adminDeleteStoredFile` (disables links delivering the file) — every action requires ADMIN and writes an `AuditLog` entry
- `admin-settings.ts`: `updateSetting` (ADMIN, validates key/length, persists via `setSetting`, writes an audit entry, revalidates settings/content)
- `reports.ts`: `submitAbuseReport` (rate-limited by hashed IP, validates, finds link by slug, stores hashed reporter IP), `resolveAbuseReport` (admin-only, closes once, optional link disable in tx, writes an audit entry)

### Components
- UI (shadcn): button, card, input, label, textarea, select, badge, alert, dropdown-menu, table, tabs, separator, switch, avatar, sonner, skeleton, dialog, checkbox, progress
- App: `site-header.tsx`, `site-footer.tsx`, `copy-button.tsx`, `markdown.tsx` (dependency-free renderer for admin-authored page content — `##`/`###` headings, `- ` lists, `**bold**`, `[label](url)`; React elements only, raw HTML never injected)
- Auth: `sign-in-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`
- Links/creator: `link-form.tsx` (create/edit, URL vs File content, actions list, expiry datetime-local), `link-row-actions.tsx`
- Dashboard (creator): `dashboard-shell.tsx` (collapsible sidebar + breadcrumb topbar, persisted collapse state via `useSyncExternalStore`), `profile/profile-form.tsx`, `files/delete-file-button.tsx`, `leads/delete-lead-button.tsx`
- Admin: `admin-shell.tsx` (dark sidebar + topbar), `admin-users-table.tsx`, `admin-links-table.tsx`, `platforms-table.tsx` (platform list + per-action enable switches + inline label editing), `content-form.tsx`, `settings-form.tsx`, `settings-nav.tsx`, `settings-config.ts` (grouped settings definitions), `user-row-actions.tsx`, `user-detail-actions.tsx`, `link-row-actions.tsx`, `report-row-actions.tsx`, `media-row-actions.tsx`, plus shared primitives `page-header.tsx`, `stat-card.tsx`, `panel.tsx`, `filter-tabs.tsx`, `bar-chart.tsx`
- Unlock: `unlock-experience.tsx` (start → actions → claim, preview banner, promotional CTA, report link)
- Report: `report-link-form.tsx`

### Scripts
- `scripts/cleanup.ts`: retention cleanup (rate-limit buckets expired, unlock sessions expired, analytics older than `RETENTION_ANALYTICS_DAYS` if >0)

## 4. Data model (Prisma)
Models/enums:
- UserRole: USER, ADMIN
- User: id, name, email, emailVerified, image, createdAt, updatedAt, role (input:false), banned, banReason, banExpires, relations (sessions/accounts/links/files/unlocks/profile)
- Session, Account, Verification (better-auth)
- LinkContentType: URL, TEXT, FILE
- LinkStatus: DRAFT, ACTIVE, DISABLED
- (the old `ActionType` enum was removed) — `LinkAction.type` is now a plain string referencing `ActionOption.key`, so administrators can manage the action catalog at runtime without a schema migration; the original 8 values (VISIT, YOUTUBE_SUBSCRIBE, YOUTUBE_VIDEO, YOUTUBE_LIKE, FOLLOW, DISCORD_JOIN, MUSIC, EMAIL) live on as built-in (system) ActionOption keys
- ActionVerification: AUTO_PROMPT, USER_CONFIRMED, EMAIL_SUBMITTED
- Link: id, ownerId (nullable — null for guest links), guestToken (nullable — signed-cookie token that owns a guest link), slug (unique), title, description, coverImage, status, contentType, targetUrl (db.Text), textContent (db.Text), fileId (nullable → `StoredFile`, SetNull), expiresAt, createdAt, updatedAt, owner (optional, cascade), file, actions, unlocks, events, emailLeads, abuseReports, userUnlocks; indexes (ownerId), (guestToken), (fileId). Creator UI offers **URL** (required http(s) destination) or **FILE** (a private uploaded file delivered after verification). `textContent`/`TEXT` is retained only so legacy TEXT links keep working; the form no longer exposes a `description` field (existing values are preserved on edit, not overwritten).
- LinkAction: id, linkId, type (string → `ActionOption.key`, onDelete Restrict), label, target (db.Text), verification, position, createdAt, updatedAt, link (cascade), completions; creator actions ordered
- UnlockStatus: PENDING, VERIFIED, EXPIRED
- UnlockSession: id (opaque token), linkId, status, ipHash, userAgent (Text), referrer (Text), expiresAt, createdAt, updatedAt, relations (cascade on link), completions, events
- UnlockActionCompletion: id, unlockSessionId, linkActionId, completedAt, composite unique (unlockSessionId,linkActionId), cascade
- AnalyticsEventType: VIEW, UNLOCK_START, ACTION_DONE, UNLOCK_COMPLETE
- AnalyticsEvent: id, linkId, unlockSessionId?, type, ipHash, userAgent (Text), referrer (Text), createdAt, relations (onDelete Cascade/SetNull); indexes on (linkId,type), (linkId,createdAt)
- EmailLead: id, linkId, email, consentAt, createdAt, link (cascade), unique (linkId,email), index (linkId)
- RateLimitBucket: key (id), count, windowStart, expiresAt; index (expiresAt) — fixed-window counters
- AbuseReason: SPAM, MALWARE, ILLEGAL, COPYRIGHT, IMPERSONATION, OTHER
- AbuseReportStatus: OPEN, RESOLVED, DISMISSED
- AbuseReport: id, linkId, slug, reason, details (Text), reporterEmail?, status, resolutionNote (Text), reporterIpHash, resolvedAt, resolvedBy, createdAt, link (cascade), indexes (status,createdAt), (linkId)
- Setting: key (id), value (Text), updatedAt, updatedBy? — DB-backed admin settings (site content, limits, rules)
- AuditLog: id, actorId, actorName?, actorEmail?, action, targetType?, targetId?, details (Text)?, ipHash?, createdAt; indexes (action,createdAt), (targetType,targetId) — records admin actions
- ActionTypeConfig (superseded — dropped by `20261014220000_action_options`) → replaced by the catalog models below
- Platform: id, key (unique), label, icon, enabled, position, system (built-in rows cannot be deleted), createdAt, updatedAt, actionOptions — admin-managed social platform
- ActionOption: key (id), label, platformId?, platform (SetNull), icon, behavior (URL | EMAIL), enabled, position, system, updatedBy?, updatedAt, actions (LinkAction) — admin-managed action type; creators only see enabled options of enabled platforms
- ActionBehavior: URL, EMAIL
- MediaAsset: id, ownerId, filename, mimeType, size, createdAt, owner (cascade); index (ownerId) — metadata for owner-uploaded cover images (bytes on disk)
- StoredFile: id, ownerId, filename, mimeType, size, createdAt, owner (cascade), links (Link[]); index (ownerId) — metadata for owner-uploaded locked files (bytes on disk under `files/`)
- UserUnlock: id, userId, linkId, unlockedAt, user (cascade), link (cascade), unique (userId,linkId), index (userId,unlockedAt) — durable "My unlocks" history for signed-in visitors
- Profile: id, userId (unique), handle (unique), displayName?, bio? (Text), avatarUrl? (Text), published (default false), createdAt, updatedAt, user (cascade), links (BioLink[]); index (handle) — public link-in-bio profile
- BioLink: id, profileId, label, url (Text), position, createdAt, profile (cascade); index (profileId,position)

Migrations:
- `20261014145101_init`: initial schema (auth, links, actions, unlocks, analytics, leads, rate limit)
- `20261014172900_abuse_reports`: adds AbuseReason/AbuseReportStatus + AbuseReport table and link relation
- `20261014180726_admin_settings_audit`: adds Setting + AuditLog tables
- `20261014182722_action_type_config`: adds ActionTypeConfig table (superseded by `20261014220000_action_options`, which drops it)
- `20261014184553_media_assets`: adds MediaAsset table + User relation
- `20261014220000_action_options`: converts `LinkAction.type` from enum to string, adds the ActionOption catalog (seeded with the built-in action types, preserving any prior ActionTypeConfig edits), drops ActionTypeConfig
- `20261015000000_platform_relations`: adds the Platform table (seeded with built-in platforms) and links ActionOption → Platform via `platformId`
- `20261015120000_guest_links`: makes `Link.ownerId` nullable, adds `Link.guestToken` and its index (guest one-free-link creation)
- `20261016004707_feature_pack_files_bio_unlocks`: adds `LinkContentType.FILE` and the first cut of the file model (`LinkFile`, later superseded), `UserUnlock`, `Profile`, `BioLink`
- `20261016004800_stored_files`: replaces `LinkFile` with the shared `StoredFile` table, adds `Link.fileId` (+ index, SetNull FK) so files are reusable across links and manageable from the dashboard
- `20261016120000_remove_ogads`: drops the legacy unlock-verification tables and columns, collapses `UnlockStatus` to PENDING/VERIFIED/EXPIRED and removes the corresponding analytics event types

## 5. Business rules & invariants
- Unlock requirements: a link requires exactly the creator-configured actions (zero or more); no system-managed step exists. Links with no actions start their session `VERIFIED` and unlock immediately.
- Visitor unlock order: creator actions in order. `canUnlock` requires all actions completed and the session `VERIFIED`; `claimContent` returns the payload only when VERIFIED.
- Protected content: URL links return the destination; FILE links return an `/api/unlock/[token]/download` URL. That route re-checks session expiry, `VERIFIED` status and full action completion, and streams bytes with `Content-Disposition: attachment` and `no-store`. Stored files are never served through the public `/api/files/[id]` route to non-owners (owner-only) — only the verified unlock token can fetch them.
- My unlocks: when a signed-in visitor claims content, a `UserUnlock` row is upserted so the link appears in Dashboard → My unlocks. Anonymous unlocks are not recorded against a user.
- Bio page: `Profile.handle` is unique and validated; `published=false` profiles 404 publicly. A published page lists the owner's bio links plus their `ACTIVE` unlock links.
- Ownership: creators can only manage their own links; admin-only routes/actions; banning deletes sessions and blocks sign-in (better-auth admin plugin enforces the `banned` flag on every session creation, including direct API calls). `ownerId` is null for guest links, so guest links never match an account's dashboard `ownerId` filter and cannot be edited/deleted until claimed.
- Guest limit: a browser may create exactly one link without an account. Identity is a HMAC-signed `lu_guest` cookie holding a random token that is stored on the link as `guestToken`; the server counts that token's unowned links. Clearing cookies resets the limit (accepted trade-off); a per-IP hourly cap (default 5, `limits.guestLinkCreatePerHour`) limits mass creation. Sign-in/sign-up calls `claimGuestLinks` so the link moves to the account and future links are unlimited.
- Preview: owner-only for DRAFT via `?preview=1`; preview sessions write no analytics; preview disabled for DISABLED links.
- Email consent: EMAIL action requires valid email + explicit consent; EmailLead deduped by (linkId,email).
- Retention: cleanup job prunes expired sessions/buckets and old analytics per env; events survive session deletion so per-link stats remain meaningful.
- Rate limits: sign-up (10/300s), sign-in (15/300s), password reset (5/600s), unlock start (30/60s per hashed IP), link create (20/3600s per user), abuse report (5/3600s per hashed IP), uploads (30/3600s per user).

## 6. Workflows
### Guest creator (no account)
1. From the homepage CTA or `/create`, a visitor builds a link with the same form as creators (required destination URL, actions, optional expiry/slug, cover by URL only — file uploads require an account). The form shows a live unlock-page preview beside it.
2. On submit, `createGuestLink` runs the shared validation/persistence, stores the link with `ownerId = null` and a `guestToken`, publishes it `ACTIVE` immediately, and sets the signed cookie. A success panel shows the public URL with a copy button.
3. The success panel and any second attempt prompt the visitor to create a free account or sign in. On sign-up/sign-in, `claimGuestLinks` transfers the link to the account so it appears in the dashboard ready to edit.

### Creator
1. Sign up/sign in (better-auth). Must authenticate for dashboard.
2. Create link (dashboard/links/new): fill details, choose protected content — a required http(s) **destination URL** or an uploaded **file** — add up to 10 actions (or none), optional expiry, custom slug optional, with a live unlock-page preview. Client validates, server creates the link in a transaction, redirects to the edit page.
3. Edit (dashboard/links/[id]): change metadata/actions/content/expiry, per-link stats, Preview button, email leads list (50) + CSV export.
4. Publish: activate link (ACTIVE). DISABLED → can re-enable at any time.
5. Share: copy public URL `/link/<slug>`.

### Visitor
1. Visit `/link/<slug>`: metadata generated from link. DISABLED → notice+report link. DRAFT → notice for non-owner; owner with `?preview=1` can preview. EXPIRED → notice.
2. Start unlock: clicks Start → `startUnlock` creates a session, logs VIEW/UNLOCK_START (non-preview). State machine: shows steps, progress.
3. Complete creator actions: VISIT/etc open target (noopener); EMAIL requires email+consent → stored in EmailLead, marks action done.
4. Once every action is complete the session becomes VERIFIED; links with no actions are VERIFIED from the start.
5. Unlock: "Unlock content" → `claimContent` (verified-only) returns content; for URL shows "Open your content" button, for a FILE presents a download from the token-gated route, for legacy TEXT shows text. Signed-in visitors also get a "My unlocks" entry.

### Abuse reports (visitor)
- From unlock page or notice, clicks "Report this link" → `/report?link=<slug>`. Select reason, details (min 10), optional email. Submits → stored with hashed IP; success message. Admin triages.

### Admin
- Shell: dark sidebar with grouped nav (Overview/Moderation/Content/System), open-reports badge, active state, off-canvas mobile menu; sticky topbar with breadcrumb, "View site" and an account menu (creator dashboard, public site, sign out). Content area uses the `.admin-theme` slate+indigo tokens, distinct from the public site.
- Overview: 6 stat cards (users, links +active, views, unlock starts, completed unlocks + conversion %, open reports), 14-day views/unlocks bar chart, open reports, newest users, top links by views.
- Users: search by name/email + status tabs (all/admins/banned); ban/unban (single row action or bulk, cannot ban self), promote/demote role (cannot change own), CSV export honoring current filters.
- Links: search by title/slug/owner email + status tabs (all/active/draft/disabled); enable/disable (single or bulk), CSV export honoring current filters; per-link detail with creator actions, recent unlock sessions, abuse reports, and protected content.
- Reports: open/resolved/dismissed tabs; each open item shows reason/slug/details/timestamp/reporter email → Resolve, Resolve & disable link, Dismiss. Closed reports listed with outcome/note. Resolutions require admin session and cannot be re-done.
- Platforms & action types: master/detail list of platforms with their actions; enable/disable a platform, enable/disable individual actions (disabled when the platform is off), and edit the display label of any action type (affects the creator link editor). Admins can create custom platforms and add actions to any platform; custom (non-`system`) platforms/actions can be deleted, while built-in ones are protected. Deletion is refused while a platform's or action's rows are still referenced by a link.
- Site content: edit FAQ/privacy/terms/contact bodies (stored as `content.*` settings). The editor has a formatting toolbar (heading, subheading, list, bold, link), a write/preview toggle that renders with the same `Markdown` component the public pages use, a character counter against `CONTENT_VALUE_MAX_LENGTH` (5000; other settings stay capped at 2000), an unsaved-change indicator, and reset-to-default. Saving revalidates the whole tree so edits appear on the public pages immediately.
- Settings: four groups under `settings/[group]` — site-content (site name/tagline), rate-limits, upload-limits (image + locked-file max sizes), platform-rules (allowed social platforms, content policy). Secrets are never editable here.
- Media: list owner-uploaded cover images with storage totals, delete one (also clears it from links using it).
- Locked files: list owner-uploaded protected files (`StoredFile`) with storage totals and the links that deliver each file, delete one (also disables those links).
- Audit: recent administrative actions with a text filter.
- Every mutating admin action requires an ADMIN session server-side and writes an `AuditLog` entry.

## 7. Environment & config
`.env` (example values; real secrets ignored). See `.env.example`.
- `DATABASE_URL` (MySQL)
- `NEXT_PUBLIC_APP_URL` (public origin for links)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_TOKEN`, `EMAIL_FROM`
- `RETENTION_ANALYTICS_DAYS` (default 0)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (seed)

`.gitignore` includes `.env*` but allows `.env.example`.

## 8. Scripts & ops
- `npm run dev` (Next dev, Turbopack)
- `npm run build`, `npm start`
- `npm run lint`, `npm run typecheck` (gates)
- `npm run db:generate`, `npm run db:migrate`, `npm run db:deploy`, `npm run db:studio`, `npm run db:seed`, `npm run db:cleanup`

Ops notes:
- MySQL 8.4 (local Laragon) in dev; VPS equivalent. No Redis (rate limit in MySQL).
- `npm run db:cleanup` should run as daily cron/systemd timer (prunes expired buckets/sessions and old analytics).
- Password recovery: webhook-based (no SMTP in app). Configure `EMAIL_WEBHOOK_URL` in prod or reset links go to logs (dev only path when webhook absent).
- Security headers: X-Content-Type-Options, X-Frame-Options (DENY), Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy; HSTS only in production.

## 9. Verification
- Typecheck/lint/build: clean.
- End-to-end smoke tests (temporary dev harness) confirmed: publish; actions complete; claim refused before completion; claim succeeds after completion; links with no actions unlock immediately; second incomplete session cannot claim. Harness/test data removed.
- Manual checks: `/admin/*` protected; preview owner-only; lead CSV ownership/401/404; abuse report flows (validation, unknown link, resolve+disable, double-resolve rejected); admin search for users/links; expiry notice on public page; security headers present; dashboard completion counts from analytics.

## 10. Known limitations / next possible steps (optional)
- Protected content is a destination URL or an uploaded private file. The creator form takes a title plus either a required http(s) destination or a file; the unlock page delivers it after all configured actions are completed. `contentType`/`textContent` remain in the schema for legacy TEXT links; the form no longer offers a description field. Admins can browse and delete owners' locked files from `/admin/files`.
- Password reset delivery requires webhook in production (logs a warning if missing) — operational setup.
- Audit log covers all mutating admin actions (user ban/unban + bulk, role changes, link status + bulk, platform/action enablement, action label edits, media delete, report resolution, setting updates); `AuditLog.details` stores minimal context only, never secret values.
- The action catalog supports runtime rows (string keys, `system` flag), but the admin UI currently only enables/disables and renames — there is no screen to add or delete platforms/action options yet (rows are seeded by `prisma/seed.ts`).
- The `rules.socialPlatforms` (allowed social platforms) and `rules.contentPolicy` settings are editable and stored, and surfaced via `getSiteSettings()` as `allowedPlatforms`/`contentPolicy`, but nothing enforces them yet — they are configuration placeholders.
- Guest one-free-link limiting is cookie-based (`lu_guest` signed token), so it can be bypassed by clearing cookies; the per-IP hourly cap is the anti-abuse backstop. Guest links cannot be edited/deleted until claimed into an account, and a guest link whose cookie is lost becomes orphaned (still live, admin-visible as owner "Guest", no self-service recovery).

## 11. Files of note
- `docs/technical-decisions.md` — design decisions and deployment checklist
- `prisma/schema.prisma` — canonical data model
- `src/lib/actions/unlock.ts` — core unlock state machine
- `src/proxy.ts` — Next 16 protected routes
- `src/lib/file-storage.ts`, `src/app/api/unlock/[token]/download/route.ts` — private locked-file delivery
- `src/lib/actions/profile.ts`, `src/app/bio/[handle]/page.tsx` — link-in-bio
- `scripts/cleanup.ts` — retention
- `src/lib/mailer.ts` — webhook email

This is the complete, implemented state of the Social Link Unlocker per the agreed core scope.
