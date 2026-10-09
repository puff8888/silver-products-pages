import { resolveStore } from '../../shared/store.js';

/**
 * GET /api/stores — public directory of stores on this platform.
 *
 * Powers the /stores page (the equivalent of the membership platform's /demo):
 * only stores that opted in (`is_public = 1`) and are active are listed, and the
 * storefront URL for each is derived from the request host so it works both on
 * a real subdomain and in local development.
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });

function storefrontUrl(slug, host, rootDomains) {
  const isLocal =
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (!isLocal) {
    for (const root of rootDomains) {
      if (host === root || host.endsWith(`.${root}`)) return `https://${slug}.${root}`;
    }
  }
  // Local development / unknown host: the app accepts ?store=<slug>
  return `/?store=${encodeURIComponent(slug)}`;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const host = String(request.headers.get('host') || url.host || '').toLowerCase().split(':')[0];
    const current = await resolveStore(env, request);

    const roots = String(env.STORES_ROOT_DOMAINS || 'bruno-silver-products.pages.dev,sv9.store,localhost,127.0.0.1')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    let results = [];
    let migrated = true;
    try {
      ({ results } = await env.DB.prepare(
        `SELECT id, name, slug, tagline, brand_color, logo_url, plan, status
           FROM tenants
          WHERE status = 'active' AND is_public = 1
          ORDER BY name`
      ).all());
    } catch (err) {
      // Migration 0003 not applied yet: the directory stays empty rather than 500ing.
      migrated = false;
      results = [];
    }

    const stores = (results || []).map((s) => ({
      slug: s.slug || s.id,
      name: s.name,
      tagline: s.tagline || null,
      brand_color: s.brand_color || null,
      logo_url: s.logo_url || null,
      plan: s.plan || 'starter',
      url: storefrontUrl(s.slug || s.id, host, roots),
      is_current: (s.slug || s.id) === current.slug,
    }));

    return json({
      stores,
      current_store: current.slug,
      count: stores.length,
      migration_0003_applied: migrated,
      ...(migrated ? {} : { note: 'ยังไม่ได้ migrate 0003 — ไดเรกทอรีว่างเปล่า' }),
    });
  } catch (err) {
    console.error('stores directory error:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
