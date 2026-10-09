import { verifyPassword, createSession, sessionCookie, userStores } from '../../../shared/auth.js';

/**
 * POST /api/auth/login  { email, password }
 *
 * Returns the session cookie plus the stores this user may open.
 */
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const MAX_FAILURES = 10;
const WINDOW_SECONDS = 15 * 60;

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return json({ error: 'missing_credentials' }, 400);

  try {
    const now = Math.floor(Date.now() / 1000);
    const { results: recent } = await env.DB.prepare(
      `SELECT count(*) AS failures FROM login_attempts WHERE email = ? AND ok = 0 AND attempted_at > ?`
    ).bind(email, now - WINDOW_SECONDS).all();
    if ((recent?.[0]?.failures || 0) >= MAX_FAILURES) {
      return json({ error: 'too_many_attempts', retry_after_seconds: WINDOW_SECONDS }, 429);
    }

    const { results } = await env.DB.prepare(
      `SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1`
    ).bind(email).all();
    const user = results && results[0];

    const ok = user ? await verifyPassword(password, user.password_hash, env) : false;

    await env.DB.prepare(
      `INSERT INTO login_attempts (email, attempted_at, ok) VALUES (?, ?, ?)`
    ).bind(email, now, ok ? 1 : 0).run();

    if (!ok) {
      // Same answer whether the account exists or not.
      return json({ error: 'invalid_credentials' }, 401);
    }

    await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).bind(user.id).run();
    const { token } = await createSession(env, user.id, request);
    const stores = await userStores(env, user);

    return json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role }, stores },
      200,
      { 'Set-Cookie': sessionCookie(token) }
    );
  } catch (err) {
    console.error('login error:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
