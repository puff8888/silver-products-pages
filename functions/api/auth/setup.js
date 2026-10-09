import { hashPassword, createSession, sessionCookie, userCount } from '../../../shared/auth.js';

/**
 * POST /api/auth/setup
 *
 * One-time bootstrap of the first platform admin. Requires ADMIN_SETUP_TOKEN
 * (a secret you set on the Pages project) and only works while there are no
 * users at all — so it cannot be used to add accounts later.
 */
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const expected = String(env.ADMIN_SETUP_TOKEN || '');
  if (!expected) {
    return json({ error: 'setup_disabled', hint: 'ตั้งค่า ADMIN_SETUP_TOKEN ที่ Pages → Environment variables ก่อน' }, 503);
  }

  const provided = typeof body.token === 'string' ? body.token : '';
  if (!provided || provided !== expected) {
    return json({ error: 'invalid_setup_token' }, 403);
  }

  try {
    const existing = await userCount(env);
    if (existing > 0) {
      return json({ error: 'setup_already_done', users: existing }, 409);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : null;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
    if (password.length < 8) return json({ error: 'weak_password', hint: 'อย่างน้อย 8 ตัวอักษร' }, 400);

    const id = `usr-${Math.random().toString(36).slice(2, 10)}`;
    const passwordHash = await hashPassword(password, env);

    await env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`
    ).bind(id, email, name, passwordHash).run();

    // Give the platform admin ownership of every store that already exists.
    const { results: tenants } = await env.DB.prepare('SELECT id FROM tenants').all();
    for (const t of tenants || []) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO tenant_members (user_id, tenant_id, role) VALUES (?, ?, 'owner')`
      ).bind(id, t.id).run();
    }

    const { token } = await createSession(env, id, request);
    return json(
      { status: 'created', user: { id, email, name, role: 'admin' }, stores: (tenants || []).length },
      201,
      { 'Set-Cookie': sessionCookie(token) }
    );
  } catch (err) {
    console.error('setup error:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
