import { ROLES, requireRole } from './auth.js';

const ORG_ID = 'default';

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

const intBool = value => value ? 1 : 0;
const fromBool = value => Boolean(value);
const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const clean = value => String(value || '').trim();

const scalarConfigs = {
  rhythm: {
    table: 'weekly_rhythm_days', order: 'sort_order, day', required: ['day'],
    toDb: (row, index) => ({ id: row.id || newId(), organization_id: ORG_ID, day: clean(row.day), title: clean(row.title), focus: row.focus || '', protected_rest: intBool(row.protectedRest), sort_order: index }),
    fromDb: row => ({ id: row.id, day: row.day, title: row.title, focus: row.focus, protectedRest: fromBool(row.protected_rest) })
  },
  tasks: {
    table: 'tasks', order: 'done, due_date, created_at DESC', required: ['title'],
    toDb: row => ({ id: row.id || newId(), organization_id: ORG_ID, title: clean(row.title), day: row.day || null, lane: row.lane || null, due_date: row.due || null, done: intBool(row.done) }),
    fromDb: row => ({ id: row.id, title: row.title, day: row.day || '', lane: row.lane || '', due: row.due_date || '', done: fromBool(row.done) })
  },
  events: {
    table: 'ministry_events', order: 'event_date, event_time', required: ['title', 'date'],
    toDb: row => ({ id: row.id || newId(), organization_id: ORG_ID, title: clean(row.title), event_date: row.date || null, event_time: row.time || null, type: row.type || null, owner: row.owner || null, notes: row.notes || null }),
    fromDb: row => ({ id: row.id, title: row.title, date: row.event_date, time: row.event_time || '', type: row.type || '', owner: row.owner || '', notes: row.notes || '' })
  },
  annualPlan: {
    table: 'annual_priorities', order: 'year, target_date, season', required: ['year', 'title'],
    toDb: row => ({ id: row.id || newId(), organization_id: ORG_ID, year: clean(row.year), season: row.season || null, title: clean(row.title), lane: row.lane || null, target_date: row.targetDate || null, owner: row.owner || null, status: row.status || null, notes: row.notes || null }),
    fromDb: row => ({ id: row.id, year: row.year, season: row.season || '', title: row.title, lane: row.lane || '', targetDate: row.target_date || '', owner: row.owner || '', status: row.status || '', notes: row.notes || '' })
  },
  goals: {
    table: 'goals', order: 'created_at', required: ['label'],
    toDb: row => ({ id: row.id || newId(), organization_id: ORG_ID, label: clean(row.label), target: Number(row.target) || 0, current: Number(row.current) || 0, horizon: row.horizon || null }),
    fromDb: row => ({ id: row.id, label: row.label, target: row.target, current: row.current, horizon: row.horizon || '' })
  },
  roadmap: {
    table: 'roadmap_items', order: 'sort_order, month', required: ['month', 'title'],
    toDb: (row, index) => ({ id: row.id || newId(), organization_id: ORG_ID, month: clean(row.month), title: clean(row.title), action: row.action || null, goal: row.goal || null, status: row.status || 'Not started', sort_order: index }),
    fromDb: row => ({ id: row.id, month: row.month, title: row.title, action: row.action || '', goal: row.goal || '', status: row.status || 'Not started' })
  }
};

function validateRow(collection, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Row must be an object.';
  if (row.id != null && typeof row.id !== 'string') return 'Row id must be a string.';
  if (collection === 'bulletin') return row.announcements && !Array.isArray(row.announcements) ? 'Bulletin announcements must be an array.' : null;
  if (collection === 'services') return !String(row.date || '').trim() ? 'A service date is required.' : null;
  if (collection === 'series') return !String(row.title || '').trim() ? 'A series title is required.' : null;
  const config = scalarConfigs[collection];
  for (const field of config?.required || []) if (!String(row[field] || '').trim()) return `${field} is required.`;
  return null;
}

function validatePartialRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Row must be an object.';
  if (row.id != null && typeof row.id !== 'string') return 'Row id must be a string.';
  return null;
}

