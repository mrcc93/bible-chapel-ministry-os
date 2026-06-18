// Historical Worker sketch retained for teams that choose Workers instead of
// Cloudflare Pages Functions. The active Phase 1 API scaffold is in
// functions/api/collections/[collection].js, and the D1 schema is in
// cloudflare/migrations/0001_initial_schema.sql.

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/collections/')) {
      return new Response('Not found', { status: 404 });
    }

    return Response.json({
      deferred: true,
      message: 'Use the Pages Functions scaffold for Phase 2 authenticated D1 access.'
    }, { status: 501 });
  }
};
