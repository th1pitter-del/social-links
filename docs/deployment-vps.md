# VPS Deployment Handover — social-links

Handover report for DevOps. Goal: deploy the Next.js app to the VPS (Ubuntu 24.04 + CloudPanel) while **keeping Vercel and GitHub deployments fully intact** (no repo/config changes required).

---

## 1. Project Overview

| Item | Value |
|---|---|
| App | `social-links` — Social Link Unlocker (bio link pages + unlock actions) |
| Framework | Next.js **16.4.3** (App Router, standalone-capable server build) |
| Runtime | Node.js **20+** required (Node 22 recommended) |
| Language | TypeScript 5, React 19.3 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/turbopack` loader) |
| Auth | better-auth 1.7 |
| ORM | Prisma **7.10** with `@prisma/adapter-mariadb` |
| i18n | next-intl 4 (cookie-based, `en`/`es`/`pt-br`/`ar` + RTL) |
| Package manager | npm (no lockfile preference; `package-lock.json` if committed) |

## 2. Repository / Sources

- GitHub repo already connected to Vercel (working). VPS deployment should use the **same repo** via `git clone` — nothing changes for Vercel.
- Build outputs: standard Next.js (`next build` → `.next/`). `output: "standalone"` is **NOT enabled** in `next.config.ts` — either run `npm start` (uses full `node_modules`) or enable standalone output in a deploy branch.
- `.gitignore` excludes `.env*` (except `.env.example`), `.uploads/`, `.next/`, `.vercel/`. These must be created on the server.

## 3. Environment Variables (required on VPS)

Copy `.env.example` → `/home/<site-user>/social-links/.env` and fill:

```ini
# Database (MariaDB/MySQL on the VPS)
DATABASE_URL="mysql://social_links:<PASSWORD>@127.0.0.1:3306/social_links"

# Auth
BETTER_AUTH_SECRET="<openssl rand -hex 32>"
BETTER_AUTH_URL="https://<vps-domain>"
NEXT_PUBLIC_APP_URL="https://<vps-domain>"   # baked into client bundle at build time!

# Optional runtime fallbacks (admin panel settings take precedence once set)
EMAIL_WEBHOOK_URL=""
EMAIL_WEBHOOK_TOKEN=""
EMAIL_FROM="Link Unlocker <no-reply@<domain>>"
RETENTION_ANALYTICS_DAYS="0"

# Uploads dir (relative to project root, must be writable)
MEDIA_STORAGE_DIR=".uploads"

