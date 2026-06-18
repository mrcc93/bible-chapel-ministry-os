# localStorage inventory and D1 replacement plan

The current React UI persists all mutable ministry data through the `useLocalStorage` helper in `src/main.jsx`. The helper prefixes each collection with `bc-planner:` before reading and writing browser storage.

## Storage helper

- `localStorage.getItem(\`bc-planner:${key}\`)` reads the collection during component initialization.
- `localStorage.setItem(\`bc-planner:${key}\`, JSON.stringify(next))` writes each update.

## Collections

| Collection key | Browser key | Current purpose | Sensitive church data? | D1 target |
| --- | --- | --- | --- | --- |
| `settings` | `bc-planner:settings` | Church name, pastor, app theme | No | `organizations` |
| `rhythm` | `bc-planner:rhythm` | Weekly ministry rhythm/focus | No | `weekly_rhythm_days` |
| `tasks` | `bc-planner:tasks` | Ministry task list | Sometimes | `tasks` |
| `stats` | `bc-planner:stats` | Attendance and giving stats | Yes | `attendance_stats` |
| `events` | `bc-planner:events` | Events and ministry pushes | No | `ministry_events` |
| `annualPlan` | `bc-planner:annualPlan` | Annual priorities | No | `annual_priorities` |
| `services` | `bc-planner:services` | Services and order items | No | `services`, `service_order_items` |
| `people` | `bc-planner:people` | Volunteer/people records | Yes | `people` |
| `absences` | `bc-planner:absences` | Volunteer absences | Yes | `volunteer_absences` |
| `visitors` | `bc-planner:visitors` | Visitor follow-up | Yes | `visitors` |
| `prayers` | `bc-planner:prayers` | Prayer requests | Yes | `prayer_requests` |
| `contacts` | `bc-planner:contacts` | Pastoral/ministry contacts | Yes | `pastoral_contacts` |
| `series` | `bc-planner:series` | Sermon series plans | No | `sermon_series` |
| `bulletin` | `bc-planner:bulletin` | Bulletin announcements | No | `bulletin_announcements` |
| `goals` | `bc-planner:goals` | Ministry goals | No | `goals` |
| `roadmap` | `bc-planner:roadmap` | 24-month roadmap | No | `roadmap_items` |

## Phase 2 migration approach

1. Add authentication and role checks to every `/api/collections/:collection` request.
2. Replace the `useLocalStorage` helper with a data hook that reads/writes the corresponding D1-backed endpoint.
3. Provide a one-time import tool that can read existing `bc-planner:*` browser data and POST it to D1 only after an authorized user confirms migration.
4. Remove sensitive reads/writes from localStorage. Public/non-sensitive UI preferences may remain local only if explicitly separated from ministry records.
