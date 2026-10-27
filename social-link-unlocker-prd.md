# Social Link Unlocker Platform — Product Requirements Document (PRD)

**Document status:** Draft for scope confirmation and engineering estimation  
**Product type:** Free social link-unlocking platform  
**Reference:** [Rekonise](https://rekonise.com) — inspiration only; do not copy its branding or interface.

## 1. Project Overview

Build a modern, responsive social link-unlocking platform with its own visual identity. Creators can publish links that require visitors to complete configured social actions before accessing protected content.

**Unlock requirement:** A link requires exactly the social actions its creator configures, and the content is revealed only after the visitor completes every one of them. There is no additional system-managed verification step.

All platform features are free for registered users. There are no paid plans, premium subscriptions, or user subscription payments.

## 2. Product Goals

- Let users create and share social unlock links easily.
- Give visitors a clear, mobile-friendly unlocking experience.
- Let creators define exactly the social actions their link requires.
- Prevent access to protected content before all required conditions are satisfied.
- Provide link owners with private link management and performance statistics.
- Provide administrators with control over users, links, site settings, and moderation.
- Keep the product free to use.

## 3. User Roles and Interfaces

The application must separate these interfaces and permissions:

1. **Guest / Public Website:** Marketing pages, authentication pages, and public unlock pages.
2. **Link Owner Dashboard:** Authenticated users create and manage only their own links and related data.
3. **Admin Panel:** A protected administration area for platform-wide management. Admin privileges must be enforced server-side.

### 3.1 Guest / Public Website

- Responsive homepage explaining the platform and its workflow.
- Feature overview and supported social actions.
- FAQ, contact, privacy policy, and terms pages, as agreed for launch.
- Registration, login, logout, and password-recovery pages.
- Clear calls to action encouraging visitors to create their own links.
- A visitor may create **one free link without registering**; the link goes live immediately and is limited to a single link per browser. Further link creation requires a free account.
- When a guest later registers or signs in from the same browser, their guest link is automatically transferred to their account so they can manage it.
- Public unlock pages that do not require platform registration merely to visit, unless an external action itself requires an account on that service.
- Mobile-first layouts and accessible navigation.
- No premium plans or paid subscriptions.

### 3.2 Link Owner Dashboard

- Secure registration, login, logout, and password recovery.
- Overview dashboard with link totals, visits, unlocks, and conversion statistics.
- Create, preview, edit, activate/deactivate, and delete the user's own links.
- Configure supported social actions and protected content.
- Manage the protected destination URL that visitors unlock, subject to agreed rules.
- Customize unlock-page title, cover image, and available appearance options.
- View per-link performance statistics.
- View and export collected email addresses if email collection is enabled.
- Manage optional public profile/link-in-bio functionality only if confirmed in scope.
- Access all included features for free.
- Users must not access or modify another user's links, analytics, files, or collected data.
- The unlock requirements are exactly the creator-configured actions; there is no additional system-managed step for the owner to manage.

## 4. Link Creation and Protected Content

### 4.1 Supported content types

- A destination URL (http/https) that visitors are sent to after unlocking. **Required.**

### 4.2 Link configuration

- Link title and a required destination URL, plus an optional cover image.
- One or more creator-selected supported actions.
- Live preview of the unlock page while editing.
- Optional custom slug/short URL and expiration date, if included in the agreed release scope.
- Clear enabled/disabled status and link-management controls.

### 4.3 Unlock requirement rules

- A link requires exactly the actions its creator configures: one or more, or none.
- A link with no actions unlocks immediately.
- Server-side validation must enforce completion on every claim; the backend must not trust client-submitted completion flags.
- Creators may not bypass the requirement through the UI or direct API requests.

### 4.4 Required visitor unlocking flow

1. A visitor opens a creator's public unlock page.
2. The page displays the required creator-configured actions and progress.
3. The visitor completes those actions.
4. The backend records each completion and verifies that every action is done.
5. Only after all required actions are complete does the page reveal or activate the final **Unlock** button.
6. The visitor selects **Unlock** and receives the protected content through an authorized server-side flow.

The Unlock button must not be available before successful completion. Protected files and content must not be exposed through guessable direct URLs, public storage paths, or client-side state manipulation. Use expiring or signed access URLs when appropriate, and issue them only after authorization.

## 5. Supported Social Actions

The action system should be modular so new supported actions can be added without rewriting the core unlocking flow. Initial candidate actions include:

- **YouTube:** Subscribe to a YouTube channel.
- **YouTube:** Visit a specified YouTube video.
- **YouTube:** Like a specified YouTube video, subject to available verification capabilities and platform/API rules.
- Follow supported social media accounts.
- Join Discord servers or communities.
- Like or interact with supported content where permitted.
- Listen to music or access music-related content, if confirmed.
- Submit an email address as an optional unlock condition.

**Verification note:** Visiting a URL can often be prompted but may not be reliably verifiable. YouTube subscriptions and likes may require authorized APIs, permissions, or may not be available for reliable third-party verification. The interface must not falsely claim an action is verified when it is only user-reported. Before implementation, classify each action as automatically verifiable, manually/user-confirmed, or unsupported, and document limitations. Follow each platform's terms and API policies.

## 6. Unlock Verification and Delivery

Completion is tracked per visitor session and enforced entirely server-side.

Requirements:

- Record each action completion against the visitor's unlock session, not in client state.
- Flip the session to `VERIFIED` only when every configured action has a completion record.
- Treat links with no actions as immediately verified.
- Never expose protected content before the session is verified and unexpired.
- Handle expired, repeated, or out-of-order requests safely and idempotently.
- Log relevant errors without exposing sensitive user data.
- Never rely on client-side flags to authorize unlocking.

## 7. Unlock Page Design and Promotion

- Distinctive visual identity; Rekonise is a reference for the concept only.
- Clear title, creator information where applicable, action list, progress indicators, completion states, and final unlock action.
- Mobile-first, responsive layout.
- Optional cover image, background customization, audio playback, and content preview only if included in scope.
- Consistent loading, success, failure, retry, and expired-link states.
- A promotional section on every public unlock page, for example:

  > **Want a link like this?**  
  > Create your own social unlock link in seconds.  
  > **Create Your Link**

- The promotional button directs visitors to registration or the appropriate onboarding page.

## 8. Analytics and Statistics

Provide metrics where technically and legally measurable:

- Total link views and estimated unique visits.
- Successful unlock count and conversion rate.
- Per-link performance over time.
- Creator dashboard summary.
- Platform-wide statistics for administrators.
- Avoid collecting unnecessary personal data; define retention and privacy rules.

Do not present estimated or unavailable metrics as exact verified values.

## 9. Email Collection

If enabled in the confirmed scope:

- Allow email submission as an optional creator-configured action.
- Store collected addresses securely and associate them with the relevant link/owner.
- Let authorized owners view and export only the email addresses collected through their own links.
- Provide clear consent language and privacy controls.
- Define deletion, retention, and export behavior.
- Prevent one owner from accessing another owner's collected data.

## 10. Admin Panel

Provide a separate, protected admin area with server-enforced role-based access control.

- Admin authentication and role/permission checks.
- Search, view, manage, and suspend user accounts.
- Platform-wide link review, moderation, disablement, and abuse handling.
- Platform statistics for registrations, links, visits and unlocks.
- Website content and general settings management.
- Manage available social platforms and action types.
- Review abuse reports, suspicious activity, and relevant security events.
- Configure upload limits, rate limits, and platform rules.
- Audit important administrative actions where included in the initial scope.
- Protect secrets and restrict sensitive settings to authorized administrators.

Regular users must never obtain admin access by changing URLs, modifying browser state, or directly calling backend endpoints.

## 11. Recommended Technology Stack and Deployment

The application will be deployed to a **VPS**. Use a stack that supports a polished public website, authenticated dashboards, server-side unlock verification, and straightforward VPS deployment.

**Recommended stack:**

- **Framework:** Next.js with App Router and TypeScript.
- **UI:** React, Tailwind CSS, and a carefully selected accessible component system; use custom design work rather than generic template-like layouts.
- **Database:** MySQL, suitable for common VPS hosting environments.
- **Database access:** Prisma ORM or another maintained, compatible ORM; keep schema and migrations version-controlled.
- **Authentication:** A maintained authentication solution with secure sessions, password reset, and server-side authorization. Select the implementation before development and do not build insecure custom authentication.
- **Server-side logic:** Next.js server actions/route handlers or dedicated server endpoints for protected operations, depending on the final architecture.
- **Validation:** Shared typed validation for client input and server requests, with server validation treated as authoritative.
- **File storage:** Private server storage or compatible object storage; protected files must never be publicly accessible before unlocking.
- **Deployment:** VPS with a supported Node.js LTS release, process manager or systemd, reverse proxy such as Nginx, HTTPS, environment-based secrets, database backups, and application logs.

Use current stable, mutually compatible versions at implementation time and verify official documentation before installing or upgrading dependencies. Pin dependencies and avoid unnecessary libraries. Keep secrets out of source control. The deployment instructions must be written for the selected VPS environment and must not assume Vercel-only hosting.

The final database, authentication library, and process/deployment details should be recorded in the repository's technical decisions before implementation. Do not mix unrelated frameworks or create separate frontend/backend applications unless a concrete requirement justifies it.

## 12. Security, Privacy, and Reliability

- Enforce authentication and authorization on the server for every private operation.
- Enforce ownership checks for all user-owned resources.
- Keep admin authorization separate from ordinary user permissions.
- Validate and sanitize all incoming data and uploaded files.
- Protect against CSRF where applicable, XSS, SQL injection, IDOR, open redirects, abuse, and brute-force attempts.
- Apply rate limits to authentication, link creation, unlock starts, and other abuse-prone endpoints.
- Store passwords using the authentication framework's secure password hashing.
- Store secrets in environment variables or a secrets manager; never expose them to client bundles.
- Verify action completion server-side and make processing idempotent.
- Never rely on client-side flags to authorize unlocking.
- Prevent direct access to protected content until requirements are met.
- Use HTTPS in production, secure cookies, and appropriate security headers.
- Add database backups, error logging, and basic monitoring.
- Apply privacy-conscious data collection, retention, export, and deletion rules.
- Test authorization boundaries, unlock bypass attempts, callback edge cases, and upload restrictions.

## 13. UX and Design Principles

- Build a polished, distinctive product rather than copying Rekonise or using a generic AI-generated template.
- Prioritize clarity, speed, responsive behavior, accessibility, and conversion.
- Avoid unnecessary card grids, excessive padding, and repetitive layouts.
- Keep the unlocking steps understandable, with every required action clearly presented.
- Provide useful empty states, validation messages, loading indicators, and recoverable error states.
- Keep public pages, owner dashboard, and admin panel visually consistent but functionally distinct.

## 14. Suggested Implementation Order

1. Confirm the scope of social actions and their verification limitations.
2. Define database schema, roles/permissions, and link/action models.
3. Build authentication, authorization, and the admin-controlled settings required for launch.
4. Implement the core link creation and protected-content delivery flow.
5. Implement action-completion tracking and server-side unlock verification.
6. Build the public website, unlock pages, and owner dashboard.
7. Add analytics, optional email collection, and optional customization features included in scope.
8. Test security, mobile UX, reliability, deployment, backups, and production configuration.

Do not leave the unlock verification architecture until the end; it is a core requirement that affects the data model and unlocking flow.

## 15. Acceptance Criteria

The initial release is not complete until:

- A visitor can view public pages and open a published unlock page on desktop and mobile.
- A registered user can create and manage their own links without paying.
- A link requires exactly the creator-configured actions, and a link with no actions unlocks immediately.
- A creator cannot bypass the configured requirements through the UI or direct API requests.
- Protected content and downloadable files cannot be accessed directly before authorization.
- The final Unlock button remains unavailable until all required actions are complete.
- Forged client-side completion flags do not unlock content.
- Users cannot access other users' links, files, analytics, or collected emails.
- Admin-only routes and actions are protected by server-side permissions.
- Failures, incomplete tasks, and expired links are handled clearly and safely.
- The application can be deployed and maintained on the target VPS using documented instructions.

## 16. Items to Confirm Before Estimation

- Which social actions are mandatory for launch and which verification methods are available.
- Whether downloadable files, custom slugs, expiration dates, profile/link-in-bio pages, audio, and advanced customization are launch requirements or later additions.
- Whether email collection and CSV export are included in the first release.
- Exact admin roles and whether audit logs are required for launch.
- Target VPS operating system and preferred database setup.

The delivery timeline and budget should be estimated after these integration and scope questions are resolved.

## 17. Final Business Rules

- **Free to use:** All included user-facing platform features are available without payment.
- **No subscriptions:** No premium tiers or user subscription billing.
- **Creator-defined requirements:** Every link requires exactly the actions its creator configures, and links with no actions unlock immediately.
- **Verified unlocking:** The final Unlock button and protected content are available only after every required action has been completed and validated server-side.
- **Separate permissions:** Guests, link owners, and administrators have clearly separated capabilities.
