# B-T-B-N Web
A ten-route developer portfolio for Батбаясгалан. React, TypeScript, Vite, Tailwind CSS; locally bundled Manrope and JetBrains Mono fonts. No animation library — all motion is CSS plus small rAF-throttled hooks.

## Run
- `npm run dev -- --host 127.0.0.1 --port 4176`
- `npm run lint`
- `npm run build`
- `npm test` — 105 Playwright checks; all ten routes across five widths, interactions, motion, reduced motion, image loading, console errors, project hierarchy, live links, typographic floor, privacy/personal-data guards and WCAG accessibility.
- Production checks in PowerShell: `$env:PORTFOLIO_PRODUCTION='1'; npm test` (build first). Uses port 4177.

## CMS / admin (local development)

Projects live in **Cloudflare D1**; `/admin` is the editing surface. The public site reads
`/api/projects`, so publishing from the admin makes a project appear on `/work` and
`/work/:slug` with no code change.

### Start locally
```sh
npm install
npm run db:migrate:local   # creates the local D1 schema and seeds the eight projects
npm run dev                # Vite + Worker + local D1 on http://127.0.0.1:5173
```
`npm run dev` runs the Worker alongside the client via `@cloudflare/vite-plugin`, so
`/api/*` and `/admin` behave exactly as they will on a deployed Worker.

Admin: **http://127.0.0.1:5173/admin** — dashboard, `/admin/projects`,
`/admin/projects/new`, `/admin/projects/:id/edit`.

Other database commands:
- `npm run db:studio:local` — print the project table
- `npm run db:reset:local` — delete local D1 state, then re-run the migrate command
- `npm run seed:generate` — regenerate the seed migration from `src/data.ts`

### Local development auth
Real Google OAuth / Cloudflare Access is **not** configured yet. Locally, `.dev.vars`
(gitignored; copy from `.dev.vars.example`) supplies:
```
ENVIRONMENT=development
LOCAL_ADMIN_DEV=true
```
Both must be true for the simulated "Local Admin / Administrator" identity, and the admin
UI shows a **LOCAL DEV ADMIN** badge whenever it is active.

This cannot be enabled in production: a deployed Worker takes `ENVIRONMENT=production`
from `wrangler.jsonc`, so the flag is ignored no matter its value. When production auth is
absent, `getAdminUser` returns null and the Worker serves a 403 for `/admin` and every
`/api/admin/*` route — there is no fallback to the local identity. `worker/lib/auth.ts`
holds the whole decision, and a test asserts each combination.

### Schema
One `projects` table (`migrations/0001_create_projects.sql`). Notable columns: `slug`
(unique), `project_type` (production/fullstack/landing/concept), `featured`, `sort_order`,
`is_published`, the case-study text fields, and `tech_stack`/`filters`/`scenes`/`features`
as JSON strings. Image columns store **paths or URLs only, never binary** — they hold
`/previews/…` today and can hold R2 URLs later without a schema change.

Validation is server-side in `worker/lib/projects.ts`: required fields, slug format and
uniqueness, `http(s)`-only URLs (so `javascript:` is rejected), year and sort-order ranges.
The client form is a convenience, not the gate.

## Security

Hardening lives in `worker/lib/security.ts` (headers, origin check, rate limiting, audit
log), `worker/lib/auth.ts` (the authorisation decision), `worker/lib/access.ts`
(Cloudflare Access JWT verification) and `worker/lib/projects.ts` (input validation).

**Authentication.** Three providers, tried in order: the local development identity
(only when `ENVIRONMENT=development` *and* `LOCAL_ADMIN_DEV=true`), Cloudflare Access
(RS256 JWT verified against the team JWKS — issuer, audience, expiry and signature), and
a signed Google session cookie. Whichever authenticates, the verified email must also
appear in `ADMIN_EMAILS`; authentication alone is not authorisation. `Cf-Access-
Authenticated-User-Email` is deliberately **not** trusted, because it is forgeable if a
request ever reaches the Worker without passing through Access.

**Authorisation.** Every `/api/admin/*` route re-checks authorisation server-side. The
React route guard and hidden buttons are conveniences, never the control.

**CSRF.** State-changing requests must carry a same-origin `Origin` (or `Referer`).
Requests with neither — the shape of a CLI or CI client — must send
`x-requested-with: btbn-admin`, which a cross-site page cannot add without a preflight
this Worker never approves.

