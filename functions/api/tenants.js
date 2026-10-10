import { slugify, isValidSlug } from '../../shared/store.js';
import { provisionStoreDomain } from '../../shared/cloudflare.js';
import { getSessionUser, userStores, canAccessStore } from '../../shared/auth.js';

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
  t.tagline, t.brand_color, t.logo_url, t.is_public, t.plan,
  t.meta_pixel_id, t.tiktok_pixel_id, t.line_tag_id,
  t.created_at, t.approved_at,
  (SELECT count(*) FROM sku_templates s WHERE s.client_id = t.id) AS templates,
  (SELECT count(*) FROM tenant_credentials c WHERE c.tenant_id = t.id) AS credentials_set
`;

const TENANT_COLUMNS_LEGACY = `
  t.id, t.name, t.slug, t.shopify_domain, t.contact_email, t.status,
  t.created_at, t.approved_at,
  (SELECT count(*) FROM sku_templates s WHERE s.client_id = t.id) AS templates
`;

/**
 * Query tenants, tolerating a database that has not had every migration applied
 * yet: migration 0003 adds the branding columns and tenant_credentials. Without
 * this, deploying before migrating would 500 the whole store list.
 */
async function selectTenants(env, { where = '', binds = [] } = {}) {
  const build = (cols) => `SELECT ${cols} FROM tenants t ${where} ORDER BY t.created_at DESC`;
  try {
    const { results } = await env.DB.prepare(build(TENANT_COLUMNS)).bind(...binds).all();
    return { results: results || [], migrated: true };
  } catch (err) {
    const { results } = await env.DB.prepare(build(TENANT_COLUMNS_LEGACY)).bind(...binds).all();
    return { results: results || [], migrated: false };
  }
}

function newTenantId() {
  return `tnt-${Math.random().toString(36).slice(2, 8)}`;
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;

    // Store registry is admin data: platform admins see every store, a store
    // owner sees only the stores they are a member of.
    const user = await getSessionUser(env, request);
    if (!user) return json({ error: 'unauthorized' }, 401);

    if (user.role !== 'admin') {
      const mine = await userStores(env, user);
      const ids = mine.map((s) => s.id);
      const { results, migrated } = await selectTenants(env, {
        where: `WHERE t.id IN (${ids.map(() => '?').join(',') || 'NULL'})`,
        binds: ids,
      });
      return json({ tenants: results, migration_0003_applied: migrated });
    }

    const { results, migrated } = await selectTenants(env);
    return json({ tenants: results, migration_0003_applied: migrated });
  } catch (err) {
    console.error('Tenants list error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Requires a session; individual actions check the role below.
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    // ── Update a store's own settings (branding, Shopify domain, visibility) ──
    if (body && body.action === 'update') {
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) return json({ error: 'Invalid tenant id' }, 400);
      if (!(await canAccessStore(env, user, id))) return json({ error: 'forbidden', tenant_id: id }, 403);

      const fields = [];
      const values = [];
      const set = (col, val) => { fields.push(`${col} = ?`); values.push(val); };

      if (typeof body.name === 'string' && body.name.trim().length >= 2) set('name', body.name.trim());
      if (typeof body.shopify_domain === 'string') set('shopify_domain', body.shopify_domain.trim() || null);
      if (typeof body.tagline === 'string') set('tagline', body.tagline.trim().slice(0, 160) || null);
      if (typeof body.brand_color === 'string') {
        const color = body.brand_color.trim();
        if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
          return json({ error: 'invalid_brand_color', hint: 'รูปแบบ #RRGGBB' }, 400);
        }
        set('brand_color', color || null);
      }
      if (typeof body.logo_url === 'string') set('logo_url', body.logo_url.trim() || null);
      if (body.is_public !== undefined) set('is_public', body.is_public ? 1 : 0);
      if (typeof body.plan === 'string' && body.plan.trim()) set('plan', body.plan.trim());
      // Per-store tracking ids (public values — they end up in the page anyway),
      // applied at runtime by src/components/StoreRuntime.jsx
      if (typeof body.meta_pixel_id === 'string') set('meta_pixel_id', body.meta_pixel_id.trim() || null);
      if (typeof body.tiktok_pixel_id === 'string') set('tiktok_pixel_id', body.tiktok_pixel_id.trim() || null);
      if (typeof body.line_tag_id === 'string') set('line_tag_id', body.line_tag_id.trim() || null);

      if (!fields.length) return json({ error: 'nothing_to_update' }, 400);

      values.push(id);
      try {
        await env.DB.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      } catch (err) {
        if (/no such column/i.test(String(err.message || ''))) {
          return json(
            { error: 'migration_required', migration: '0003_credentials_branding', detail: String(err.message) },
            503
          );
        }
        throw err;
      }

      const { results: updated, migrated } = await selectTenants(env, { where: 'WHERE t.id = ?', binds: [id] });
      return json({ status: 'updated', tenant: updated?.[0] || null, migration_0003_applied: migrated });
    }

    // ── Approve an existing tenant and seed its workspace ──
    if (body && body.action === 'approve') {
      if (user.role !== 'admin') return json({ error: 'forbidden', hint: 'ต้องเป็นผู้ดูแลแพลตฟอร์ม' }, 403);
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) return json({ error: 'Invalid tenant id' }, 400);

      const { results } = await env.DB.prepare('SELECT id, slug FROM tenants WHERE id = ? LIMIT 1').bind(id).all();
      if (!results || results.length === 0) {
        return json({ error: 'Tenant not found' }, 404);
      }
      const tenantSlug = results[0].slug || results[0].id;

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

      const { results: updated, migrated } = await selectTenants(env, { where: 'WHERE t.id = ?', binds: [id] });

      // Auto-provision the store's public domain (<slug>.<root> + DNS CNAME).
      // Degrades to {status:'skipped'} when CF_* env is not set, so approval
      // never fails because of missing Cloudflare credentials.
      const domain = await provisionStoreDomain(env, tenantSlug);

      return json({
        status: 'approved',
        seeded_templates: seeds.length,
        tenant: updated?.[0] || null,
        migration_0003_applied: migrated,
        domain,
      });
    }

    // ── Register a new client (lands in `pending`) ──
    if (user.role !== 'admin') return json({ error: 'forbidden', hint: 'ต้องเป็นผู้ดูแลแพลตฟอร์ม' }, 403);

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
    const tagline = typeof body.tagline === 'string' && body.tagline.trim() ? body.tagline.trim().slice(0, 160) : null;
    const brandColor = typeof body.brand_color === 'string' && /^#[0-9a-f]{6}$/i.test(body.brand_color.trim())
      ? body.brand_color.trim()
      : null;
    const isPublic = body.is_public ? 1 : 0;

    await env.DB.prepare(
      `INSERT INTO tenants (id, name, slug, shopify_domain, contact_email, tagline, brand_color, is_public, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(id, name, slug, shopifyDomain, contactEmail, tagline, brandColor, isPublic).run();

    return json({ status: 'registered', tenant: { id, name, slug, status: 'pending', is_public: !!isPublic } }, 201);
  } catch (err) {
    console.error('Tenant write error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}
