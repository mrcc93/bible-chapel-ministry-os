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
pnpm install
```

Start Vite:

```bash
pnpm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Build

Create a production build:

```bash
pnpm run build
```

Preview the built app locally:

```bash
pnpm run preview
```

## Cloudflare Pages setup

1. Create a Cloudflare Pages project connected to this repository.
2. Use these build settings:
   - Framework preset: `Vite`
   - Build command: `pnpm install --frozen-lockfile && pnpm run build`
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

1. Run the app locally with `pnpm run dev -- --host 127.0.0.1`.
2. Open **Planning → Sermon Series**.
3. Create a sermon series with a title, start date, scripture, and theme.
4. Add a sermon inside that series with a sermon date, title, passage, and big idea.
5. Open **Sunday** and confirm the dated sermon appears under **Upcoming messages**.
6. If there is no service on the sermon date, click **Plan service** and confirm the new service is prefilled with the sermon date, title, connected message, passage/scripture, series title, big idea/theme, sermon order notes, and starter sermon slides.
7. Return to the same upcoming message after the service exists and confirm the action is **Open service**, not a duplicate-creation action.
8. Confirm the order of service and slides can use the sermon title, passage/scripture, series title, and big idea/theme.

This check preserves the typed/queryable D1 tables for sermon series, sermons, services, order items, songs, and slides. It does not migrate sensitive localStorage-only collections and does not introduce JSON blob storage.

## Phase 2B.5 planning API stabilization checklist

Phase 2B.5 verifies the typed/queryable planning API before Phase 2C. Planning data remains mapped to explicit D1 tables only: `weekly_rhythm_days`, `tasks`, `ministry_events`, `annual_priorities`, `roadmap_items`, `goals`, `sermon_series`, `sermons`, `services`, `service_order_items`, `service_songs`, `service_slides`, and `bulletin_announcements`. Do not add a generic JSON blob table for migrated planning data.

Sensitive ministry collections are intentionally blocked from API migration and must remain localStorage-only until Phase 2C:

- Stats, attendance, and giving
- People records
- Absences
- Visitors
- Prayers / prayer requests
- Contacts / pastoral contacts

The browser may use localStorage only for local/offline development fallback. In Cloudflare preview or production, a planning API error should be treated as a deployment/configuration issue, not silently accepted as the production data path.

### Manual QA checklist

Before opening Phase 2C, verify these workflows against a local Pages/D1 preview and again against Cloudflare preview or production:

- [ ] Add a sermon inside a sermon series from **Planning → Sermon Series**.
- [ ] Confirm that dated sermon appears in **Sunday → Upcoming messages**.
- [ ] Click **Plan service** from the sermon, then confirm the created service includes the sermon title, date, passage/scripture, series title, big idea/theme, order notes, and starter slides.
- [ ] Return to the same dated sermon and confirm the action changes to **Open service** rather than creating a duplicate.
- [ ] Add, edit, and delete a ministry event from **Planning → Monthly Plan**.
- [ ] Add, edit, and delete a goal from **Planning → Goals**.
- [ ] Add, edit, and delete a roadmap item/status from **Planning → Roadmap**.
- [ ] Create a bulletin announcement from **Bulletin**, then refresh and confirm it remains visible through the D1/API path.
- [ ] Confirm Settings or the sidebar shows planning data as D1/API-backed when the API is reachable.
- [ ] Confirm sensitive ministry data is labeled local-only until Phase 2C and that `/api/collections/stats`, `/people`, `/absences`, `/visitors`, `/prayers`, and `/contacts` remain blocked.

### Cloudflare deployment checklist

- [ ] Run all D1 migrations in order, including the Phase 2B planning tables and sermon-service link migration.
- [ ] Configure the Cloudflare Pages D1 binding as `DB` for preview and production.
- [ ] Configure Cloudflare Access for every `/api/*` route so identity headers are present.
- [ ] Confirm `DEV_AUTH_BYPASS` is not active whenever `CF_PAGES` is set.
- [ ] Test `/api/collections/rhythm`, `/tasks`, `/events`, `/annualPlan`, `/roadmap`, `/goals`, `/series`, `/services`, and `/bulletin` in preview/production.
- [ ] Test that blocked sensitive routes return `403` and do not create D1 rows.
- [ ] Confirm no secrets, Access tokens, or D1 credentials are committed.

## Phase 2D Cloudflare deployment readiness

Phase 2D prepares the app for a real Cloudflare Pages + D1 + Access deployment test while preserving the Phase 2B typed planning API. It does **not** migrate sensitive ministry collections and does **not** add JSON blob storage.

### API route readiness

Cloudflare Pages Functions are deployed from the `functions/` directory:

