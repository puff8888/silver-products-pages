import { resolveStore, publicStore } from '../../shared/store.js';

/**
 * GET /api/store
 *
 * Tells the client which store this request belongs to (subdomain resolution)
 * and returns that store's public configuration. The client uses it for the
 * admin store indicator and (later) per-store branding/pixels.
 */
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const store = await resolveStore(env, request);
    return json({ store: publicStore(store) });
  } catch (err) {
    console.error('store resolution error:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
