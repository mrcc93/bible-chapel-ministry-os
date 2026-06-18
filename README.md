# Bible Chapel Ministry Planner

React/Vite prototype for Bible Chapel's ministry planning dashboard.

## Latest visual update

This version has been rethemed to match the Bible Chapel logo:

- White app surfaces
- Dark Bible Chapel blue primary navigation
- Lighter blue cards, states, and chart accents
- Yellow highlight/CTA accents from the cross/logo
- Bible Chapel logo added to the sidebar
- Bulletin PDF and PowerPoint exports updated to use the blue/yellow theme

## Phase 1 production readiness status

The app is still intentionally preserving the existing browser-based workflow in Phase 1, but the production path is now documented and scaffolded for Cloudflare Pages + D1:

- `wrangler.toml` declares the Pages output directory and the future `DB` D1 binding.
- `cloudflare/migrations/0001_initial_schema.sql` contains the initial normalized D1 schema.
- `functions/api/collections/[collection].js` adds the Cloudflare Pages Functions route shape for future authenticated data access.
- `src/data/collections.js` maps every current localStorage collection to its production D1 table.
- `docs/local-storage-inventory.md` documents every current localStorage usage and identifies sensitive data that must move to D1 before production ministry use.

## Run locally

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Build

Create a production build:

```bash
npm run build
```

Preview the built app locally:

```bash
npm run preview
```

## Cloudflare Pages setup

1. Create a Cloudflare Pages project connected to this repository.
2. Use these build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Keep the existing UI as the static Pages app.
4. Deploy the `functions/` directory with Pages Functions enabled so `/api/*` routes can later access D1.
5. Add the D1 binding named `DB` in the Cloudflare dashboard or through Wrangler after the database is created.

## Cloudflare D1 setup

Create a D1 database:

```bash
npx wrangler d1 create bible-chapel-ministry-os
```

Copy the generated database UUID into `wrangler.toml` as `database_id` under the `DB` binding.

Apply migrations locally while developing the Functions layer:

```bash
npx wrangler d1 migrations apply bible-chapel-ministry-os --local
```

Apply migrations to the remote Cloudflare D1 database:

```bash
npx wrangler d1 migrations apply bible-chapel-ministry-os --remote
```

Inspect local D1 data if needed:

