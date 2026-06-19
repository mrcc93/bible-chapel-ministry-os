/**
 * Local app collection registry.
 *
 * Phase 1 keeps the current localStorage-backed UI intact. This registry is the
 * bridge for Phase 2, when each collection will be loaded and saved through
 * authenticated Cloudflare Pages Functions backed by D1.
 */
export const COLLECTIONS = Object.freeze({
  settings: { storageKey: 'bc-planner:settings', d1Table: 'organizations', sensitive: false },
  rhythm: { apiBackedPhase2B: true, storageKey: 'bc-planner:rhythm', d1Table: 'weekly_rhythm_days', sensitive: false },
  tasks: { apiBackedPhase2B: true, storageKey: 'bc-planner:tasks', d1Table: 'tasks', sensitive: false },
  stats: { apiBackedFinalPhase: true, storageKey: 'bc-planner:stats', d1Table: 'attendance_stats', sensitive: true },
  events: { apiBackedPhase2B: true, storageKey: 'bc-planner:events', d1Table: 'ministry_events', sensitive: false },
  annualPlan: { apiBackedPhase2B: true, storageKey: 'bc-planner:annualPlan', d1Table: 'annual_priorities', sensitive: false },
  services: { apiBackedPhase2B: true, storageKey: 'bc-planner:services', d1Table: 'services/service_order_items', sensitive: false },
  people: { apiBackedPhase2C: true, storageKey: 'bc-planner:people', d1Table: 'people', sensitive: true },
  absences: { apiBackedPhase2C: true, storageKey: 'bc-planner:absences', d1Table: 'volunteer_absences', sensitive: true },
  visitors: { apiBackedPhase2C: true, storageKey: 'bc-planner:visitors', d1Table: 'visitors', sensitive: true },
  prayers: { apiBackedPhase2C: true, storageKey: 'bc-planner:prayers', d1Table: 'prayer_requests', sensitive: true },
  contacts: { apiBackedPhase2C: true, storageKey: 'bc-planner:contacts', d1Table: 'pastoral_contacts', sensitive: true },
  series: { apiBackedPhase2B: true, storageKey: 'bc-planner:series', d1Table: 'sermon_series', sensitive: false },
  bulletin: { apiBackedPhase2B: true, storageKey: 'bc-planner:bulletin', d1Table: 'bulletin_announcements', sensitive: false },
  goals: { apiBackedPhase2B: true, storageKey: 'bc-planner:goals', d1Table: 'goals', sensitive: false },
  roadmap: { apiBackedPhase2B: true, storageKey: 'bc-planner:roadmap', d1Table: 'roadmap_items', sensitive: false }
});

export const collectionNames = Object.freeze(Object.keys(COLLECTIONS));

export function assertCollectionName(name) {
  if (!Object.prototype.hasOwnProperty.call(COLLECTIONS, name)) {
    throw new Error(`Unknown Bible Chapel collection: ${name}`);
  }
  return name;
}
