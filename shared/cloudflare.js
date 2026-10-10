import { rootDomains, isValidSlug } from './store.js';

/**
 * Auto-provisioning of a store's public domain on Cloudflare.
 *
 * When a store is approved, the platform creates (idempotently):
 *   1. the Pages custom domain  <slug>.<root>
 *   2. the DNS CNAME record     <slug>.<root>  ->  <project>.pages.dev
 *
 * It needs a scoped API token with "Zone.DNS edit" on the root zone and
 * "Account.Cloudflare Pages edit" on the account. Without one the call degrades
 * gracefully (skipped) so approving a store still works; the domain can be
 * provisioned later by calling the endpoint again.
 *
 * Required env (all optional — missing = skipped):
 *   CF_API_TOKEN       scoped token (DNS edit + Pages edit)
 *   CF_ACCOUNT_ID      Cloudflare account id
 *   CF_ZONE_ID         id of the root zone (e.g. pkkoko.store)
 *   CF_PAGES_PROJECT   Pages project name (default: bruno-silver-products)
 *   CF_ROOT_DOMAIN     root domain (default: first custom root in STORES_ROOT_DOMAINS)
 */

export function cfConfig(env) {
  const token = String(env.CF_API_TOKEN || '').trim();
  const accountId = String(env.CF_ACCOUNT_ID || '').trim();
  const zoneId = String(env.CF_ZONE_ID || '').trim();
  const project = String(env.CF_PAGES_PROJECT || 'bruno-silver-products').trim();
  const customRoots = rootDomains(env).filter((r) => !r.endsWith('.pages.dev') && !r.endsWith('.workers.dev'));
  const root = String(env.CF_ROOT_DOMAIN || customRoots[0] || 'pkkoko.store').toLowerCase().replace(/^https?:\/\//, '');
  return { token, accountId, zoneId, project, root, configured: !!(token && accountId && zoneId) };
}

async function cfFetch(env, path, options = {}) {
  const cfg = cfConfig(env);
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res.json();
}

/**
 * @returns {Promise<{domain:string, provisioned:boolean, status:string, pages?:string, dns?:string, stage?:string, reason?:string, error?:string}>}
 */
export async function provisionStoreDomain(env, slug) {
  const cfg = cfConfig(env);
  const domain = `${slug}.${cfg.root}`;

  if (!cfg.configured) {
    return {
      domain,
      provisioned: false,
      status: 'skipped',
      reason: 'CF_API_TOKEN / CF_ACCOUNT_ID / CF_ZONE_ID ยังไม่ได้ตั้ง — ตั้ง domain เองหรือเพิ่ม secret เพื่อให้ auto',
    };
  }

  // 1) Pages custom domain — Pages does not accept wildcards, so one per store.
  let pages = 'exists';
  try {
    const list = await cfFetch(env, `/accounts/${cfg.accountId}/pages/projects/${cfg.project}/domains`);
    if (!list.success) throw new Error((list.errors || []).map((e) => e.message).join('; '));
    const exists = (list.result || []).some((d) => d.name === domain);
    if (!exists) {
      const add = await cfFetch(env, `/accounts/${cfg.accountId}/pages/projects/${cfg.project}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
      });
      if (!add.success) throw new Error((add.errors || []).map((e) => e.message).join('; '));
      pages = 'added';
    }
  } catch (err) {
    return { domain, provisioned: false, status: 'error', stage: 'pages_domain', error: String(err.message || err) };
  }

  // 2) DNS CNAME record (idempotent: skip when the record already exists).
  let dns = 'exists';
  try {
    const list = await cfFetch(env, `/zones/${cfg.zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(domain)}`);
    if (!list.success) throw new Error((list.errors || []).map((e) => e.message).join('; '));
    const exists = (list.result || []).some((r) => r.name === domain || r.name === `${slug}.${cfg.root}`);
    if (!exists) {
      const add = await cfFetch(env, `/zones/${cfg.zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'CNAME',
          name: domain,
          content: `${cfg.project}.pages.dev`,
          proxied: true,
          comment: 'auto-provisioned by storefront',
        }),
      });
      if (!add.success) throw new Error((add.errors || []).map((e) => e.message).join('; '));
      dns = 'added';
    }
  } catch (err) {
    return { domain, provisioned: false, status: 'error', stage: 'dns_record', error: String(err.message || err) };
  }

  return {
    domain,
    provisioned: true,
    status: pages === 'added' || dns === 'added' ? 'created' : 'already_exists',
    pages,
    dns,
  };
}

/** Slug availability across tenants AND pending store requests. */
export async function slugAvailability(env, slug) {
  const s = String(slug || '').toLowerCase().trim();
  if (!isValidSlug(s)) return { slug: s, available: false, reason: 'invalid' };

  const tenant = await env.DB.prepare('SELECT id FROM tenants WHERE slug = ? OR id = ? LIMIT 1').bind(s, s).all();
  if (tenant.results && tenant.results.length) return { slug: s, available: false, reason: 'tenant' };

  try {
    const req = await env.DB.prepare('SELECT id FROM store_requests WHERE slug = ? LIMIT 1').bind(s).all();
    if (req.results && req.results.length) return { slug: s, available: false, reason: 'pending_request' };
  } catch {
    // store_requests.slug column may not exist yet — treat as available.
  }

  return { slug: s, available: true, reason: 'ok' };
}
