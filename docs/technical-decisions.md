# Technical decisions

Recorded before/while implementing the Social Link Unlocker, as required by the PRD
("The final database, authentication library, and process/deployment details should be
recorded in the repository's technical decisions before implementation").

## Application

| Decision | Choice | Reason |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | One deployable app: server-rendered public unlock pages + authenticated dashboard. No separate frontend/backend. |
| Language | TypeScript, strict | Prisma/better-auth/zod are all TS-first. |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix, "nova" preset) | Accessible primitives without owning a component library. |
| Validation | zod v4 | Single schema shared by client forms and server actions. |
| Mutations | Server Actions (`'use server'`) | Unlock and dashboard mutations are server-verified; the client never decides completion. |
| Auth gate | `src/proxy.ts` | Next 16 replaced `middleware.ts` with `proxy.ts`. It performs an optimistic cookie-only redirect for `/dashboard` and `/admin` only; every action re-checks the session server-side. |

Business logic lives in `src/lib` (`unlock.ts`, `rate-limit.ts`, `slug.ts`,
`validation.ts`) with server actions in `src/lib/actions/*`.

Owner tooling worth noting:

- Unpublished links can be walked through by their owner via `/link/<slug>?preview=1`. The
  preview is authorized server-side against the link owner, is refused for disabled links
  and does not write analytics events, so it cannot inflate statistics.
- Email addresses collected through a link are listed on that link's dashboard page and
  exportable as CSV from `/dashboard/links/<id>/leads`, which re-checks ownership and
  returns `404` for anyone else.

## Short links

- A separate `ShortLink` model and `/s/<code>` route; nothing in the unlock flow reads or
  depends on it.
- Redirects are `302` with `Cache-Control: no-store`, so disabling or deleting a link takes
  effect immediately. The click counter increments before the redirect is returned.
- Targets must be absolute http(s) URLs. A link may not point at another `/s/` address on
  the same host, which prevents redirect loops.
- Owner-only via the dashboard (no guest short links), rate limited through
  `limits.shortLinkCreatePerHour`. Admins moderate all short links at `/admin/short-links`
  (enable/disable/delete, audited) and see totals plus the most-clicked links on the
  admin overview.

## Abuse reporting

- Any visitor can report a link from the unlock page (or a disabled/expired notice) at
  `/report?link=<slug>`. Submissions are validated with zod, rate limited per source
  address (5/hour) and store only a hashed reporter IP.
- Moderators triage reports at `/admin/reports`. Resolving can optionally disable the link
  in the same transaction, so an abusive link is taken down before the queue is re-read.
  Reports cannot be re-closed, and a reporter's email (when provided) is never exposed to
  the link owner.
- A report never bypasses the unlock flow; disabling a link simply stops it from being
  served.

## Locked files (protected content)

- A link's protected content can be a destination URL (the original) or an uploaded private
  file (`LinkContentType.FILE` + `Link.fileId` → `StoredFile`, `src/lib/file-storage.ts`).
  Files live on disk under `MEDIA_STORAGE_DIR/files` and are never referenced by public,
  guessable paths.
- Delivery is two-tier: the creator's own copy lives at `/api/files/[id]`, which is
  authenticated and ownership-checked; a visitor's copy is released only through
  `/api/unlock/[token]/download`, which requires a non-expired `VERIFIED` session with every
  action completed. The stream is served with `Content-Disposition: attachment` and
  `no-store`. Deleting a file disables any links that referenced it. Uploads are
  MIME-allowlisted and size-capped by `limits.fileMaxMb`.

## Link-in-bio

- `Profile` + `BioLink` model a public page at `/bio/<handle>`, edited in the dashboard and
  gated by a `published` flag. Handles reuse the slug reserved-word check and are unique.
  The page also surfaces the owner's active unlock links. No separate service or table for
  unlock-link ordering is involved — the bio page derives them.

## Retention and cleanup

`npm run db:cleanup` (schedule it daily on the VPS) deletes:

- rate-limit buckets whose window has expired,
- unlock sessions past their TTL (analytics events survive via `onDelete: SetNull`, which is
  why per-link statistics are counted from events rather than from sessions),
- analytics events older than `RETENTION_ANALYTICS_DAYS` when that is set above 0.

Collected emails are kept until the owner or an administrator deletes the link, which
cascades.

## Transactional email

Password reset (and any future transactional message) is sent by `sendMail` in
`src/lib/mailer.ts`, which POSTs `{ to, subject, text, type, url, from }` to
`EMAIL_WEBHOOK_URL` with an optional `Authorization: Bearer EMAIL_WEBHOOK_TOKEN`. The
endpoint can be a transactional provider, a self-hosted relay or an automation. With no
webhook configured, reset links are written to the server log in development and a warning
is logged in production, so the request never fails for the visitor.

