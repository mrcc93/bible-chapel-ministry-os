import { ROLES, requireRole } from '../../_shared/auth.js';

const COLLECTIONS = {
  settings: { table: 'organizations', minimumRole: ROLES.ADMIN },
  rhythm: { table: 'weekly_rhythm_days', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  tasks: { table: 'tasks', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  stats: { table: 'attendance_stats', minimumRole: ROLES.PASTOR_LEADER },
  events: { table: 'ministry_events', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  annualPlan: { table: 'annual_priorities', minimumRole: ROLES.PASTOR_LEADER },
  services: { table: 'services', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  people: { table: 'people', minimumRole: ROLES.PASTOR_LEADER },
  absences: { table: 'volunteer_absences', minimumRole: ROLES.PASTOR_LEADER },
  visitors: { table: 'visitors', minimumRole: ROLES.PASTOR_LEADER },
  prayers: { table: 'prayer_requests', minimumRole: ROLES.PASTOR_LEADER },
  contacts: { table: 'pastoral_contacts', minimumRole: ROLES.PASTOR_LEADER },
  series: { table: 'sermon_series', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  bulletin: { table: 'bulletin_announcements', minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  goals: { table: 'goals', minimumRole: ROLES.PASTOR_LEADER },
  roadmap: { table: 'roadmap_items', minimumRole: ROLES.PASTOR_LEADER }
};

const json = (body, init = {}) => Response.json(body, {
  ...init,
  headers: {
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const collection = params.collection;
  const collectionConfig = COLLECTIONS[collection];

  if (!collectionConfig) {
    return json({ error: 'Unknown collection' }, { status: 404 });
  }

  const authUser = data?.authUser;
  const roleError = requireRole(authUser, collectionConfig.minimumRole);
  if (roleError) return roleError;

  if (!env.DB) {
    return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });
  }

  if (request.method === 'GET') {
    return json({
      collection,
      table: collectionConfig.table,
      minimumRole: collectionConfig.minimumRole,
      authenticatedAs: {
        email: authUser.email,
        role: authUser.role,
        roleLabel: authUser.roleLabel
      },
      deferred: true,
      message: 'Authentication and role checks passed; D1 collection queries remain deferred until the data migration phase.'
    }, { status: 501 });
  }

  return json({ error: 'Method not allowed until Phase 2 data access is implemented.' }, {
    status: 405,
    headers: { allow: 'GET' }
  });
}
