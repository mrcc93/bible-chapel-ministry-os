import { ROLES, ROLE_LABELS } from './auth.js';

export const MINISTRY_USER_ROLES = Object.freeze(Object.values(ROLES));

export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export const clean = value => String(value || '').trim();
export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const fromBool = value => Boolean(value);
export const toBoolInt = value => value ? 1 : 0;

export function serializeMinistryUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] || row.role,
    active: fromBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function validateMinistryUserPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'User payload must be an object.';
  if (!partial || payload.email != null) {
    const email = normalizeEmail(payload.email);
    if (!email || !email.includes('@')) return 'A valid email is required.';
  }
  if (!partial || payload.displayName != null) {
    if (!clean(payload.displayName)) return 'Display name is required.';
  }
  if (!partial || payload.role != null) {
    if (!MINISTRY_USER_ROLES.includes(payload.role)) return 'A valid role is required.';
  }
  if (payload.active != null && typeof payload.active !== 'boolean') return 'Active must be a boolean.';
  return null;
}

export async function findActiveMinistryUserByEmail(db, email) {
  if (!db || !email) return null;
  try {
    const row = await db.prepare('SELECT * FROM ministry_users WHERE lower(email) = ? AND active = 1 LIMIT 1').bind(normalizeEmail(email)).first();
    return serializeMinistryUser(row);
  } catch {
    return null;
  }
}

export async function listMinistryUsers(db) {
  const { results = [] } = await db.prepare('SELECT * FROM ministry_users ORDER BY active DESC, display_name COLLATE NOCASE, email COLLATE NOCASE').all();
  return results.map(serializeMinistryUser);
}

export async function createMinistryUser(db, payload) {
  const timestamp = now();
  const id = payload.id || newId();
  await db.prepare('INSERT INTO ministry_users (id, email, display_name, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, normalizeEmail(payload.email), clean(payload.displayName), payload.role, toBoolInt(payload.active !== false), timestamp, timestamp).run();
  return serializeMinistryUser(await db.prepare('SELECT * FROM ministry_users WHERE id = ?').bind(id).first());
}

export async function updateMinistryUser(db, id, payload) {
  const existing = await db.prepare('SELECT * FROM ministry_users WHERE id = ?').bind(id).first();
  if (!existing) return null;
  const updated = {
    email: payload.email == null ? existing.email : normalizeEmail(payload.email),
    display_name: payload.displayName == null ? existing.display_name : clean(payload.displayName),
    role: payload.role == null ? existing.role : payload.role,
    active: payload.active == null ? existing.active : toBoolInt(payload.active),
    updated_at: now()
  };
  await db.prepare('UPDATE ministry_users SET email = ?, display_name = ?, role = ?, active = ?, updated_at = ? WHERE id = ?')
    .bind(updated.email, updated.display_name, updated.role, updated.active, updated.updated_at, id).run();
  return serializeMinistryUser(await db.prepare('SELECT * FROM ministry_users WHERE id = ?').bind(id).first());
}