- `functions/_middleware.js` protects every `/api/*` route with Cloudflare Access, or with `DEV_AUTH_BYPASS` only during local development when `CF_PAGES` is not set.
- `functions/api/status.js` exposes `GET /api/status` for safe deployment verification.
- `functions/api/collections/[collection].js` supports authenticated `GET`, `POST`, and replacement `PUT` for Phase 2B planning collections only.
- `functions/api/collections/[collection]/[id].js` supports authenticated `PUT`/`PATCH` and `DELETE` for individual Phase 2B planning rows only.
- `functions/_shared/planning-api.js` keeps the planning API mapped to typed/queryable D1 tables and explicitly blocks sensitive collections from API migration.

The status route intentionally returns only deployment metadata: whether auth and role were detected, whether the `DB` D1 binding exists, whether required planning tables are present, whether the Phase 2B planning API is enabled, and which sensitive collection names remain blocked. It does not return ministry records, Access JWTs, D1 credentials, or other sensitive data.

### Sensitive collections that must remain localStorage-only

Do not migrate these collections until a later phase with explicit approval:

- Stats, attendance, and giving (`stats`)
- People (`people`)
- Absences (`absences`)
- Visitors (`visitors`)
- Prayers / prayer requests (`prayers`)
- Contacts / pastoral contacts (`contacts`)

`/api/collections/stats`, `/api/collections/people`, `/api/collections/absences`, `/api/collections/visitors`, `/api/collections/prayers`, and `/api/collections/contacts` must continue returning `403` with no sensitive data.

### Cloudflare Pages deployment checklist

1. **Create or connect the Pages project**
   - In Cloudflare, create a Pages project connected to this repository.
   - Use the branch you want to test, normally `main` for production and a PR/preview branch for preview.
2. **Configure build settings**
   - Framework preset: `Vite`
   - Build command: `pnpm install --frozen-lockfile && pnpm run build`
   - Build output directory: `dist`
   - The checked-in `wrangler.toml` also declares `pages_build_output_dir = "dist"`.
3. **Create or connect D1**
   - Create the database if needed:
     ```bash
     npx wrangler d1 create bible-chapel-ministry-os
     ```
   - Copy the generated UUID into the `database_id` placeholder in `wrangler.toml`, or configure the binding in the Cloudflare dashboard for Pages preview/production.
   - Keep the binding name exactly `DB`.
4. **Apply D1 migrations**
   - Apply local migrations for local Pages testing:
     ```bash
     npx wrangler d1 migrations apply bible-chapel-ministry-os --local
     ```
   - Apply remote migrations for the Cloudflare D1 database:
     ```bash
     npx wrangler d1 migrations apply bible-chapel-ministry-os --remote
     ```
   - Migrations must include the Phase 2B planning tables and the service-sermon link migration.
5. **Configure the `DB` binding**
   - In Pages project settings, add a D1 database binding named `DB` for both preview and production.
   - The binding must point to the intended D1 database for that environment.
6. **Configure Cloudflare Access**
   - Protect `/api/*` so Cloudflare injects verified Access headers.
   - Set role environment variables in Cloudflare, not in git:
     - `ACCESS_ADMIN_EMAILS`
     - `ACCESS_PASTOR_LEADER_EMAILS`
     - `ACCESS_VOLUNTEER_EMAILS`
     - Optional `AUTH_ROLE_MAP`
   - Do not commit Access tokens, JWTs, service tokens, database credentials, or email allowlists that should remain private.
7. **Verify local bypass is disabled on Pages**
   - `DEV_AUTH_BYPASS=1` is only for local development.
   - The auth helper ignores `DEV_AUTH_BYPASS` whenever `CF_PAGES` is set, so deployed Pages environments must use real Cloudflare Access headers.
8. **Test `/api/status`**
   - Visit `/api/status` after signing in through Access.
   - Confirm `auth.detected` is `true`, `auth.roleDetected` is `true`, `d1.bindingAvailable` is `true`, `planningApi.enabled` is `true`, and `sensitiveCollections.blockedFromApiMigration` is `true`.
   - If `d1.migrationsApplied` is `false`, apply migrations before testing the planning workflows.
9. **Test planning collections**
   - Verify `/api/collections/rhythm`, `/tasks`, `/events`, `/annualPlan`, `/roadmap`, `/goals`, `/series`, `/services`, and `/bulletin` respond after Access sign-in.
   - Verify `/api/collections/stats`, `/people`, `/absences`, `/visitors`, `/prayers`, and `/contacts` remain blocked with `403`.
