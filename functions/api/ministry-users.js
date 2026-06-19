import { ROLES, requireRole } from '../_shared/auth.js';
import { createMinistryUser, listMinistryUsers, validateMinistryUserPayload } from '../_shared/ministry-users.js';
import { json, readBody } from '../_shared/planning-api.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const roleError = requireRole(data?.authUser, ROLES.ADMIN);
  if (roleError) return roleError;
  if (!env.DB) return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });

  if (request.method === 'GET') return json({ users: await listMinistryUsers(env.DB) });

  if (request.method === 'POST') {
    const body = await readBody(request);
    const invalid = validateMinistryUserPayload(body);
    if (invalid) return json({ error: invalid }, { status: 400 });
    try {
      return json({ user: await createMinistryUser(env.DB, body) }, { status: 201 });
    } catch (error) {
      return json({ error: 'Unable to create ministry user. Confirm the email is not already used.' }, { status: 400 });
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'GET, POST' } });
}
