import { ROLES, requireRole } from './auth.js';

export const PLANNING_COLLECTIONS = Object.freeze({
  rhythm: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  tasks: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  events: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  annualPlan: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  roadmap: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  goals: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  series: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  services: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY },
  bulletin: { minimumRole: ROLES.VOLUNTEER_VIEW_ONLY }
});

export const BLOCKED_COLLECTIONS = Object.freeze({
  stats: 'Attendance, statistics, and giving remain localStorage-only until Phase 2C.',
  people: 'People records remain localStorage-only until Phase 2C.',
  absences: 'Absence records remain localStorage-only until Phase 2C.',
  visitors: 'Visitor records remain localStorage-only until Phase 2C.',
  prayers: 'Prayer requests remain localStorage-only until Phase 2C.',
  contacts: 'Pastoral contacts remain localStorage-only until Phase 2C.',
  settings: 'Organization settings are not part of the Phase 2B planning migration.'
});

export const json = (body, init = {}) => Response.json(body, {
  ...init,
  headers: { 'cache-control': 'no-store', ...(init.headers || {}) }
});

export function getCollectionAccess(collection, authUser) {
  if (BLOCKED_COLLECTIONS[collection]) {
    return { response: json({ error: 'Collection intentionally blocked from API migration', collection, message: BLOCKED_COLLECTIONS[collection] }, { status: 403 }) };
  }
  const config = PLANNING_COLLECTIONS[collection];
  if (!config) return { response: json({ error: 'Unknown collection' }, { status: 404 }) };
  const roleError = requireRole(authUser, config.minimumRole);
  if (roleError) return { response: roleError };
  return { config };
}

function validateRow(collection, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Row must be an object.';
  if (row.id != null && typeof row.id !== 'string') return 'Row id must be a string.';
  const titleCollections = new Set(['tasks', 'events', 'annualPlan', 'roadmap', 'series']);
  if (titleCollections.has(collection) && !String(row.title || '').trim()) return 'A title is required.';
  if (collection === 'rhythm' && !String(row.day || '').trim()) return 'A day is required.';
  if (collection === 'goals' && !String(row.label || '').trim()) return 'A goal label is required.';
  if (collection === 'services' && !String(row.date || row.service_date || '').trim()) return 'A service date is required.';
  if (collection === 'bulletin' && row.announcements && !Array.isArray(row.announcements)) return 'Bulletin announcements must be an array.';
  return null;
}

export async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

export function validatePayload(collection, payload, { partial = false } = {}) {
  if (collection === 'bulletin' && payload && !Array.isArray(payload)) {
    const message = validateRow(collection, payload);
    return message ? { error: message } : null;
  }
  const rows = Array.isArray(payload) ? payload : [payload];
  if (!partial && !rows.length) return { error: 'At least one row is required.' };
  for (const row of rows) {
    const message = validateRow(collection, row);
    if (message) return { error: message };
  }
  return null;
}

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export async function listRecords(db, collection) {
  const { results } = await db.prepare('SELECT id, data_json FROM planning_collection_records WHERE collection = ? ORDER BY sort_order, updated_at DESC').bind(collection).all();
  const rows = (results || []).map(r => ({ id: r.id, ...JSON.parse(r.data_json || '{}') }));
  return collection === 'bulletin' ? (rows[0] || { announcements: [] }) : rows;
}

async function audit(db, { user, collection, action, id, metadata }) {
  try {
    await db.prepare('INSERT INTO audit_log (id, action, entity_table, entity_id, metadata_json) VALUES (?, ?, ?, ?, ?)')
      .bind(newId(), action, `planning:${collection}`, id || null, JSON.stringify({ actorEmail: user?.email || null, ...metadata })).run();
  } catch {}
}

export async function replaceCollection(db, collection, payload, user) {
  const rows = collection === 'bulletin' ? [{ id: 'bulletin', ...payload }] : payload;
  const batch = [db.prepare('DELETE FROM planning_collection_records WHERE collection = ?').bind(collection)];
  rows.forEach((row, index) => {
    const id = row.id || newId();
    const stored = { ...row, id };
    batch.push(db.prepare('INSERT INTO planning_collection_records (id, collection, data_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, collection, JSON.stringify(stored), index, now(), now()));
  });
  await db.batch(batch);
  await audit(db, { user, collection, action: 'replace', metadata: { count: rows.length } });
  return listRecords(db, collection);
}

export async function createRecord(db, collection, payload, user) {
  const id = payload.id || newId();
  const stored = { ...payload, id };
  await db.prepare('INSERT INTO planning_collection_records (id, collection, data_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, collection, JSON.stringify(stored), Date.now(), now(), now()).run();
  await audit(db, { user, collection, action: 'create', id });
  return stored;
}

export async function updateRecord(db, collection, id, payload, user) {
  const existing = await db.prepare('SELECT data_json FROM planning_collection_records WHERE collection = ? AND id = ?').bind(collection, id).first();
  if (!existing) return null;
  const stored = { ...JSON.parse(existing.data_json || '{}'), ...payload, id };
  await db.prepare('UPDATE planning_collection_records SET data_json = ?, updated_at = ? WHERE collection = ? AND id = ?')
    .bind(JSON.stringify(stored), now(), collection, id).run();
  await audit(db, { user, collection, action: 'update', id });
  return stored;
}

export async function deleteRecord(db, collection, id, user) {
  const result = await db.prepare('DELETE FROM planning_collection_records WHERE collection = ? AND id = ?').bind(collection, id).run();
  await audit(db, { user, collection, action: 'delete', id });
  return result.meta?.changes > 0;
}
