import { slugify, isValidSlug } from '../../shared/store.js';

/**
 * Tenant (store) registry API.
 *
 * Reconstructed against the live behaviour on the deployed site, now extended
 * for multi-store: each store also has a `slug` that is used as its subdomain
 * (<slug>.<root-domain>) and matches the slug convention of the membership
 * platform, so the same store keeps the same identifier in both systems —
 * without coupling the two databases (see docs/multi-store-plan.md).
 *
 * Contract:
 *   GET  /api/tenants                                  -> { tenants: [...] }
 *   POST /api/tenants {name, slug?, ...}               -> 201 {status:'registered', tenant:{...}}
 *   POST /api/tenants {action:'approve', id}           -> {status:'approved', ...}
 *   POST /api/tenants {action:'approve', id:<missing>} -> 404 {error:'Tenant not found'}
 *   POST /api/tenants {name:''}                        -> 400 {error:'Invalid name (min 2 chars)'}
 *   POST /api/tenants {slug:'taken'}                   -> 409 {error:'Slug already in use'}
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const TENANT_COLUMNS = `
  t.id, t.name, t.slug, t.shopify_domain, t.contact_email, t.status,
  t.created_at, t.approved_at,
  (SELECT count(*) FROM sku_templates s WHERE s.client_id = t.id) AS templates
`;

const TENANT_LIST = `
  SELECT ${TENANT_COLUMNS}
  FROM tenants t
  ORDER BY t.created_at DESC
`;

const TENANT_BY_ID = `
  SELECT ${TENANT_COLUMNS}
  FROM tenants t
  WHERE t.id = ?
`;

function newTenantId() {
  return `tnt-${Math.random().toString(36).slice(2, 8)}`;
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const { results } = await env.DB.prepare(TENANT_LIST).all();
    return json({ tenants: results || [] });
  } catch (err) {
    console.error('Tenants list error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    // ── Approve an existing tenant and seed its workspace ──
    if (body && body.action === 'approve') {
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) return json({ error: 'Invalid tenant id' }, 400);

      const { results } = await env.DB.prepare('SELECT id FROM tenants WHERE id = ? LIMIT 1').bind(id).all();
      if (!results || results.length === 0) {
        return json({ error: 'Tenant not found' }, 404);
      }

      await env.DB.prepare(
        `UPDATE tenants SET status = 'active', approved_at = COALESCE(approved_at, datetime('now')) WHERE id = ?`
      ).bind(id).run();

      // Seed one default carousel template per ad platform (the UI states
      // "2 carousel SKU templates (Meta + TikTok)").
      const seeds = [
        { name: 'Meta carousel', platform: 'meta', isDefault: 1 },
        { name: 'TikTok carousel', platform: 'tiktok', isDefault: 1 },
      ];
      for (const seed of seeds) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO sku_templates (client_id, name, platform, is_default)
           VALUES (?, ?, ?, ?)`
        ).bind(id, seed.name, seed.platform, seed.isDefault).run();
      }

      const { results: updated } = await env.DB.prepare(TENANT_BY_ID).bind(id).all();
      return json({ status: 'approved', seeded_templates: seeds.length, tenant: updated?.[0] || null });
    }

    // ── Register a new client (lands in `pending`) ──
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return json({ error: 'Invalid name (min 2 chars)' }, 400);
    }

    // Slug: explicit, else derived from the brand name. It becomes the store's
    // subdomain, so it must be a legal DNS label.
    const requestedSlug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : '';
    const slug = requestedSlug || slugify(name);
    if (!isValidSlug(slug)) {
      return json({ error: 'Invalid slug (a-z, 0-9, hyphen; 2-32 chars)' }, 400);
    }

    const existing = await env.DB.prepare('SELECT id FROM tenants WHERE slug = ? LIMIT 1').bind(slug).all();
    if (existing.results && existing.results.length > 0) {
      return json({ error: 'Slug already in use', slug }, 409);
    }

    const id = newTenantId();
    const shopifyDomain = typeof body.shopify_domain === 'string' && body.shopify_domain.trim()
      ? body.shopify_domain.trim()
      : null;
    const contactEmail = typeof body.contact_email === 'string' && body.contact_email.trim()
      ? body.contact_email.trim()
      : null;

    await env.DB.prepare(
      `INSERT INTO tenants (id, name, slug, shopify_domain, contact_email, status) VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(id, name, slug, shopifyDomain, contactEmail).run();

    return json({ status: 'registered', tenant: { id, name, slug, status: 'pending' } }, 201);
  } catch (err) {
    console.error('Tenant write error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}
