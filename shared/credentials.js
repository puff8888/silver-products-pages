/**
 * Per-store secrets, encrypted at rest.
 *
 * Cloudflare secrets are per-Worker, so a token that belongs to one tenant has
 * to be stored in the database. Plaintext is not acceptable, so each value is
 * sealed with AES-256-GCM using a key derived from the CREDENTIALS_KEY secret.
 *
 * Stored form: ciphertext (base64) + iv (base64, 12 bytes) + key_version.
 * Rotating CREDENTIALS_KEY invalidates every stored credential — re-enter them.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PROVIDERS = [
  'shopify_admin_token',
  'shopify_storefront_token',
  'shopify_webhook_secret',
  'meta_capi_token',
  'tiktok_events_token',
  'line_oa_channel_token',
];

function b64FromBytes(bytes) {
  let s = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

function bytesFromB64(value) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function keyFor(env) {
  const raw = String(env.CREDENTIALS_KEY || '');
  if (!raw) throw new Error('CREDENTIALS_KEY is not configured');

  let keyBytes;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    keyBytes = new Uint8Array(raw.match(/.{2}/g).map((h) => parseInt(h, 16)));
  } else {
    // Any string works: fold it into 32 bytes with SHA-256.
    keyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(raw)));
  }
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export function hintFor(value) {
  const v = String(value || '');
  if (v.length <= 4) return '••••';
  return `…${v.slice(-4)}`;
}

export async function seal(env, plaintext) {
  const key = await keyFor(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(String(plaintext)));
  return { ciphertext: b64FromBytes(ciphertext), iv: b64FromBytes(iv), keyVersion: 1 };
}

export async function open(env, ciphertext, iv) {
  const key = await keyFor(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesFromB64(iv) },
    key,
    bytesFromB64(ciphertext)
  );
  return dec.decode(plaintext);
}

/** Store (or replace) an encrypted credential for a tenant. Never returns the value. */
export async function putCredential(env, tenantId, provider, value) {
  if (!PROVIDERS.includes(provider)) throw new Error(`unsupported provider: ${provider}`);
  const sealed = await seal(env, value);
  await env.DB.prepare(
    `INSERT INTO tenant_credentials (tenant_id, provider, ciphertext, iv, key_version, hint, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (tenant_id, provider) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       iv = excluded.iv,
       key_version = excluded.key_version,
       hint = excluded.hint,
       updated_at = datetime('now')`
  ).bind(tenantId, provider, sealed.ciphertext, sealed.iv, sealed.keyVersion, hintFor(value)).run();
  return { provider, hint: hintFor(value) };
}

/** Decrypt one credential, or null when it is not set / cannot be decrypted. */
export async function getCredential(env, tenantId, provider) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT ciphertext, iv FROM tenant_credentials WHERE tenant_id = ? AND provider = ? LIMIT 1`
    ).bind(tenantId, provider).all();
    if (!results || !results[0]) return null;
    return await open(env, results[0].ciphertext, results[0].iv);
  } catch (err) {
    console.error(`credential decrypt failed (${provider}):`, err);
    return null;
  }
}

/** Which providers a tenant has set — safe to send to the UI (no values). */
export async function listCredentials(env, tenantId) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT provider, hint, updated_at FROM tenant_credentials WHERE tenant_id = ? ORDER BY provider`
    ).bind(tenantId).all();
    const out = {};
    for (const row of results || []) out[row.provider] = { set: true, hint: row.hint, updated_at: row.updated_at };
    return out;
  } catch (err) {
    return {};
  }
}

export async function deleteCredential(env, tenantId, provider) {
  await env.DB.prepare('DELETE FROM tenant_credentials WHERE tenant_id = ? AND provider = ?')
    .bind(tenantId, provider).run();
  return { provider, deleted: true };
}
