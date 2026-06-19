import { BLOCKED_COLLECTIONS, PLANNING_COLLECTIONS, json } from '../_shared/planning-api.js';

const REQUIRED_PLANNING_TABLES = Object.freeze([
  'weekly_rhythm_days',
  'tasks',
  'ministry_events',
  'annual_priorities',
  'roadmap_items',
  'goals',
  'sermon_series',
  'sermons',
  'services',
  'service_order_items',
  'service_songs',
  'service_slides',
  'bulletin_announcements',
  'ministry_users'
]);

async function checkD1Schema(db) {
  if (!db) {
    return {
      bindingAvailable: false,
      migrationsApplied: false,
      missingTables: REQUIRED_PLANNING_TABLES
    };
  }

  try {
    const placeholders = REQUIRED_PLANNING_TABLES.map(() => '?').join(', ');
    const { results = [] } = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`
    ).bind(...REQUIRED_PLANNING_TABLES).all();
    const found = new Set(results.map(row => row.name));
    const missingTables = REQUIRED_PLANNING_TABLES.filter(table => !found.has(table));

    return {
      bindingAvailable: true,
      migrationsApplied: missingTables.length === 0,
      missingTables
    };
  } catch (error) {
    return {
      bindingAvailable: true,
      migrationsApplied: false,
      missingTables: REQUIRED_PLANNING_TABLES,
      error: 'D1 binding is present, but the schema check failed. Confirm migrations have been applied.'
    };
  }
}

export async function onRequestGet(context) {
  const authUser = context.data?.authUser;
  const d1 = await checkD1Schema(context.env.DB);

  return json({
    ok: Boolean(authUser && d1.bindingAvailable),
    auth: {
      detected: Boolean(authUser),
      accessAuthenticated: Boolean(authUser?.accessAuthenticated),
      devAuthBypass: Boolean(authUser?.devAuthBypass),
      roleDetected: Boolean(authUser?.role),
      role: authUser?.role || null,
      roleLabel: authUser?.roleLabel || null,
      roleSource: authUser?.roleSource || null,
      ministryUserId: authUser?.ministryUserId || null
    },
    d1,
    planningApi: {
      enabled: true,
      collections: Object.keys(PLANNING_COLLECTIONS),
      typedTablesOnly: true,
      jsonBlobStorage: false
    },
    ministryUsers: {
      enabled: true,
      roleSource: authUser?.roleSource || null,
      managedInApp: true
    },
    sensitiveCollections: {
      blockedFromApiMigration: true,
      localStorageOnly: Object.keys(BLOCKED_COLLECTIONS).filter(collection => collection !== 'settings')
    }
  });
}
