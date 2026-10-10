import { slugAvailability } from '../../shared/cloudflare.js';
import { rootDomains } from '../../shared/store.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * Public slug availability check for the onboarding form.
 * GET /api/check-slug?slug=my-store -> {slug, available, reason, domain}
 */
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const result = await slugAvailability(env, url.searchParams.get('slug') || '');

  const roots = rootDomains(env).filter((r) => !r.endsWith('.pages.dev') && !r.endsWith('.workers.dev'));
  const root = String(env.CF_ROOT_DOMAIN || roots[0] || 'pkkoko.store').toLowerCase();
  return json({ ...result, domain: result.available ? `${result.slug}.${root}` : null });
}