# Admin bootstrap (used by db:seed only)
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_NAME="Administrator"
```

> **Important:** `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` are read at build/start time — set them **before** `next build`, and they must match the public domain served by nginx.

## 4. Database

- Prisma provider: `mysql` (works with MariaDB via `@prisma/adapter-mariadb`). MariaDB 10.6+ / MySQL 8.x.
- Create DB + user on the VPS:

```sql
CREATE DATABASE social_links CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'social_links'@'127.0.0.1' IDENTIFIED BY '<PASSWORD>';
GRANT ALL PRIVILEGES ON social_links.* TO 'social_links'@'127.0.0.1';
FLUSH PRIVILEGES;
```

- Migrations: `npm run db:deploy` (runs `prisma migrate deploy`, reads `DATABASE_URL` from `.env` via `prisma.config.ts`).
- Seed (first admin): `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed`.
- Generated client output is `src/generated/prisma` (committed behavior driven by `prisma generate` — run after install).

## 5. Build & Run Commands

```bash
npm ci                 # install
npx prisma generate    # (usually runs via postinstall; safe to run explicitly)
npm run build          # next build
npm run start          # next start  (default port 3000; use PORT= to change)
```

Health check: `GET /api/health` returns `{ "ok": true, "db": "up", ... }` (503 when the database is unreachable). Any public route returning 200 also works. Redirect `/u/:slug*` → `/link/:slug*` is permanent (301) at the app level — keep it in mind if a reverse proxy also rewrites.

## 6. VPS Target Environment

| Item | Value |
|---|---|
| Host | `srv1013181.hstgr.cloud` |
| IPv4 | `195.35.37.191` |
| OS | Ubuntu 24.04 with **CloudPanel** |
| Access | `ssh root@195.35.37.191` (key auth to be installed; root password available from owner) |
| DB | MariaDB (CloudPanel-managed, local) |
| Reverse proxy | nginx via CloudPanel (create a **Node.js site**, set app port) |

### Recommended CloudPanel setup

1. CloudPanel → Sites → **Create Node.js site** (site user e.g. `sociallinks`), domain pointed via DNS A record → `195.35.37.191`.
2. As site user: `git clone <repo-url> ~/social-links && cd social-links`.
3. Install Node 20/22 (CloudPanel can switch per-site Node version).
4. Create `.env` (section 3), create DB + user (section 4).
5. `npm ci && npm run build && PORT=3000 npm start` — CloudPanel's Node site template provides a systemd service wrapper; alternatively use **pm2**: `pm2 start npm --name social-links -- start && pm2 save`.
6. Issue Let's Encrypt cert via CloudPanel (Site → SSL/TLS). App already sets HSTS in production.
7. `client_max_body_size` in nginx: raise to ≥ 16m (cover image uploads, admin limit `limits.uploadMaxMb` default).

### Security headers / proxy notes

- App sends `X-Frame-Options: DENY`, HSTS (prod), etc. — no need to duplicate in nginx.
- WebSockets not required. Proxy standard: `proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; X-Forwarded-Proto $scheme; X-Forwarded-For $proxy_add_x_forwarded_for;`.

## 7. Persistent Data

| Path | Purpose |
|---|---|
| `.uploads/` | Uploaded media (gitignored). **Include in backups** (weekly schedule already exists on the VPS). |
| MariaDB `social_links` | All content/users/settings. Include in backups. |

## 8. Updating

```bash
cd ~/social-links
git pull
npm ci
npm run db:deploy   # apply new migrations
npm run build
pm2 restart social-links   # or systemctl restart <cloudpanel-node-service>
```

## 9. Coexistence with Vercel / GitHub

- No code or config change is required for Vercel; it keeps building from GitHub as-is.
- Differences are purely environmental: Vercel uses its own managed DB/env; VPS uses local MariaDB + `.env` file.
- `NEXT_PUBLIC_APP_URL` differs per environment — it is not committed, so both builds stay correct.
- Optional hardening later: enable `output: "standalone"` for a slimmer VPS image (does not affect Vercel).

## 10. Admin Backups & GitHub Updates

The admin console has **System → Backups** and **System → System updates**. Both run through a detached runner (`scripts/system-ops.mjs`), so a restart or a closed browser tab does not interrupt an operation.

Requirements on the host:

| Requirement | Why |
|---|---|
| `mysqldump`, `mysql`, `tar`, `git`, `npm` on `PATH` | Database dumps, archives, and update installs |
| Writable `BACKUP_DIR` (default `.backups`, relative to the project root) | Archives and job status files. It must stay outside `public/` and `.next/` |
| Git checkout with an `origin` remote | Update check/install; a tarball deployment shows updates as unavailable |
| Process manager running the app | Configure under **Settings → System operations** (`pm2` + process name, or `systemctl` + unit name). With `none`, the update builds but you restart the service yourself |

Behaviour worth knowing before enabling it:

- A **FULL** safety backup is taken automatically before every restore, update, and rollback. Database restore never touches migration history; files restore swaps `.uploads` and keeps the previous directory as `.uploads.pre-restore-<stamp>`.
- Updates refuse to start on a dirty working tree. The runner checks out the target commit detached, runs `npm ci`, `db:generate`, `db:deploy`, `build`, restarts the configured process, then polls `/api/health`. A failed build or health check rolls the **code** back to the previous commit automatically — the database is never restored automatically.
- `npm ci` rewrites `node_modules` in place, so the app directory must be the one the process manager serves.
- On Vercel (or with `SYSTEM_OPS_DISABLED=true`) the pages explain that the host manages backups instead of offering the actions. TiDB databases are refused: use the provider's backup tooling.
- Archives are pruned to **Settings → System operations → backup retention** (default 10).

