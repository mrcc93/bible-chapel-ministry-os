// Optional Cloudflare Worker API sketch for a future D1-backed version.
// Bind a D1 database as DB, then replace src/hooks/localStorage persistence with fetch calls.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/records')) return new Response('Not found', { status: 404 });

    const collection = url.searchParams.get('collection');
    if (!collection) return Response.json({ error: 'Missing collection' }, { status: 400 });

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, payload FROM app_records WHERE collection = ? ORDER BY updated_at DESC').bind(collection).all();
      return Response.json(results.map(row => ({ id: row.id, ...JSON.parse(row.payload) })));
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO app_records (id, collection, payload, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
      ).bind(body.id, collection, JSON.stringify(body)).run();
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
};
