/**
 * Store resolution for the multi-store setup.
 *
 * A store is addressed by subdomain:  <slug>.<root-domain>
 * e.g. cafe.sv9.store, fitness.sv9.store, cafe.bruno-silver-products.pages.dev
 *
 * Resolution order:
 *   1. ?store=<slug>          explicit override (store switcher / dev / QA)
 *   2. dsp_store cookie       sticky override
 *   3. <slug>.<root-domain>   Host header
 *   4. DEFAULT_STORE_SLUG     apex domain or unknown host
 *
 * The tenant id is used as `client_id` in events/orders, so this function is the
 * single place that decides which store a request belongs to.
 *
 * Registries stay separate from the membership platform on purpose: only the
 * slug/id convention is shared (see docs/multi-store-plan.md).
 */

const DEFAULT_ROOT_DOMAINS = [
  'bruno-silver-products.pages.dev',
  'pkkoko.store',
  'sv9.store',
  'sv9.workers.dev',
  'localhost',
  '127.0.0.1',
];

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,31}$/;

export const isValidSlug = (slug) => typeof slug === 'string' && SLUG_RE.test(slug);

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function parseCookie(header, name) {
  if (!header) return null;
  const hit = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function rootDomains(env) {
  const configured = String(env.STORES_ROOT_DOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ROOT_DOMAINS;
}

/** Host header -> candidate slug, or null when the host is a root domain. */
export function slugFromHost(host, roots) {
  const clean = String(host || '').toLowerCase().split(':')[0];
  if (!clean) return null;
  for (const root of roots) {
    if (clean === root) return null;
    if (clean.endsWith(`.${root}`)) {
      const sub = clean.slice(0, -(root.length + 1));
      // only a single label: cafe.sv9.store (not a.b.sv9.store)
      if (sub && !sub.includes('.') && isValidSlug(sub)) return sub;
      return null;
    }
  }
  return null;
}

export async function findTenant(env, slug) {
  if (!slug) return null;
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, slug, status, shopify_domain, meta_pixel_id, tiktok_pixel_id, line_tag_id,
              tagline, brand_color, logo_url, plan
         FROM tenants
        WHERE slug = ? OR id = ?
        LIMIT 1`
    ).bind(slug, slug).all();
    return results && results[0] ? results[0] : null;
  } catch (err) {
    // Tolerate a database that has not had every migration applied yet.
    const { results } = await env.DB.prepare(
      `SELECT id, name, id AS slug, status, shopify_domain, meta_pixel_id, tiktok_pixel_id, line_tag_id
         FROM tenants
        WHERE id = ?
        LIMIT 1`
    ).bind(slug).all();
    return results && results[0] ? results[0] : null;
  }
}

/**
 * @returns {Promise<{slug:string, clientId:string|null, tenant:object|null, resolved:boolean, source:string, requestedSlug:string|null, host:string}>}
 */
export async function resolveStore(env, request) {
  const url = new URL(request.url);
  const host = String(request.headers.get('host') || url.host || '').toLowerCase().split(':')[0];
  const roots = rootDomains(env);
  const defaultSlug = String(env.DEFAULT_STORE_SLUG || 'bc-activewear').toLowerCase();

  const overrideRaw = url.searchParams.get('store') || parseCookie(request.headers.get('cookie'), 'dsp_store');
  const override = overrideRaw && isValidSlug(overrideRaw.toLowerCase()) ? overrideRaw.toLowerCase() : null;
  const fromHost = slugFromHost(host, roots);

  let requestedSlug = null;
  let source = 'default';
  if (override) {
    requestedSlug = override;
    source = 'override';
  } else if (fromHost) {
    requestedSlug = fromHost;
    source = 'subdomain';
  }

  let tenant = null;
  let resolved = false;

  if (requestedSlug) {
    tenant = await findTenant(env, requestedSlug);
    resolved = !!tenant;
  }

  if (!tenant) {
    tenant = await findTenant(env, defaultSlug);
    if (requestedSlug && resolved === false && tenant) {
      // Unknown store: serve the default store but tell the caller it was not found.
      return {
        slug: tenant.slug || tenant.id,
        clientId: tenant.id,
        tenant,
        resolved: false,
        source: `${source}:not_found`,
        requestedSlug,
        host,
      };
    }
  }

  const slug = tenant ? (tenant.slug || tenant.id) : defaultSlug;
  return {
    slug,
    clientId: tenant ? tenant.id : defaultSlug,
    tenant,
    resolved: !!tenant,
    source,
    requestedSlug,
    host,
  };
}

/** Public (non-secret) store config for the client. */
export function publicStore(store) {
  const t = store.tenant || {};
  return {
    slug: store.slug,
    name: t.name || null,
    status: t.status || null,
    resolved: store.resolved,
    resolution: store.source,
    host: store.host,
    // branding — used by the storefront theme and the store directory
    tagline: t.tagline || null,
    brand_color: t.brand_color || null,
    logo_url: t.logo_url || null,
    plan: t.plan || null,
    shopify_configured: !!t.shopify_domain,
    // per-store tracking ids, delivered at runtime: build-time env can only ever
    // hold one store's ids, so each store carries its own here
    pixels: {
      meta: t.meta_pixel_id || null,
      tiktok: t.tiktok_pixel_id || null,
      line: t.line_tag_id || null,
    },
  };
}
