# Social Link Unlocker

A free, self-hosted social link-unlocking platform. Creators publish links that
reveal their protected content — a destination URL or a downloadable file — only
after visitors complete the creator-configured social actions (follow, join,
visit, email submit, and more). No paid plans, no subscriptions.

## Features

- **Unlock links** — create, preview, edit, activate/disable, delete, share;
  custom slugs, expiry, cover images; per-link statistics.
- **Server-side verification** — content is released only after every
  configured action is completed and verified server-side; links with no
  actions unlock immediately.
- **Guest creation** — visitors can create one free link without an account;
  it transfers automatically when they later sign up or sign in.
- **Link-in-bio pages** — public `/bio/<handle>` profiles with bio links and
  active unlock links.
- **Locked files** — private uploads delivered through a token-gated download
  route that re-checks session verification.
- **Email lists** — email-capture action with consent, per-link and aggregated
  views, CSV export.
- **Insights** — creator analytics (totals, 14-day chart, conversion),
  derived milestones, "My unlocks" history.
- **Admin panel** — users, links, reports, platform/action catalog, site
  content, settings, media, files, audit log; every mutating action is guarded
  and audited.
- **i18n** — English, Spanish, Portuguese (Brazil), Arabic (RTL), cookie-based
  locale switching.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui · Prisma 7 + MySQL 8 · better-auth · next-intl · zod

## Getting started

Prerequisites: Node.js 22 LTS, MySQL 8.x reachable locally.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Configure environment — copy `.env.example` to `.env` and fill in
   `DATABASE_URL`, `BETTER_AUTH_SECRET` (and optionally the email webhook):

   ```bash
   cp .env.example .env
   ```

3. Apply the database schema and seed the built-in platform/action catalog
   plus the first admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD`):

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

Open http://localhost:3000. Sign in as the seeded admin and visit `/admin`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | Quality gates (required before merge) |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply migrations (CI/VPS) |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Seed catalog + bootstrap admin |
| `npm run db:studio` | Prisma Studio |
| `npm run db:cleanup` | Retention job (run daily in production) |

## Deployment (VPS)

The app targets a standard Linux VPS with nginx, MySQL 8, and Node.js 22 —
not a specific PaaS. Summary:

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start          # behind systemd/pm2, proxied by nginx with TLS
```

Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public HTTPS origin,
schedule `npm run db:cleanup` daily, back up the MySQL database, and bootstrap
the first admin with `npm run db:seed`. Full checklist:
[`docs/technical-decisions.md`](docs/technical-decisions.md).

## Documentation

- [`social-link-unlocker-prd.md`](social-link-unlocker-prd.md) — product requirements
- [`project-workflow.md`](project-workflow.md) — implemented architecture and flows
- [`docs/feature-status.md`](docs/feature-status.md) — feature matrix and known limitations
- [`docs/technical-decisions.md`](docs/technical-decisions.md) — design decisions, deployment, testing
- [`docs/design-spec.md`](docs/design-spec.md) — UI/UX design specification
