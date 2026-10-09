/**
 * Authentication for the admin side of the app.
 *
 * Deliberately dependency-free and Cloudflare-native:
 *   - password hashing: PBKDF2-SHA256 (Web Crypto) + per-user salt + server pepper
 *   - sessions: 32 random bytes, stored in D1 as sha256(token) so a database
 *     leak cannot be replayed as a login
 *   - cookie: HttpOnly, Secure, SameSite=Lax
 *
 * Iteration count is modest on purpose: Cloudflare Pages Functions on the free
 * plan have a very small CPU budget per request, and a long PBKDF2 would make
 * login fail with "Worker exceeded CPU time". Raise PBKDF2_ITERATIONS when the
 * project is on a paid plan.
 */

export const SESSION_COOKIE = 'dsp_session';
const DEFAULT_ITERATIONS = 20000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

function b64(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteLength) {
  return hex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function timingSafeEqual(a, b) {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    key,
    256
  );
  return b64(bits);
}

export async function hashPassword(password, env) {
  const iterations = Number(env.PBKDF2_ITERATIONS || DEFAULT_ITERATIONS);
  const salt = randomHex(16);
  const pepper = String(env.AUTH_PEPPER || '');
  const digest = await pbkdf2(`${password}${pepper}`, salt, iterations);
  return `pbkdf2$${iterations}$${salt}$${digest}`;
}

export async function verifyPassword(password, stored, env) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  const pepper = String(env.AUTH_PEPPER || '');
  const digest = await pbkdf2(`${password}${pepper}`, salt, iterations);
  return timingSafeEqual(digest, expected);
}

// ── sessions ────────────────────────────────────────────────────────────────

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return hex(digest);
}

export async function createSession(env, userId, request) {
  const token = randomHex(32);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)`
  ).bind(await sha256Hex(token), userId, now, now + SESSION_TTL_SECONDS, (request.headers.get('user-agent') || '').slice(0, 180)).run();
  return { token, expiresIn: SESSION_TTL_SECONDS };
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  // Secure is harmless on http://localhost (browsers ignore it there for cookies set over http? they do not
  // send Secure cookies over http). Keep it off for plain-http local development.
  const secure = '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  const hit = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

export async function getSessionUser(env, request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const id = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  try {
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > ?
        LIMIT 1`
    ).bind(id, now).all();
    if (!results || !results[0]) return null;
    return results[0];
  } catch (err) {
    console.error('session lookup failed:', err);
    return null;
  }
}

export async function destroySession(env, request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
}

// ── store access ────────────────────────────────────────────────────────────

export async function userStores(env, user) {
  if (!user) return [];
  if (user.role === 'admin') {
    const { results } = await env.DB.prepare(
      `SELECT id, name, slug, status FROM tenants ORDER BY name`
    ).all();
    return results || [];
  }
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.name, t.slug, t.status
       FROM tenant_members m JOIN tenants t ON t.id = m.tenant_id
      WHERE m.user_id = ?
      ORDER BY t.name`
  ).bind(user.id).all();
  return results || [];
}

export async function canAccessStore(env, user, tenantId) {
  if (!user || !tenantId) return false;
  if (user.role === 'admin') return true;
  try {
    const { results } = await env.DB.prepare(
      `SELECT 1 AS ok FROM tenant_members WHERE user_id = ? AND tenant_id = ? LIMIT 1`
    ).bind(user.id, tenantId).all();
    return !!(results && results[0]);
  } catch (err) {
    return false;
  }
}

/** Counts users — used to allow first-run setup only once. */
export async function userCount(env) {
  try {
    const { results } = await env.DB.prepare('SELECT count(*) AS n FROM users').all();
    return results?.[0]?.n ?? 0;
  } catch (err) {
    return 0;
  }
}
