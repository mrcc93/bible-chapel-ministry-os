const ROLE_ALIASES = {
  admin: 'admin',
  pastor: 'pastor_leader',
  leader: 'pastor_leader',
  pastor_leader: 'pastor_leader',
  volunteer: 'volunteer_viewer',
  viewer: 'volunteer_viewer',
  view_only: 'volunteer_viewer',
  volunteer_viewer: 'volunteer_viewer'
};

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  PASTOR_LEADER: 'pastor_leader',
  VOLUNTEER_VIEWER: 'volunteer_viewer'
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PASTOR_LEADER]: 'Pastor/Leader',
  [ROLES.VOLUNTEER_VIEWER]: 'Volunteer/View Only'
});

export const COLLECTION_ACCESS = Object.freeze({
  settings: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN] },
  rhythm: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  tasks: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  stats: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Attendance/giving' },
  events: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  annualPlan: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  services: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  people: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Care' },
  absences: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Care' },
  visitors: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Visitors' },
  prayers: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Prayer' },
  contacts: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER], sensitiveArea: 'Contact logs' },
  series: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  bulletin: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  goals: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  roadmap: { read: [ROLES.ADMIN, ROLES.PASTOR_LEADER, ROLES.VOLUNTEER_VIEWER], write: [ROLES.ADMIN, ROLES.PASTOR_LEADER] }
});

const json = (body, init = {}) => Response.json(body, {
  ...init,
  headers: {
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

export function normalizeRole(role) {
  if (!role) return null;
  return ROLE_ALIASES[String(role).trim().toLowerCase()] || null;
}

function parseRoleMap(env) {
  if (!env.AUTH_ROLE_MAP_JSON) return {};
  const parsed = JSON.parse(env.AUTH_ROLE_MAP_JSON);
  return Object.fromEntries(Object.entries(parsed).map(([email, role]) => [email.toLowerCase(), normalizeRole(role)]));
}

function getHeader(request, name) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase());
}

export function getAuthenticatedUser(request, env = {}) {
  const accessEmail = getHeader(request, 'Cf-Access-Authenticated-User-Email');
  const accessJwt = getHeader(request, 'Cf-Access-Jwt-Assertion');
  const devEmail = env.AUTH_ALLOW_DEV_HEADERS === 'true' ? getHeader(request, 'X-BC-Dev-User-Email') : null;
  const email = accessEmail || devEmail;

  if (!email) return null;

  const roleMap = parseRoleMap(env);
  const devRole = env.AUTH_ALLOW_DEV_HEADERS === 'true' ? normalizeRole(getHeader(request, 'X-BC-Dev-Role')) : null;
  const role = roleMap[email.toLowerCase()] || devRole || normalizeRole(env.AUTH_DEFAULT_ROLE) || ROLES.VOLUNTEER_VIEWER;

  return {
    email,
    role,
    provider: accessJwt ? 'cloudflare-access' : (devEmail ? 'local-dev-header' : 'cloudflare-access')
  };
}

export function requireAuth(context) {
  try {
    const user = getAuthenticatedUser(context.request, context.env || {});
    if (!user) {
      return { user: null, response: json({ error: 'Authentication required' }, { status: 401 }) };
    }
    return { user, response: null };
  } catch {
    return { user: null, response: json({ error: 'Invalid authentication configuration' }, { status: 500 }) };
  }
}

export function canAccessCollection(user, collection, action = 'read') {
  const rules = COLLECTION_ACCESS[collection];
  if (!rules || !user?.role) return false;
  return (rules[action] || []).includes(user.role);
}

export function requireCollectionAccess(context, collection, action = 'read') {
  const auth = requireAuth(context);
  if (auth.response) return auth;

  if (!canAccessCollection(auth.user, collection, action)) {
    const rules = COLLECTION_ACCESS[collection];
    return {
      user: auth.user,
      response: json({
        error: 'Forbidden',
        collection,
        action,
        sensitiveArea: rules?.sensitiveArea || null,
        requiredRoles: rules?.[action] || []
      }, { status: 403 })
    };
  }

  return auth;
}
