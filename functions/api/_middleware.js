import { requireAuth } from '../lib/auth.js';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return context.next();
  }

  const auth = requireAuth(context);
  if (auth.response) return auth.response;

  context.data.authenticatedUser = auth.user;
  return context.next();
}
