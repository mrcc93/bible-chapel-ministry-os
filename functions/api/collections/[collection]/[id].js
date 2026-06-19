import { deleteRecord, getCollectionAccess, json, readBody, updateRecord, validatePayload } from '../../../_shared/planning-api.js';

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const collection = params.collection;
  const id = params.id;
  const access = getCollectionAccess(collection, data?.authUser, request.method);
  if (access.response) return access.response;
  if (!env.DB) return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });

  if (request.method === 'PATCH' || request.method === 'PUT') {
    const body = await readBody(request);
    const invalid = validatePayload(collection, { ...body, id }, { partial: request.method === 'PATCH' });
    if (invalid) return json(invalid, { status: 400 });
    const updated = await updateRecord(env.DB, collection, id, body, data?.authUser);
    if (!updated) return json({ error: 'Record not found' }, { status: 404 });
    return json({ collection, data: updated });
  }

  if (request.method === 'DELETE') {
    const deleted = await deleteRecord(env.DB, collection, id, data?.authUser);
    if (!deleted) return json({ error: 'Record not found' }, { status: 404 });
    return json({ collection, deleted: true });
  }

  return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'PUT, PATCH, DELETE' } });
}
