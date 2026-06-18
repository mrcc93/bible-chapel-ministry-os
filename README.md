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