**Headers.** Applied to every response: CSP (`frame-ancestors 'none'`, `object-src
'none'`, `base-uri 'self'`, and `script-src 'self'` with no `unsafe-eval`/`unsafe-inline`
in production), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, and HSTS outside development. Admin and API responses are
`no-store, private`.

**Rate limiting.** In-memory, per isolate: 300/min for `/api/admin/*`, 10/min for
`/api/auth/*`. This is a speed bump, not a distributed guarantee — see the checklist for
the Cloudflare rules that provide real enforcement.

**Validation.** Per-field length ceilings, bounded arrays, `http(s)`-only URLs (so
`javascript:` and `data:` are refused), slug format and uniqueness, integer ranges, a
128 KB body cap, and a fixed writable-column allowlist between validation and SQL. All
D1 access uses bound parameters.

**Audit log.** Structured JSON for auth outcomes, rate limiting, origin rejections and
every project create/update/delete/publish. Records emails and coarse IP prefixes only —
never tokens, cookies, secrets or form bodies.

## Production security checklist

Nothing below is active yet; each item needs configuring in Cloudflare.

1. **D1** — `wrangler d1 create btbn-portfolio`, put the real `database_id` in
   `wrangler.jsonc`, then `wrangler d1 migrations apply btbn-portfolio --remote`.
2. **Cloudflare Access application** — protect `/admin*` and `/api/admin/*`. Add Google
   as the identity provider. Copy the **Application Audience (AUD) tag**.
