import { COLLECTION_ACCESS, requireCollectionAccess, ROLE_LABELS } from '../../lib/auth.js';

const COLLECTION_TABLES = {
  settings: 'organizations',
  rhythm: 'weekly_rhythm_days',
  tasks: 'tasks',
  stats: 'attendance_stats',
  events: 'ministry_events',
  annualPlan: 'annual_priorities',
  services: 'services',
  people: 'people',
  absences: 'volunteer_absences',
  visitors: 'visitors',
  prayers: 'prayer_requests',
  contacts: 'pastoral_contacts',
  series: 'sermon_series',
  bulletin: 'bulletin_announcements',
  goals: 'goals',
  roadmap: 'roadmap_items'
};

const json = (body, init = {}) => Response.json(body, {
  ...init,
  headers: {
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

const actionForMethod = method => {
  if (method === 'GET' || method === 'HEAD') return 'read';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'write';
  return null;
};

export async function onRequest(context) {
  const { request, env, params } = context;
  const collection = params.collection;
  const table = COLLECTION_TABLES[collection];
  const action = actionForMethod(request.method);

  if (!table || !COLLECTION_ACCESS[collection]) {
    return json({ error: 'Unknown collection' }, { status: 404 });
  }

  if (!action) {
    return json({ error: 'Method not allowed' }, {
      status: 405,
      headers: { allow: 'GET, HEAD, POST, PUT, PATCH, DELETE' }
    });
  }

  const access = requireCollectionAccess(context, collection, action);
  if (access.response) return access.response;

  if (!env.DB) {
    return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });
  }

  return json({
    collection,
    table,
    action,
    authenticatedAs: {
      email: access.user.email,
      role: access.user.role,
      roleLabel: ROLE_LABELS[access.user.role],
      provider: access.user.provider
    },
    accessRules: COLLECTION_ACCESS[collection],
    deferred: true,
    message: 'Authenticated route pattern is ready; D1 CRUD remains deferred so sensitive data is not moved before Phase 2B.'
  }, { status: 501 });
}