export function validatePayload(collection, payload, { partial = false } = {}) {
  if (collection === 'bulletin' && payload && !Array.isArray(payload)) {
    const message = validateRow(collection, payload);
    return message ? { error: message } : null;
  }
  const rows = Array.isArray(payload) ? payload : [payload];
  if (!partial && !rows.length) return { error: 'At least one row is required.' };
  for (const row of rows) {
    const message = partial ? validatePartialRow(row) : validateRow(collection, row);
    if (message) return { error: message };
  }
  return null;
}

export async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

export function getCollectionAccess(collection, authUser) {
  if (BLOCKED_COLLECTIONS[collection]) return { response: json({ error: 'Collection intentionally blocked from API migration', collection, message: BLOCKED_COLLECTIONS[collection] }, { status: 403 }) };
  const config = PLANNING_COLLECTIONS[collection];
  if (!config) return { response: json({ error: 'Unknown collection' }, { status: 404 }) };
  const roleError = requireRole(authUser, config.minimumRole);
  if (roleError) return { response: roleError };
  return { config };
}

async function ensureOrg(db) {
  await db.prepare('INSERT OR IGNORE INTO organizations (id, name) VALUES (?, ?)').bind(ORG_ID, 'Bible Chapel').run();
}

async function audit(db, { user, collection, action, id, metadata = {} }) {
  try {
    await db.prepare('INSERT INTO audit_log (id, organization_id, action, entity_table, entity_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(newId(), ORG_ID, action, collection, id || null, JSON.stringify({ actorEmail: user?.email || null, ...metadata })).run();
  } catch {}
}

const columns = obj => Object.keys(obj);
async function insertTyped(db, table, row) {
  const cols = columns(row);
  await db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map(c => row[c])).run();
}
async function updateTyped(db, table, id, row) {
  const cols = columns(row).filter(c => c !== 'id');
  await db.prepare(`UPDATE ${table} SET ${cols.map(c => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).bind(...cols.map(c => row[c]), now(), id).run();
}

async function listScalar(db, collection) {
  const config = scalarConfigs[collection];
  const { results } = await db.prepare(`SELECT * FROM ${config.table} WHERE organization_id = ? ORDER BY ${config.order}`).bind(ORG_ID).all();
  return (results || []).map(config.fromDb);
}

async function replaceScalar(db, collection, rows, user) {
  const config = scalarConfigs[collection];
  await ensureOrg(db);
  const batch = [db.prepare(`DELETE FROM ${config.table} WHERE organization_id = ?`).bind(ORG_ID)];
  rows.forEach((row, index) => {
    const dbRow = config.toDb(row, index);
    const cols = columns(dbRow);
    batch.push(db.prepare(`INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map(c => dbRow[c])));
  });
  await db.batch(batch);
  await audit(db, { user, collection, action: 'replace', metadata: { count: rows.length } });
  return listScalar(db, collection);
}

async function createScalar(db, collection, payload, user) {
  const config = scalarConfigs[collection];
  await ensureOrg(db);
  const dbRow = config.toDb(payload, Date.now());
  await insertTyped(db, config.table, dbRow);
  await audit(db, { user, collection, action: 'create', id: dbRow.id });
  return config.fromDb(dbRow);
}

async function updateScalar(db, collection, id, payload, user) {
  const config = scalarConfigs[collection];
  const existing = await db.prepare(`SELECT * FROM ${config.table} WHERE organization_id = ? AND id = ?`).bind(ORG_ID, id).first();
  if (!existing) return null;
  const merged = { ...config.fromDb(existing), ...payload, id };
  const dbRow = config.toDb(merged, existing.sort_order || 0);
  await updateTyped(db, config.table, id, dbRow);
  await audit(db, { user, collection, action: 'update', id });
  return config.fromDb(dbRow);
}

async function deleteScalar(db, collection, id, user) {
  const config = scalarConfigs[collection];
  const result = await db.prepare(`DELETE FROM ${config.table} WHERE organization_id = ? AND id = ?`).bind(ORG_ID, id).run();
  if (result.meta?.changes) await audit(db, { user, collection, action: 'delete', id });
  return result.meta?.changes > 0;
}

