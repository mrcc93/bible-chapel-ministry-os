# Bible Chapel Ministry OS

Bible Chapel Ministry OS is a Cloudflare Pages + React ministry operations app for Bible Chapel. It keeps the existing Bible Chapel branding while giving leaders one place for weekly rhythm, planning, Sunday services, bulletin work, people, care follow-up, attendance/statistics, and production readiness checks.

## Current architecture

- **Frontend:** Vite, React, Chart.js, `jspdf`, `pptxgenjs`, and the Bible Chapel brand assets.
- **Hosting:** Cloudflare Pages.
- **Authentication:** Cloudflare Access protects every `/api/*` request. Local development may use `DEV_AUTH_BYPASS`; production must not.
- **Persistence:** Cloudflare D1 typed tables. Migrated app records are not stored as JSON blobs.
- **API:** Cloudflare Pages Functions under `functions/api/*` with shared auth and typed collection logic.

## D1-backed collections

The production app currently uses typed/queryable D1 tables for:

- Ministry users and role management.
- People Directory.
- Weekly rhythm and tasks.
- Monthly events, annual priorities, roadmap items, and goals.
- Sermon series, sermons, Sunday services, service order items, songs, slides, and bulletin announcements.
- Visitors, prayer requests, volunteer absences, and pastoral contacts.
- Attendance/statistics in `attendance_stats`, including service date/type, attendance counts, kids, online reach, visitor count, notes, and Admin-only giving fields.

`settings` remains browser-local identity text for the small app shell. Standalone `/api/collections/attendance` and `/api/collections/giving` are intentionally blocked; attendance and Admin-only giving fields are handled through `/api/collections/stats`.

## Role permissions

- **Admin:** can manage all app areas, ministry users/roles, people, care records, planning, Sunday services, bulletin, attendance/statistics, and giving fields.
- **Pastor/Leader:** can manage planning, people, visitors, prayer requests, absences, pastoral contacts, and attendance/statistics. Giving fields are omitted and cannot be written by this role.
- **Volunteer/View Only:** can read safe planning/service/bulletin data. Sensitive people, care, attendance/statistics, giving, and role-management routes are blocked server-side.

Permissions are enforced in Pages Functions, not only hidden in the UI. `/api/status` reports capability and schema status without returning sensitive record data.

## Cloudflare Access setup

1. Protect the Pages project and all `/api/*` paths with Cloudflare Access.
2. Ensure Access sends `cf-access-authenticated-user-email` and `cf-access-jwt-assertion` headers.
3. Seed at least one Admin through `ACCESS_ADMIN_EMAILS`, `AUTH_ROLE_MAP`, or the D1 ministry users table.
4. Keep `DEV_AUTH_BYPASS` disabled in production.

## D1 migration instructions

Apply migrations in order; do not edit old migrations.

```bash
wrangler d1 migrations apply bible_chapel_ministry_os --local
wrangler d1 migrations apply bible_chapel_ministry_os --remote
```

The final stats polish migration is `cloudflare/migrations/0006_stats_attendance_polish.sql` and only adds typed columns/indexes to the existing `attendance_stats` table.

## Local development

```bash
pnpm install
pnpm run dev
pnpm run build
```

For local Pages Functions testing, configure a local D1 database and a non-production `DEV_AUTH_BYPASS` user. Browser localStorage fallback is intended only for localhost/offline development; production API failures are shown in the UI.

## Production deployment checklist

- Cloudflare Pages build succeeds.
- D1 binding `DB` is configured.
- All migrations are applied remotely.
- Cloudflare Access protects `/api/*`.
- At least one Admin user can access Settings → Ministry Users.
- `/api/status` reports D1 binding available, migrations applied, planning API enabled, people/care enabled, and stats/attendance enabled.
- No secrets are committed to the repo.

## Manual QA checklist

- `/api/status` loads behind Cloudflare Access and does not expose record details.
- Ministry Users: Admin can create/update/deactivate users; Pastor/Leader cannot.
- People Directory: Admin and Pastor/Leader can manage people; Volunteer/View Only cannot access sensitive people records.
- Planning: events, annual priorities, roadmap, sermon series, and goals persist through D1.
- Sermon series → Sunday service: dated sermons can build service plans with order, songs, and slides.
- Bulletin: edit, copy, and PDF export still work from D1-backed bulletin data.
- Visitors, Prayer Requests, Absences, and Pastoral Contacts persist through D1 and enforce Pastor/Leader+ access.
- Attendance/Stats: Admin and Pastor/Leader can save attendance/stat rows; dashboard/stat charts update from D1-backed stats.
- Giving: Admin sees and writes giving; Pastor/Leader and Volunteer/View Only do not see giving values.
- Dashboard: shows attendance trend, upcoming services/events, visitor follow-up, open prayers, roadmap/goals, and role-safe ministry health information.
- Role checks: verify Admin, Pastor/Leader, and Volunteer/View Only behavior server-side and in the UI.
