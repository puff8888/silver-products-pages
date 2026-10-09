import { getSessionUser, canAccessStore } from '../../../shared/auth.js';
import { resolveStore } from '../../../shared/store.js';
import { putCredential, deleteCredential, listCredentials, PROVIDERS } from '../../../shared/credentials.js';

/**
 * Per-store secrets.
 *
 *   GET    /api/tenants/credentials?tenant_id=   -> which providers are set (never the values)
 *   POST   /api/tenants/credentials              -> { tenant_id?, provider, value }  (encrypts)
 *   DELETE /api/tenants/credentials?tenant_id=&provider=
 *
 * Access: a platform admin, or a member of that store. Values are write-only.
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function authorize(env, request, explicitTenantId) {
  const user = await getSessionUser(env, request);
  if (!user) return { error: json({ error: 'unauthorized' }, 401) };

  let tenantId = explicitTenantId || null;
  if (!tenantId) {
    const store = await resolveStore(env, request);
    tenantId = store.clientId;
  }
  if (!(await canAccessStore(env, user, tenantId))) {
    return { error: json({ error: 'forbidden', tenant_id: tenantId }, 403) };
  }
  return { user, tenantId };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const auth = await authorize(env, request, url.searchParams.get('tenant_id'));
  if (auth.error) return auth.error;

  try {
    const credentials = await listCredentials(env, auth.tenantId);
    return json({ tenant_id: auth.tenantId, providers_supported: PROVIDERS, credentials });
  } catch (err) {
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const auth = await authorize(env, request, body.tenant_id);
  if (auth.error) return auth.error;

  const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  const value = typeof body.value === 'string' ? body.value.trim() : '';

  if (!PROVIDERS.includes(provider)) {
    return json({ error: 'unsupported_provider', allowed: PROVIDERS }, 400);
  }
  if (value.length < 8) {
    return json({ error: 'value_too_short' }, 400);
  }
  if (!env.CREDENTIALS_KEY) {
    return json({ error: 'credentials_key_missing', hint: 'ตั้ง CREDENTIALS_KEY ที่ Pages → Environment variables' }, 503);
  }

  try {
    const stored = await putCredential(env, auth.tenantId, provider, value);
    return json({ status: 'stored', tenant_id: auth.tenantId, ...stored }, 201);
  } catch (err) {
    console.error('credential store failed:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const auth = await authorize(env, request, url.searchParams.get('tenant_id'));
  if (auth.error) return auth.error;

  const provider = url.searchParams.get('provider') || '';
  if (!PROVIDERS.includes(provider)) {
    return json({ error: 'unsupported_provider', allowed: PROVIDERS }, 400);
  }

  try {
    await deleteCredential(env, auth.tenantId, provider);
    return json({ status: 'deleted', tenant_id: auth.tenantId, provider });
  } catch (err) {
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
