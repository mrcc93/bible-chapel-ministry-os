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

## Important production note

This prototype should not be used for real prayer requests, visitor details, attendance records, giving data, or pastoral contacts until authentication, D1 persistence, backups, and user permissions are fully implemented.

## Phase 2A authentication and role protection foundation

Phase 2A adds the authentication and authorization foundation without moving sensitive data out of localStorage yet. Existing UI workflows remain usable while `/api/*` requests are guarded by middleware and `/api/collections/*` routes require an authenticated Cloudflare session plus role authorization before any D1 CRUD is implemented.

### Recommended auth provider

Use **Cloudflare Access** in front of the Cloudflare Pages app. Access can authenticate users through Google Workspace, Microsoft Entra ID, Okta, or one-time PIN policies, then pass trusted identity headers to Pages Functions after Access policy checks succeed.

Recommended setup:

1. Protect the deployed Pages domain, including `/api/*`, with a Cloudflare Access application.
2. Require church staff/leader identities through the selected identity provider.
3. Use Access groups or an environment-provided role map to assign Bible Chapel app roles.
4. Keep all D1 collection routes protected; do not expose sensitive church records through anonymous endpoints.

### Roles

| Role | Intended access |
| --- | --- |
| `admin` | Settings, future role/admin operations, future migration tooling, and all ministry data. |
| `pastor_leader` | Ministry workflows plus sensitive care, prayer, visitors, contact logs, and attendance/giving areas. |
| `volunteer_viewer` | General read-only ministry workflows. No sensitive pastoral/care data. |

Sensitive route areas are Admin or Pastor/Leader only:

- Care
- Prayer
- Visitors
- Contact logs
- Attendance/giving

### Required Cloudflare environment variables

Do not commit secrets or provider credentials to this repository. Configure secrets and role maps in the Cloudflare dashboard or with Wrangler variables/secrets.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `AUTH_DEFAULT_ROLE` | Optional | Fallback role for authenticated users without an explicit role; defaults to `volunteer_viewer`. |
| `AUTH_ROLE_MAP_JSON` | Recommended | JSON object mapping lower-case email addresses to roles, for example `{ "pastor@example.org": "pastor_leader" }`. Store as a protected Cloudflare variable/secret, not in source control. |
| `AUTH_ALLOW_DEV_HEADERS` | Local only | Set to `true` only in local development to allow `X-BC-Dev-User-Email` and `X-BC-Dev-Role` request headers. Do not enable in production. |

The shared middleware in `functions/api/_middleware.js` requires authentication for every `/api/*` request. Collection routes then apply role-specific read/write checks before returning the deferred Phase 2B response.

Cloudflare Access supplies the authenticated email through `Cf-Access-Authenticated-User-Email`. The helper also detects `Cf-Access-Jwt-Assertion` so production requests can be associated with Cloudflare Access.

### Local auth development

The current React sidebar includes a demo login/logout shell. It is a UI placeholder only and does not store secrets or protect data. It helps preview roles while the app still uses localStorage.

For local Pages Functions development, use Wrangler with development headers enabled:

```bash
AUTH_ALLOW_DEV_HEADERS=true npx wrangler pages dev dist --d1 DB=bible-chapel-ministry-os
```

Then call a protected route with explicit dev headers:

```bash
curl -H "X-BC-Dev-User-Email: pastor@example.org" -H "X-BC-Dev-Role: pastor_leader" http://127.0.0.1:8788/api/collections/prayers
```

The route should authenticate and authorize the request, then return `501` while D1 CRUD remains intentionally deferred.

### Manual Cloudflare setup still required

Before migrating sensitive church data to D1, complete these manual steps in Cloudflare:

1. Create and configure the Cloudflare Access application for the Pages domain.
2. Choose and connect the identity provider.
3. Define Access policies or groups for staff, leaders, volunteers, and viewers.
4. Configure `AUTH_ROLE_MAP_JSON` or an equivalent role source.
5. Configure the D1 `DB` binding with the real database UUID.
6. Apply D1 migrations to local and remote databases.
7. Add audit logging and collection-specific D1 CRUD in a later phase.

### Current deferrals

- Sensitive data remains in the existing browser localStorage workflow until the data migration phase.
- `/api/collections/*` routes now require authentication and role checks, but they still return `501` rather than reading or writing sensitive D1 rows.
- Full provider-specific login redirects, token verification customization, and user management remain Cloudflare configuration tasks.
