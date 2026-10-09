/**
 * Which store is the browser talking to?
 *
 * In production this is decided by the subdomain on the server (shared/store.js).
 * For local development and QA, `?store=<slug>` sets a sticky cookie that the
 * API also honours, so multiple stores can be exercised from one origin.
 */

const OVERRIDE_COOKIE = 'dsp_store';

function readCookie(name) {
  try {
    const hit = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  } catch (e) {
    return null;
  }
}

export function getStoreOverride() {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('store');
    if (fromQuery) {
      document.cookie = `${OVERRIDE_COOKIE}=${encodeURIComponent(fromQuery)};path=/;max-age=604800;samesite=lax`;
      return fromQuery;
    }
  } catch (e) { /* noop */ }
  return readCookie(OVERRIDE_COOKIE);
}

export function clearStoreOverride() {
  try {
    document.cookie = `${OVERRIDE_COOKIE}=;path=/;max-age=0;samesite=lax`;
  } catch (e) { /* noop */ }
}

/** Append the active store override (if any) to an API path. */
export function withStore(path) {
  const slug = getStoreOverride();
  if (!slug) return path;
  return `${path}${path.includes('?') ? '&' : '?'}store=${encodeURIComponent(slug)}`;
}

export async function loadStore() {
  try {
    const res = await fetch(withStore('/api/store'), { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store || null;
  } catch (e) {
    return null;
  }
}
