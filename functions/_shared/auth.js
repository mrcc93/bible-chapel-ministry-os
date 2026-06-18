export const ROLES = Object.freeze({
  ADMIN: 'admin',
  PASTOR_LEADER: 'pastor_leader',
  VOLUNTEER_VIEW_ONLY: 'volunteer_view_only'
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.PASTOR_LEADER]: 'Pastor/Leader',
  [ROLES.VOLUNTEER_VIEW_ONLY]: 'Volunteer/View Only'
});

const ROLE_RANK = Object.freeze({
  [ROLES.VOLUNTEER_VIEW_ONLY]: 1,
  [ROLES.PASTOR_LEADER]: 2,
  [ROLES.ADMIN]: 3
});

const json = (body, init = {}) => Response.json(body, {
  ...init,
  headers: {
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

const splitList = value => String(value || '')
  .split(',')
  .map(item => item.trim().toLowerCase())
  .filter(Boolean);

const parseRoleMap = env => {
  if (!env.AUTH_ROLE_MAP) return {};
  try {
    return JSON.parse(env.AUTH_ROLE_MAP);
  } catch {
    return {};
  }
};

export function getAccessUser(request, env = {}) {
  const email = request.headers.get('cf-access-authenticated-user-email');
  const jwt = request.headers.get('cf-access-jwt-assertion');

  if (!email || !jwt) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const roleMap = parseRoleMap(env);
  const mappedRole = roleMap[normalizedEmail];
  const adminEmails = splitList(env.ACCESS_ADMIN_EMAILS);
  const pastorLeaderEmails = splitList(env.ACCESS_PASTOR_LEADER_EMAILS);
  const volunteerEmails = splitList(env.ACCESS_VOLUNTEER_EMAILS);

  let role = ROLES.VOLUNTEER_VIEW_ONLY;
  if (mappedRole && ROLE_RANK[mappedRole]) {
    role = mappedRole;
  } else if (adminEmails.includes(normalizedEmail)) {
    role = ROLES.ADMIN;
  } else if (pastorLeaderEmails.includes(normalizedEmail)) {
    role = ROLES.PASTOR_LEADER;
  } else if (volunteerEmails.includes(normalizedEmail)) {
    role = ROLES.VOLUNTEER_VIEW_ONLY;
  }

  return {
    email,
    role,
    roleLabel: ROLE_LABELS[role],
    accessAuthenticated: true
  };
}

function getLocalBypassUser(env = {}) {
  if (env.CF_PAGES || !env.DEV_AUTH_BYPASS) return null;
  return {
    email: env.DEV_AUTH_EMAIL || 'local-dev@biblechapel.local',
    role: env.DEV_AUTH_ROLE && ROLE_RANK[env.DEV_AUTH_ROLE] ? env.DEV_AUTH_ROLE : ROLES.ADMIN,
    roleLabel: ROLE_LABELS[env.DEV_AUTH_ROLE] || ROLE_LABELS[ROLES.ADMIN],
    accessAuthenticated: false,
    devAuthBypass: true
  };
}

export function requireAuth(context) {
  const user = getAccessUser(context.request, context.env) || getLocalBypassUser(context.env);

  if (!user) {
    return {
      response: json({
        error: 'Authentication required',
        message: 'Protect /api/* with Cloudflare Access so requests include verified Access identity headers.'
      }, { status: 401 })
    };
  }

  context.data = context.data || {};
  context.data.authUser = user;
  return { user };
}

export function hasRole(user, minimumRole) {
  return Boolean(user && ROLE_RANK[user.role] >= ROLE_RANK[minimumRole]);
}

export function requireRole(user, minimumRole) {
  if (hasRole(user, minimumRole)) {
    return null;
  }

  return json({
    error: 'Forbidden',
    message: `${ROLE_LABELS[minimumRole]} access is required for this collection.`,
    requiredRole: minimumRole,
    currentRole: user?.role || null
  }, { status: 403 });
}
