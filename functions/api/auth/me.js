import { getSessionUser, userStores } from '../../../shared/auth.js';
import { resolveStore } from '../../../shared/store.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * GET /api/auth/me
 *
 * Current admin session, the stores it may open, and whether this store is one
 * of them (so the UI can tell "no access to this store" from "not logged in").
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const user = await getSessionUser(env, request);
    if (!user) {
      // Tell an unauthenticated caller whether the platform still needs its
      // first admin, so the UI can show the setup form instead of a login form.
      return json({ authenticated: false, setup_required: (await adminCount(env)) === 0 }, 401);
    }

    const stores = await userStores(env, user);
    const store = await resolveStore(env, request);
    const hasStoreAccess = user.role === 'admin' || stores.some((s) => s.id === store.clientId);

    return json({
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      stores,
      current_store: { slug: store.slug, client_id: store.clientId },
      can_access_current_store: hasStoreAccess,
      setup_required: (await adminCount(env)) === 0,
    });
  } catch (err) {
    console.error('me error:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}

async function adminCount(env) {
  try {
    const { results } = await env.DB.prepare('SELECT count(*) AS n FROM users').all();
    return results?.[0]?.n ?? 0;
  } catch (err) {
    return 0;
  }
}
