import { destroySession, clearSessionCookie } from '../../../shared/auth.js';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

/** POST /api/auth/logout — destroys the session and clears the cookie. */
export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    await destroySession(env, request);
  } catch (err) {
    console.error('logout error:', err);
  }
  return json({ status: 'logged_out' }, 200, { 'Set-Cookie': clearSessionCookie() });
}
