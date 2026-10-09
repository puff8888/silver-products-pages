/**
 * Tenant onboarding API (reconstructed — the original Pages Function was not in
 * this workspace, only its observable behaviour on the deployed site).
 *
 * Contract verified against production:
 *   GET  /api/tenants                                  -> { tenants: [...] }
 *   POST /api/tenants {name,...}                       -> 201 {status:'registered', tenant:{id,name,status}}
 *   POST /api/tenants {action:'approve', id}           -> {status:'approved', ...}
 *   POST /api/tenants {action:'approve', id:<missing>} -> 404 {error:'Tenant not found'}
 *   POST /api/tenants {name:''}                        -> 400 {error:'Invalid name (min 2 chars)'}
 *   POST /api/tenants <bad json>                       -> 400 {error:'Invalid JSON body'}
 *
 * Table shape (read from the live D1 database `bruno_storefront`):
 *   tenants(id PK, name, shopify_domain, contact_email, status, meta_pixel_id,
 *           tiktok_pixel_id, line_tag_id, created_at, approved_at)
 *   sku_templates(id, client_id, name, platform, card_layout, sku_field_map,
 *                 is_default, created_at, UNIQUE(client_id,name))
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const TENANT_SELECT = `
  SELECT
    t.id, t.name, t.shopify_domain, t.contact_email, t.status,
    t.created_at, t.approved_at,
    (SELECT count(*) FROM sku_templates s WHERE s.client_id = t.id) AS templates
  FROM tenants t
  ORDER BY t.created_at DESC
`;

function newTenantId() {
  return `tnt-${Math.random().toString(36).slice(2, 8)}`;
}

export async function onRequestGet(context) {
  try {
    const { env } = context;
    const { results } = await env.DB.prepare(TENANT_SELECT).all();
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

      const { results } = await env.DB.prepare('SELECT * FROM tenants WHERE id = ? LIMIT 1').bind(id).all();
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

      const { results: updated } = await env.DB.prepare(TENANT_SELECT.replace('ORDER BY t.created_at DESC', 'WHERE t.id = ?')).bind(id).all();
      return json({ status: 'approved', seeded_templates: seeds.length, tenant: updated?.[0] || null });
    }

    // ── Register a new client (lands in `pending`) ──
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return json({ error: 'Invalid name (min 2 chars)' }, 400);
    }

    const id = newTenantId();
    const shopifyDomain = typeof body.shopify_domain === 'string' && body.shopify_domain.trim()
      ? body.shopify_domain.trim()
      : null;
    const contactEmail = typeof body.contact_email === 'string' && body.contact_email.trim()
      ? body.contact_email.trim()
      : null;

    await env.DB.prepare(
      `INSERT INTO tenants (id, name, shopify_domain, contact_email, status) VALUES (?, ?, ?, ?, 'pending')`
    ).bind(id, name, shopifyDomain, contactEmail).run();

    return json({ status: 'registered', tenant: { id, name, status: 'pending' } }, 201);
  } catch (err) {
    console.error('Tenant write error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}