## Database

- **MySQL 8.4** (Laragon in development) with **Prisma 7** and the
  `@prisma/adapter-mariadb` driver adapter. MySQL was chosen because it is the
  environment available on the target VPS (LAMP-style stack) and it is a prerequisite for
  `rate-limit.ts`'s atomic fixed-window counters.
- Datasource URL lives in `prisma.config.ts` (Prisma 7 no longer reads `datasource url`
  from `schema.prisma`), and the generated client is emitted to `src/generated/prisma`
  with the `prisma-client` generator.
- Rate limiting uses a `RateLimitBucket` table rather than an external store, so the app
  has no Redis dependency. Fixed windows with `limit + windowSeconds` per key. Keys cover
  authentication, password reset, link creation and unlock starts.
- Visitor IPs are stored only as salted SHA-256 hashes (`hashVisitorIp`).
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`, plus HSTS in production) are set for
  every route in `next.config.ts`.

Key invariants enforced in the schema and in code:

- A link's requirements are exactly its creator-configured actions. Links with zero actions
  start their unlock session already `VERIFIED`, so their content is available immediately.
- Each action completion is stored once per session (`UnlockActionCompletion` unique on
  `unlockSessionId + linkActionId`), and the session flips to `VERIFIED` once every
  configured action has a completion row.
- `claimContent` returns the protected payload only for a non-expired `VERIFIED` session,
  and the download route re-checks the same conditions before streaming a file.
- Analytics events are written for views, unlock starts, each completed action and the final
  unlock, so per-link statistics survive session cleanup.

## Authentication

**better-auth** with its Prisma adapter, email + password only.

- Email verification is not required to use the product (it only gate-keeps nothing
  today), and password reset links are printed to the server log in development instead of
  requiring an email provider before launch. Production should configure a real
  `sendResetPassword` transport.
- Authentication: password reset emails are delivered by POSTing a JSON payload to
  `EMAIL_WEBHOOK_URL` (see *Transactional email*), which avoids depending on one specific
  provider inside the app.
- `role` is an additional field with `input: false` so a client can never self-promote;
  admin bootstrap happens through `npm run db:seed` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- Banning a user sets `banned` and deletes their sessions, which signs them out immediately.
- Rate limits are applied to sign-in, sign-up, password-reset requests and unlock starts.

## Unlock flow

The platform is free and has no monetization step. A link requires exactly the actions its
creator configured; links with no actions unlock immediately.

1. `startUnlock` creates a `PENDING` session (or `VERIFIED` when the link has no actions)
   and records `VIEW` / `UNLOCK_START`. Previews are owner-only and write no analytics.
2. `markActionComplete` validates that the action belongs to the link, records the
   completion once and flips the session to `VERIFIED` when every action is done.
3. `claimContent` releases the protected URL, text or file link only for a non-expired
   `VERIFIED` session, and records `UNLOCK_COMPLETE`.
4. Sessions expire with their TTL; the cleanup job removes them afterwards.

## Deployment (VPS, not Vercel-only)

Target: a single Linux VPS with a LEMP/LAMP-style stack (nginx + MySQL 8) — the same shape
as the Laragon development environment.

1. Node.js 22 LTS, MySQL 8.4, and a reverse proxy in front of `next start`.
2. Create the database and a dedicated MySQL user; set `DATABASE_URL`,
   `BETTER_AUTH_URL` (public HTTPS origin), `NEXT_PUBLIC_APP_URL` (same origin),
   `BETTER_AUTH_SECRET` and the optional `EMAIL_*` values in the server environment
   (not in the repository).
3. `npm ci && npx prisma migrate deploy && npm run build && npm run start`.
4. Run the app behind a process manager (systemd unit running `npm run start`, or pm2) and
   proxy `/` to it with nginx, terminating TLS at the proxy. `BETTER_AUTH_URL` must be the
   public HTTPS origin because session cookies are issued against it.
5. Back up the MySQL database on a schedule; analytics and collected emails live only there.
6. Schedule `npm run db:cleanup` daily (systemd timer or cron) so expiry and retention rules
   are applied.
7. Bootstrap the first administrator with `npm run db:seed` and `ADMIN_EMAIL` /
   `ADMIN_PASSWORD`, then change that password from the app.

## Testing

- `npm run typecheck`, `npm run lint`, `npm run build` are the required gates.
- The full flow was verified end to end against a running server: link creation, publish,
  unlock start, action completion, refusal of `claimContent` before completion, content
  release after completion, and immediate unlocking of links with no actions.
- Also verified: owner-only draft preview, ownership-checked lead export, abuse report
  submission (including rejection of unknown links and too-short details), and resolving a
  report with link disablement (and refusal of a second resolve).
