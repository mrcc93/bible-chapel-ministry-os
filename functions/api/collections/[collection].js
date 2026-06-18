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

export async function onRequest(context) {
  const { request, env, params } = context;
  const collection = params.collection;
  const table = COLLECTION_TABLES[collection];

  if (!table) {
    return json({ error: 'Unknown collection' }, { status: 404 });
  }

  if (!env.DB) {
    return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });
  }

  // Phase 2 auth gate: verify the current user/session here before any D1 read
  // or write. Sensitive collections must never be exposed anonymously.
  if (request.method === 'GET') {
    return json({
      collection,
      table,
      deferred: true,
      message: 'D1 schema and route are ready; collection-specific queries will be implemented in Phase 2 after authentication is added.'
    }, { status: 501 });
  }

  return json({ error: 'Method not allowed until Phase 2 data access is implemented.' }, {
    status: 405,
    headers: { allow: 'GET' }
  });
}
