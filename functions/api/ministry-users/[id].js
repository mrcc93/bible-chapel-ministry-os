import { ROLES, requireRole } from '../../_shared/auth.js';
import { updateMinistryUser, validateMinistryUserPayload } from '../../_shared/ministry-users.js';
import { json, readBody } from '../../_shared/planning-api.js';

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const roleError = requireRole(data?.authUser, ROLES.ADMIN);
  if (roleError) return roleError;
  if (!env.DB) return json({ error: 'Cloudflare D1 binding DB is not configured.' }, { status: 500 });

  if (request.method === 'PATCH' || request.method === 'PUT') {
    const body = await readBody(request);
    const invalid = validateMinistryUserPayload(body, { partial: true });
    if (invalid) return json({ error: invalid }, { status: 400 });
    try {
      const user = await updateMinistryUser(env.DB, params.id, body);
      if (!user) return json({ error: 'Ministry user not found' }, { status: 404 });
      return json({ user });
    } catch {
      return json({ error: 'Unable to update ministry user.' }, { status: 400 });
    }
  }

  if (request.method === 'DELETE') {
    const user = await updateMinistryUser(env.DB, params.id, { active: false });
    if (!user) return json({ error: 'Ministry user not found' }, { status: 404 });
    return json({ user });
  }

  return json({ error: 'Method not allowed' }, { status: 405, headers: { allow: 'PUT, PATCH, DELETE' } });
}
