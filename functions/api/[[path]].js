/**
 * Catch-all for unknown /api/* routes (audit fix #9).
 *
 * Previously an unknown API path was served by the SPA fallback, so
 * `GET /api/does-not-exist` answered `200 text/html` with the app shell.
 * Client code doing `res.json()` then blew up with a parse error, and any
 * `if (!res.ok)` guard silently passed. Unknown API routes now answer with a
 * real 404 JSON body.
 */
const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Let the platform handle non-API paths (these fall through to static assets
  // and the SPA fallback for client-side routes).
  if (!url.pathname.startsWith('/api/')) {
    return context.next();
  }

  return json(
    {
      error: 'not_found',
      path: url.pathname,
      method: request.method,
      hint: 'Unknown API route. See /api/track, /api/orders, /api/dashboard, /api/tenants.',
    },
    404
  );
}
