import { requireAuth } from './_shared/auth.js';

export async function onRequest(context) {
  if (new URL(context.request.url).pathname.startsWith('/api/')) {
    const auth = requireAuth(context);
    if (auth.response) return auth.response;
  }

  return context.next();
}