```bash
npx wrangler d1 execute bible-chapel-ministry-os --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Data model and localStorage replacement plan

All current app state is still read and written through the `useLocalStorage` helper in `src/main.jsx`, using keys from `src/data/collections.js`. The full inventory is in `docs/local-storage-inventory.md`.

Sensitive ministry records must not remain in localStorage in the final production architecture. The following collections are marked sensitive and should move behind authenticated D1 APIs before real church data is entered:

- Attendance/giving stats
- People and volunteer records
- Volunteer absences
- Visitor follow-up
- Prayer requests
- Pastoral contacts
- Any task containing personal, care, or counseling details

Phase 2 should replace `useLocalStorage` with an API-backed data hook that calls Cloudflare Pages Functions, validates the current user, enforces organization membership/roles, and writes to the D1 schema.

## Authentication design notes

Authentication is intentionally deferred in Phase 1. The D1 schema already includes `users` and `organization_memberships` tables so Phase 2 can add role-aware access without reshaping the database.

Recommended Phase 2 requirements:

1. Add a Cloudflare-compatible identity provider or access layer.
2. Require authentication for all `/api/collections/*` routes.
3. Enforce roles such as `admin`, `pastor`, `staff`, `volunteer`, and `viewer`.
4. Restrict sensitive pastoral data to authorized roles only.
5. Add audit logging for create, update, and delete actions.
6. Provide a one-time localStorage import flow for authorized administrators.


## Phase 2A authentication and role foundation

Phase 2A adds only the authentication and authorization foundation. The existing React UI still reads and writes browser `localStorage`, and no sensitive ministry data is migrated to D1 in this phase.

Cloudflare Access should protect every `/api/*` route before production use. The Pages Functions middleware now expects Cloudflare Access identity headers:

- `CF-Access-Authenticated-User-Email`
- `CF-Access-Jwt-Assertion`

Configure role membership with Cloudflare Pages environment variables, not committed secrets:

- `ACCESS_ADMIN_EMAILS`: comma-separated emails with Admin access.
- `ACCESS_PASTOR_LEADER_EMAILS`: comma-separated emails with Pastor/Leader access.
- `ACCESS_VOLUNTEER_EMAILS`: comma-separated emails with Volunteer/View Only access.
- Optional `AUTH_ROLE_MAP`: JSON object mapping lowercase email addresses to `admin`, `pastor_leader`, or `volunteer_view_only`.

Role levels are cumulative for the API scaffold:

1. **Admin**: highest access, including organization/settings-level routes.
2. **Pastor/Leader**: access to sensitive ministry collections such as care, people, attendance, visitors, and pastoral contacts.
3. **Volunteer/View Only**: read access to non-sensitive planning collections while data access remains deferred.

The existing `/api/collections/:collection` scaffold now authenticates the Cloudflare Access user and checks the required role before returning the intentionally deferred `501` response. D1 reads, writes, import tooling, audit logging, and localStorage replacement remain future phases.

## Important production note

This prototype should not be used for real prayer requests, visitor details, attendance records, giving data, or pastoral contacts until authentication, D1 persistence, backups, and user permissions are fully implemented.

## Phase 2B planning data API migration

Phase 2B keeps the Phase 2A Cloudflare Access foundation in place and moves only non-sensitive planning data behind authenticated Pages Functions and typed/queryable D1 tables. Planning collections are not stored in a generic JSON blob table. The frontend still mirrors data to `localStorage` so local/offline development remains usable if the API or D1 binding is unavailable.

D1-backed planning collections in Phase 2B:

- Weekly rhythm days and ministry tasks (`rhythm`, `tasks`)
- Ministry events (`events`)
- Annual priorities / annual planning (`annualPlan`)
- Roadmap items (`roadmap`)
- Goals (`goals`)
- Sermon series and sermon planning (`series`)
- Sunday services, service order items, songs, and slides (`services`)
- Bulletins / bulletin announcements (`bulletin`)

Still localStorage-only and explicitly blocked from API migration until Phase 2C:

- Stats, attendance, and giving (`stats`)
- People records (`people`)
- Absences (`absences`)
- Visitors (`visitors`)
- Prayers / prayer requests (`prayers`)
- Contacts / pastoral contacts (`contacts`)

The `/api/collections/:collection` route now supports authenticated `GET`, `POST`, and collection replacement `PUT` for the Phase 2B planning collections only. `/api/collections/:collection/:id` supports authenticated `PUT`/`PATCH` and `DELETE` for individual planning rows. Handlers use explicit field mappings to structured tables, create/update requests are validated before writing to D1, and writes attempt to record a basic `audit_log` entry.

For local development only, `DEV_AUTH_BYPASS=1` can provide a fake authenticated user. The bypass is ignored whenever `CF_PAGES` is set, so Cloudflare Pages deployments continue to require real Cloudflare Access headers.

## Regression check: sermon series to Sunday services

Manual check for the Phase 2B sermon/Sunday data flow:

1. Run the app locally with `npm run dev -- --host 127.0.0.1`.
2. Open **Planning → Sermon Series**.
3. Create a sermon series with a title, start date, scripture, and theme.
4. Add a sermon inside that series with a sermon date, title, passage, and big idea.
5. Open **Sunday** and confirm the dated sermon appears under **Upcoming messages**.
6. If there is no service on the sermon date, click **Plan service** and confirm the new service is prefilled with the sermon date, title, connected message, passage/scripture, series title, big idea/theme, sermon order notes, and starter sermon slides.
7. Return to the same upcoming message after the service exists and confirm the action is **Open service**, not a duplicate-creation action.
8. Confirm the order of service and slides can use the sermon title, passage/scripture, series title, and big idea/theme.

This check preserves the typed/queryable D1 tables for sermon series, sermons, services, order items, songs, and slides. It does not migrate sensitive localStorage-only collections and does not introduce JSON blob storage.