3. **Wrangler secrets** — `wrangler secret put` for `SESSION_SECRET`, `ADMIN_EMAILS`,
   `ACCESS_TEAM_DOMAIN` (`<team>.cloudflareaccess.com`), `ACCESS_AUD`, and
   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` if the Google path is kept as a fallback.
4. **Confirm `ENVIRONMENT=production`** in `wrangler.jsonc` and never set
   `ENVIRONMENT=development` on the deployed Worker.
5. **Rate limiting rules** — the in-Worker limiter is per isolate. Add WAF rate limiting:
   `/api/admin/*` at ~300 req/min per IP, `/api/auth/*` at ~10 req/min per IP.
6. **Verify after deploying** — `/admin` redirects to Access when signed out; a
   non-allow-listed Google account is refused after authenticating; `curl -I` shows the
   production CSP with no `unsafe-eval`, plus HSTS; `/api/projects` omits drafts;
   an unauthenticated `POST /api/admin/projects` returns 401/403.
7. **Formspree** — set `VITE_FORMSPREE_ID` and restrict the form to the production
   domain in the Formspree dashboard.

## Still to do for production
1. `wrangler d1 create btbn-portfolio` and put the real `database_id` in `wrangler.jsonc`
2. `wrangler d1 migrations apply btbn-portfolio --remote`
3. Configure Cloudflare Access (Google) and implement `verifyAccessJwt` in `worker/lib/auth.ts`
4. Optionally add R2 for uploads and point the image columns at it
5. `wrangler deploy` — and never set `ENVIRONMENT=development` on the deployed Worker

## Routes
`/`, `/work`, all eight `/work/<slug>` case studies, `/services`, `/about`, `/contact`.
History-based navigation preserves ordinary links, modifier clicks, back/forward, active state and focus. Unknown paths show a 404 interface. Each route has its own title and description. Production hosting needs SPA fallback.

## Editing
- `src/data.ts`: project evidence, Mongolian copy, services, technologies and real contact details.
- `src/App.tsx`: pages and case-study layouts.
- `src/components.tsx`: shared UI, accessible form, navigation, project cards (`FeatureProject` for production work, `ConceptCard` for concepts), browser-frame visual, magnetic CTA and desktop cursor.
- `src/motion.ts`: reduced-motion helper and the scroll parallax hook.
- `src/router.tsx` and `src/route-state.ts`: lightweight navigation.
- `src/index.css`: design tokens (ink/paper/accent, type scale), editorial layouts, responsive styles, CSS motion and reduced-motion rules.
- `verification/`: full-page desktop/mobile browser captures and results.

## Project provenance
**Citiled:** The original sibling `../citiled` is the production project represented here. Its README, package manifest, Prisma/security source, Cloudflare configuration and GitHub Actions workflow support the architecture description. Public screenshots were captured from https://citiled.citiled-mn.workers.dev. No authenticated admin access or private data was used. Do not confuse this with the separate `citiled-astra` implementation.

**ArenaHub (Gaming Online Course):** Now publicly deployed at https://btbn-arenahub.vercel.app and screenshotted directly from that public landing page. Case-study copy is limited to what the live site states or shows: 8 courses, 56 lessons, 280+ tasks, the named course path (HTML → CSS → JavaScript → Advanced JS → React → Node.js → Database → Deploy), XP and live leaderboard, the AI hint agent, the HP/enemy task mechanic, and the MON/ENG toggle. Model and editor details come from the diploma source at `../../nextjs/diplome_ajil/arenahub-next`. It is a diploma project that is publicly reachable — not a verified commercial service. Pricing tiers shown on the live site are not claimed as revenue, and no admin, account or private data was accessed.

**Concept projects:** Existing self-contained Morrow, LUNE and NOMAD demos remain in `public/demos/`. They are explicitly labeled Concept Project. No paid client work, real booking or inquiry delivery is claimed. Project photography comes from their existing assets.

Only Portfolio files were written. Coffee-shop, Beauty-salon, Construction, Citiled and ArenaHub originals were not modified.

## Screenshots
1. `node scripts/capture-major.mjs` captures desktop, mobile and detail images from the public Citiled and ArenaHub deployments. Requires network access; touches no authenticated area.
2. `npm test` captures the portfolio itself into `verification/`.

Demo refresh scripts remain available; they only copy existing builds into Portfolio.

## Contact
The seven-field form validates name, email, optional Mongolian phone, project type and message. Company and broad budget ranges are optional. Success explicitly explains that no request was sent or saved. No submission endpoint or storage is used.

## Privacy and personal branding
No portrait, age, birthday, address, school or personal background appears anywhere. Identity is carried typographically: the `B—T—B—N` wordmark, name, role, city and working mode on a technical grid (`.identity-panel` on `/about`). Trust is carried by shipped work — the About page links straight to the live Citiled and ArenaHub deployments.

## Contact channels
Official **business** channels live in `contact` in `src/data.ts` and render through `DirectContact` (Contact page) and the footer (every route):

| Channel | Destination | Behaviour |
| --- | --- | --- |
| Email | `btbnweb@gmail.com` | `mailto:` — opens a mail client |
| GitHub | `github.com/btbnweb-dev` | new tab, `rel="noopener noreferrer"` |
| Facebook | profile `61594587243741` | new tab, `rel="noopener noreferrer"` |
| Instagram | `@btbn_web` | new tab, `rel="noopener noreferrer"` |

`phone` is deliberately empty — no private number is published, and empty fields are never rendered. `contact.pending` (now empty) lists planned channels as plain text rather than dead links. Project repository links are separate from this list: only add a repo link where the repository is public and authorised.

A test asserts that every `mailto:` on every route points at the business address, that the only social destinations are these three URLs, that no `tel:` link exists, and that no address/birthday/age/school/phone pattern appears in visible copy.

## Inquiry form
The Contact form posts to **Formspree**, which forwards to `btbnweb@gmail.com`.

- Subject: `B-T-B-N Web — Шинэ төсөл: <project type>`; `_replyto` is set to the visitor's address so a reply goes straight back to them.
- All seven fields are sent under their Mongolian labels.
- States: validation errors → loading (button disabled, `aria-busy`, spinner) → success or a failure notice offering the email fallback. A re-entrant guard plus the disabled button prevent duplicate submissions.
- Spam: an off-screen honeypot (`name="website"`). When filled, the UI reports success but nothing is sent.

**Setup.** Create a form at formspree.io with `btbnweb@gmail.com` as the recipient, then set `VITE_FORMSPREE_ID` to its id — locally in `.env` (gitignored) and in the host's environment settings. See `.env.example`. The repo ships `VITE_FORMSPREE_ID=xtestlocal`, a placeholder that must be replaced before the form delivers real mail.

The Formspree form id is **public by design**: Formspree expects it in browser code and restricts submissions to the domains allowed in its dashboard, so it is not a secret. Never put a Formspree API key or any other private credential in a `VITE_*` variable — anything prefixed `VITE_` is inlined into the public bundle.

## Hosting
Deploy the complete `dist/` at the domain root. Keep existing static files (especially `/demos/` and image assets) accessible before applying the SPA fallback. `public/_redirects` provides a fallback for compatible hosts such as Cloudflare Pages/Netlify. On nginx use `try_files $uri $uri/ /index.html;`. GitHub Pages requires a separate SPA fallback solution.

Set the final public origin and absolute social-image URL when a domain is chosen. Client route metadata is updated in the browser; universal social previews would require prerendering or server rendering. This task does not deploy the portfolio.
