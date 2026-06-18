import { createRecord, getCollectionAccess, json, listRecords, readBody, replaceCollection, validatePayload } from '../../_shared/planning-api.js';

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const collection = params.collection;
  const access = getCollectionAccess(collection, data?.authUser);
  if (access.response) return access.response;
  if (!env.DB) return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });

  if (request.method === 'GET') return json({ collection, data: await listRecords(env.DB, collection) });

  if (request.method === 'POST') {
    const body = await readBody(request);
    const invalid = validatePayload(collection, body);
    if (invalid) return json(invalid, { status: 400 });
    return json({ collection, data: await createRecord(env.DB, collection, body, data?.authUser) }, { status: 201 });
  }

  if (request.method === 'PUT') {
    const body = await readBody(request);
    const expectsArray = collection !== 'bulletin';
    if (expectsArray && !Array.isArray(body)) return json({ error: 'PUT requires an array replacement payload for this collection.' }, { status: 400 });
    const invalid = validatePayload(collection, body);
    if (invalid) return json(invalid, { status: 400 });
    return json({ collection, data: await replaceCollection(env.DB, collection, body, data?.authUser) });
  }

  return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'GET, POST, PUT' } });
}