10. **Test the sermon-series-to-Sunday workflow in preview/production**
    - Open **Planning → Sermon Series**.
    - Create a series and add a dated sermon with title, passage/scripture, and big idea/theme.
    - Open **Sunday** and confirm the sermon appears under **Upcoming messages**.
    - Click **Plan service** and confirm the new service is prefilled from the sermon and series.
    - Return to the same message and confirm it now offers **Open service** instead of creating a duplicate.
    - Refresh and confirm the planning data remains available through the D1/API path.

### Local Wrangler development notes

Use Vite for UI-only development:

```bash
pnpm run dev -- --host 127.0.0.1
```

Use Wrangler when you need Pages Functions and D1 locally:

```bash
DEV_AUTH_BYPASS=1 DEV_AUTH_ROLE=admin npx wrangler pages dev dist --d1 DB=bible-chapel-ministry-os
```

A typical local API verification flow is:

```bash
pnpm run build
npx wrangler d1 migrations apply bible-chapel-ministry-os --local
DEV_AUTH_BYPASS=1 DEV_AUTH_ROLE=admin npx wrangler pages dev dist --d1 DB=bible-chapel-ministry-os
curl http://127.0.0.1:8788/api/status
```

### Troubleshooting Cloudflare deployment

- **Missing D1 binding**: `/api/status` reports `d1.bindingAvailable: false` or collection routes return `Cloudflare D1 binding DB is not configured.` Add a Pages D1 binding named exactly `DB` for the active preview/production environment.
- **Migration not applied**: `/api/status` reports `d1.migrationsApplied: false` with missing table names. Run the D1 migrations against the same database connected to the Pages environment.
- **Missing Access headers**: API routes return `401 Authentication required`. Confirm Cloudflare Access protects `/api/*` and that requests are reaching Pages through Cloudflare, not directly without Access.
- **Unauthorized role**: API routes return `403 Forbidden` with the current and required role. Add the user to the appropriate Access role environment variable or `AUTH_ROLE_MAP` in Cloudflare Pages settings.
- **API fallback behavior**: In local Vite development, planning collections may fall back to localStorage when the API is unavailable. In Cloudflare preview or production, treat API failures as deployment/configuration issues and fix Access, D1 bindings, or migrations instead of relying on localStorage.
- **Sensitive route returns data**: This is a release blocker. Sensitive collections must remain blocked from API migration and localStorage-only until a later approved phase.

## Phase 2C-Prep ministry users and role management

Cloudflare Access remains the authentication provider for `/api/*`. Users sign in with their email through Access; Josh and Molly do **not** need Cloudflare dashboard accounts. The app reads the verified `cf-access-authenticated-user-email` header as identity, never stores passwords, and does not store Cloudflare secrets.

Phase 2C-Prep adds a typed/queryable `ministry_users` D1 table for app-managed roles. It stores email, display name, role, active/inactive status, and timestamps. `/api/status` now prefers an active matching D1 ministry user role. If no active D1 user exists yet, the app falls back to the existing bootstrap environment variables (`ACCESS_ADMIN_EMAILS`, `ACCESS_PASTOR_LEADER_EMAILS`, `ACCESS_VOLUNTEER_EMAILS`, or `AUTH_ROLE_MAP`). Keep those variables only for bootstrap/fallback access and manage roles inside Settings after the first Admin is active in D1.

Initial intended users:

- `clintkubow12@gmail.com` → Admin
- `jobailey2310@gmail.com` → Pastor/Leader
- `mollykubow@gmail.com` → Pastor/Leader

After deployment and migration:

1. Keep `clintkubow12@gmail.com` in `ACCESS_ADMIN_EMAILS` long enough for bootstrap Admin access.
2. Apply the latest D1 migrations, including `0004_phase_2c_ministry_users.sql`.
3. Sign in as Clint through Cloudflare Access.
4. Open **Settings → Ministry Users**.
5. Add Clint as Admin, Josh as Pastor/Leader, and Molly as Pastor/Leader.
6. Confirm `/api/status` reports `roleSource: "d1_ministry_users"` for those active D1 users.
7. Leave the environment role variables in place only as emergency bootstrap/fallback configuration.

Role permissions in this prep phase:

- **Admin** can manage ministry users and roles, and can add/edit/remove People records.
- **Pastor/Leader** cannot manage app users or change roles, but can add/edit/remove People records and is prepared for future care workflows.
- **Volunteer/View Only** can view allowed data but cannot add/edit/remove People records and cannot manage users.

People records remain local-only in this phase, but the UI permission model is prepared for the upcoming People D1 migration. Visitors, absences, prayers/prayer requests, contacts/pastoral contacts, stats/attendance/giving remain local-only and are not migrated by Phase 2C-Prep. No JSON blob storage is introduced for ministry users or planning data.
