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

export const ROLE_OPTIONS = Object.freeze([
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN], description: 'Can administer settings and future data migration.' },
  { value: ROLES.PASTOR_LEADER, label: ROLE_LABELS[ROLES.PASTOR_LEADER], description: 'Can manage ministry workflows and sensitive care areas.' },
  { value: ROLES.VOLUNTEER_VIEWER, label: ROLE_LABELS[ROLES.VOLUNTEER_VIEWER], description: 'Can view general ministry workflows only.' }
]);

export const SENSITIVE_ACCESS_AREAS = Object.freeze([
  { label: 'Care', roles: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  { label: 'Prayer', roles: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  { label: 'Visitors', roles: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  { label: 'Contact logs', roles: [ROLES.ADMIN, ROLES.PASTOR_LEADER] },
  { label: 'Attendance/giving', roles: [ROLES.ADMIN, ROLES.PASTOR_LEADER] }
]);
