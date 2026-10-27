<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design Specification

All UI/UX work must follow `docs/design-spec.md` — the Pulse AI Agent Management Platform design specification. Read it before implementing any page, component, or styling change. It is the source of truth for colors, typography, layout, themes, and components. Key rules: neon-lime accent (`#D5FF2F`), near-black/charcoal dark surfaces, permanent dark admin sidebar regardless of theme, compact data-dense dashboards, and a consistent design system across admin and public pages.
## Internationalization (i18n)
- Supported locales: `en` (default), `es`, `pt-br`, `ar` (Arabic with RTL).
- Uses `next-intl` with **cookie-based** locale selection (no URL locale prefix). Locale is stored in `NEXT_LOCALE` cookie; `Accept-Language` is negotiated in `src/proxy.ts` and `src/i18n/request.ts`. RTL is applied for Arabic via `dir="rtl"` on `<html>`.
- Messages live in `messages/{locale}.json`. Add new keys there and use `useTranslations()`/`getTranslations()`.
- Locale switcher (`src/components/language-switcher.tsx`) sets the cookie and refreshes the page.