async function listSeries(db) {
  const { results: seriesRows } = await db.prepare('SELECT * FROM sermon_series WHERE organization_id = ? ORDER BY start_date, title').bind(ORG_ID).all();
  const { results: sermons } = await db.prepare('SELECT sermons.*, sermon_series.organization_id FROM sermons JOIN sermon_series ON sermon_series.id = sermons.series_id WHERE sermon_series.organization_id = ? ORDER BY sort_order, sermon_date').bind(ORG_ID).all();
  return (seriesRows || []).map(row => ({
    id: row.id, title: row.title, startDate: row.start_date || '', scripture: row.scripture || '', theme: row.theme || row.description || '',
    sermons: (sermons || []).filter(s => s.series_id === row.id).map(s => ({ id: s.id, seriesId: s.series_id, series_id: s.series_id, seriesTitle: row.title, date: s.sermon_date || '', title: s.title, passage: s.passage || '', scripture: s.passage || '', bigIdea: s.big_idea || '', theme: s.big_idea || '', notes: s.big_idea || '' }))
  }));
}

async function replaceSeries(db, rows, user) {
  await ensureOrg(db);
  const batch = [db.prepare('DELETE FROM sermon_series WHERE organization_id = ?').bind(ORG_ID)];
  rows.forEach((row, index) => {
    const id = row.id || newId();
    batch.push(db.prepare('INSERT INTO sermon_series (id, organization_id, title, start_date, scripture, theme, description) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, ORG_ID, clean(row.title), row.startDate || null, row.scripture || null, row.theme || null, row.theme || row.scripture || null));
    (row.sermons || []).forEach((sermon, sermonIndex) => batch.push(db.prepare('INSERT INTO sermons (id, series_id, sermon_date, title, passage, big_idea, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(sermon.id || newId(), id, sermon.date || null, clean(sermon.title), (sermon.passage || sermon.scripture) || null, (sermon.bigIdea || sermon.theme || sermon.notes) || null, sermonIndex)));
  });
  await db.batch(batch);
  await audit(db, { user, collection: 'series', action: 'replace', metadata: { count: rows.length } });
  return listSeries(db);
}

async function listServices(db) {
  const { results: services } = await db.prepare('SELECT * FROM services WHERE organization_id = ? ORDER BY service_date DESC').bind(ORG_ID).all();
  const { results: order } = await db.prepare('SELECT * FROM service_order_items ORDER BY sort_order').all();
  const { results: songs } = await db.prepare('SELECT * FROM service_songs ORDER BY sort_order').all();
  const { results: slides } = await db.prepare('SELECT * FROM service_slides ORDER BY sort_order').all();
  return (services || []).map(s => ({
    id: s.id, date: s.service_date, title: s.title || '', preacher: s.preacher || '', scripture: s.scripture || '', theme: s.theme || '', notes: s.notes || '', sermonId: s.sermon_id || '', sermonTitle: s.sermon_title || '', seriesId: s.series_id || '', seriesTitle: s.series_title || '',
    order: (order || []).filter(o => o.service_id === s.id).map(o => ({ id: o.id, label: o.label, note: o.note || '' })),
    songs: (songs || []).filter(song => song.service_id === s.id).map(song => ({ id: song.id, title: song.title, key: song.song_key || '', ccli: song.ccli || '', author: song.author || '', slide: fromBool(song.include_slide) })),
    slides: (slides || []).filter(slide => slide.service_id === s.id).map(slide => ({ id: slide.id, type: slide.slide_type || '', title: slide.title || '', body: slide.body || '' }))
  }));
}

async function replaceServices(db, rows, user) {
  await ensureOrg(db);
  const batch = [db.prepare('DELETE FROM services WHERE organization_id = ?').bind(ORG_ID)];
  rows.forEach(service => {
    const id = service.id || newId();
    batch.push(db.prepare('INSERT INTO services (id, organization_id, service_date, title, preacher, scripture, theme, notes, sermon_id, sermon_title, series_id, series_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, ORG_ID, service.date, service.title || null, service.preacher || null, service.scripture || null, service.theme || null, service.notes || null, service.sermonId || null, service.sermonTitle || null, service.seriesId || null, service.seriesTitle || null));
    (service.order || []).forEach((item, index) => batch.push(db.prepare('INSERT INTO service_order_items (id, service_id, label, note, sort_order) VALUES (?, ?, ?, ?, ?)')
      .bind(item.id || newId(), id, clean(item.label), item.note || null, index)));
    (service.songs || []).forEach((song, index) => batch.push(db.prepare('INSERT INTO service_songs (id, service_id, title, song_key, ccli, author, include_slide, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(song.id || newId(), id, clean(song.title), song.key || null, song.ccli || null, song.author || null, intBool(song.slide !== false), index)));
    (service.slides || []).forEach((slide, index) => batch.push(db.prepare('INSERT INTO service_slides (id, service_id, slide_type, title, body, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(slide.id || newId(), id, slide.type || null, slide.title || null, slide.body || null, index)));
  });
  await db.batch(batch);
  await audit(db, { user, collection: 'services', action: 'replace', metadata: { count: rows.length } });
  return listServices(db);
}

async function listBulletin(db) {
  const { results } = await db.prepare('SELECT * FROM bulletin_announcements WHERE organization_id = ? ORDER BY sort_order, created_at').bind(ORG_ID).all();
  return { announcements: (results || []).map(row => ({ id: row.id, title: row.title, text: row.body || row.title || '', body: row.body || '' })) };
}
async function replaceBulletin(db, payload, user) {
  await ensureOrg(db);
  const announcements = payload.announcements || [];
  const batch = [db.prepare('DELETE FROM bulletin_announcements WHERE organization_id = ?').bind(ORG_ID)];
  announcements.forEach((row, index) => batch.push(db.prepare('INSERT INTO bulletin_announcements (id, organization_id, title, body, sort_order) VALUES (?, ?, ?, ?, ?)')
    .bind(row.id || newId(), ORG_ID, clean(row.title || row.text), row.body || row.text || null, index)));
  await db.batch(batch);
  await audit(db, { user, collection: 'bulletin', action: 'replace', metadata: { count: announcements.length } });
  return listBulletin(db);
}

export async function listRecords(db, collection) {
  if (scalarConfigs[collection]) return listScalar(db, collection);
  if (collection === 'series') return listSeries(db);
  if (collection === 'services') return listServices(db);
  if (collection === 'bulletin') return listBulletin(db);
  return [];
}

export async function replaceCollection(db, collection, payload, user) {
  if (scalarConfigs[collection]) return replaceScalar(db, collection, payload, user);
  if (collection === 'series') return replaceSeries(db, payload, user);
  if (collection === 'services') return replaceServices(db, payload, user);
  if (collection === 'bulletin') return replaceBulletin(db, payload, user);
  return null;
}

export async function createRecord(db, collection, payload, user) {
  if (scalarConfigs[collection]) return createScalar(db, collection, payload, user);
  const rows = await replaceCollection(db, collection, collection === 'bulletin' ? payload : [payload], user);
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateRecord(db, collection, id, payload, user) {
  if (scalarConfigs[collection]) return updateScalar(db, collection, id, payload, user);
  const rows = await listRecords(db, collection);
  if (!Array.isArray(rows)) return null;
  const found = rows.some(row => row.id === id);
  if (!found) return null;
  return (await replaceCollection(db, collection, rows.map(row => row.id === id ? { ...row, ...payload, id } : row), user)).find(row => row.id === id);
}

export async function deleteRecord(db, collection, id, user) {
  if (scalarConfigs[collection]) return deleteScalar(db, collection, id, user);
  const rows = await listRecords(db, collection);
  if (!Array.isArray(rows) || !rows.some(row => row.id === id)) return false;
  await replaceCollection(db, collection, rows.filter(row => row.id !== id), user);
  await audit(db, { user, collection, action: 'delete', id });
  return true;
}
