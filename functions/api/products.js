/**
 * Shopify product catalog for the storefront.
 *
 * The storefront used to render a hard-coded catalog (src/data/products.js).
 * This endpoint pulls the real catalog from Shopify and normalises it into the
 * shape the UI already expects, so product pages/cart/swatchify keep working.
 *
 * Multi-store: the store is resolved from the subdomain (shared/store.js) and
 * its own `tenants.shopify_domain` is used when set.
 *
 * The access token never reaches the browser: it is read from the Function
 * environment (Cloudflare Pages → Settings → Environment variables).
 *
 * Supported configuration (either one):
 *   SHOPIFY_STORE_URL + SHOPIFY_ADMIN_API_TOKEN      (Admin REST, read_products)
 *   SHOPIFY_STORE_URL + SHOPIFY_STOREFRONT_TOKEN     (Storefront GraphQL)
 *
 * Responses:
 *   200 { products: [...], source: "shopify-admin" | "shopify-storefront", count }
 *   503 { error: "shopify_not_configured", missing: [...] }  -> client falls back to the local catalog
 */

import { resolveStore } from '../../shared/store.js';
import { getCredential } from '../../shared/credentials.js';

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...extraHeaders },
  });

// Shopify retires API versions after ~12 months, and a sunset version makes the
// Admin API answer 401 (which looks exactly like a bad token). Keep this recent
// and allow an override without a code change.
const DEFAULT_API_VERSION = '2026-07';
const apiVersion = (env) => String(env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION);

const COLOR_HEX = {
  black: '#1a1a1a', midnight: '#12121c', 'space gray': '#4b4b52', graphite: '#3a3a3f',
  white: '#f5f5f5', cloud: '#f2f2f2', ivory: '#f6f1e7', cream: '#f3ece0',
  silver: '#c7c7cc', grey: '#8e8e93', gray: '#8e8e93', charcoal: '#36454f',
  navy: '#1e3a5f', blue: '#2f6fb2', 'sky blue': '#87ceeb', teal: '#1f7a8c', green: '#2f7d4f',
  olive: '#556b2f', red: '#c0392b', crimson: '#a51c30', maroon: '#6e1f2a',
  pink: '#e4a3bd', rose: '#e0a3a3', purple: '#6b4e9e', lavender: '#b9a6d8',
  yellow: '#e3c04a', gold: '#c9a227', orange: '#d97a2b', brown: '#6b4b32', beige: '#d8cbb6',
  transparent: '#e8e8e8', natural: '#d9cbb3', sand: '#d9c8a9',
};

function stableId(shopifyId) {
  // Shopify ids are large numeric strings. Keep them numeric so the existing
  // cart keys / parseInt(id) logic keeps working, but fall back to a hash.
  const n = Number(shopifyId);
  if (Number.isFinite(n)) return n;
  let h = 0;
  for (const ch of String(shopifyId)) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h;
}

function colorHex(name) {
  const key = String(name || '').trim().toLowerCase();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  // deterministic pastel-ish hue so unknown colour names still render a swatch
  let h = 0;
  for (const ch of key) h = (h * 33 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 28% 62%)`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryOf(product) {
  const raw = product.product_type || (product.tags || []).find((t) => t && !t.includes(':')) || '';
  return String(raw).trim().toLowerCase().replace(/\s+/g, '-');
}

function swatchesOf(product) {
  const colorOption =
    (product.options || []).find((o) => /colou?r|สี/i.test(o.name || '')) ||
    (product.options || []).find((o) => (o.values || []).length > 1);

  if (colorOption && Array.isArray(colorOption.values) && colorOption.values.length) {
    return colorOption.values.map((value) => ({
      id: String(value).trim().toLowerCase().replace(/\s+/g, '-'),
      name: String(value).trim(),
      hex: colorHex(value),
    }));
  }
  return [{ id: 'default', name: 'Standard', hex: '#d4d4d8' }];
}

/** Admin REST product -> storefront product */
function mapAdminProduct(p) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const prices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
  const price = prices.length ? Math.min(...prices) : 0;
  const compareAt = variants
    .map((v) => Number(v.compare_at_price))
    .filter((n) => Number.isFinite(n) && n > price);
  const images = (p.images || []).map((img) => img.src).filter(Boolean);
  const description = stripHtml(p.body_html);

  return {
    id: stableId(p.id),
    shopifyId: String(p.id),
    slug: p.handle,
    name: p.title,
    nameTh: p.title,
    category: categoryOf(p),
    vendor: p.vendor || null,
    price,
    originalPrice: compareAt.length ? Math.max(...compareAt) : null,
    rating: null,
    reviewsCount: 0,
    badge: (p.tags || []).find((t) => /^(badge|promo):/i.test(t))?.split(':')[1] || null,
    inStock: variants.length ? variants.some((v) => v.available !== false) : true,
    description,
    descriptionEn: description,
    details: (p.options || []).map((o) => ({ label: o.name, value: (o.values || []).join(', ') })),
    image: images[0] || null,
    gallery: images.length ? images : (images[0] ? [images[0]] : []),
    swatches: swatchesOf(p),
    reviews: [],
    tags: p.tags || [],
  };
}

/** Storefront GraphQL node -> storefront product */
function mapStorefrontProduct(node) {
  const variants = (node.variants && node.variants.edges ? node.variants.edges : []).map((e) => e.node);
  const prices = variants.map((v) => Number(v.price && v.price.amount)).filter((n) => Number.isFinite(n));
  const price = prices.length ? Math.min(...prices) : 0;
  const compareAt = variants
    .map((v) => Number(v.compareAtPrice && v.compareAtPrice.amount))
    .filter((n) => Number.isFinite(n) && n > price);
  const images = (node.images && node.images.edges ? node.images.edges : []).map((e) => e.node.url).filter(Boolean);
  const description = stripHtml(node.descriptionHtml || node.description);

  return {
    id: stableId(node.id ? String(node.id).split('/').pop() : node.handle),
    shopifyId: node.id || null,
    slug: node.handle,
    name: node.title,
    nameTh: node.title,
    category: String(node.productType || '').trim().toLowerCase().replace(/\s+/g, '-'),
    vendor: node.vendor || null,
    price,
    originalPrice: compareAt.length ? Math.max(...compareAt) : null,
    rating: null,
    reviewsCount: 0,
    badge: null,
    inStock: variants.length ? variants.some((v) => v.availableForSale !== false) : true,
    description,
    descriptionEn: description,
    details: (node.options || []).map((o) => ({ label: o.name, value: (o.values || []).join(', ') })),
    image: images[0] || null,
    gallery: images,
    swatches: swatchesOf({ options: node.options }),
    reviews: [],
    tags: node.tags || [],
  };
}

async function fetchAdmin(base, token, version) {
  const res = await fetch(`https://${base}/admin/api/${version}/products.json?limit=250&status=active`, {
    headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' },
  });
  if (!res.ok) {
    // Shopify explains itself in the body — keep it, otherwise a sunset API
    // version and a revoked token are indistinguishable.
    const body = await res.text().catch(() => '');
    throw new Error(`Shopify Admin API ${res.status} (version ${version}): ${body.slice(0, 180)}`);
  }
  const data = await res.json();
  return (data.products || []).map(mapAdminProduct);
}

async function fetchStorefront(base, token, version) {
  const query = `query Products($n:Int!){ products(first:$n){ edges{ node{
      id handle title descriptionHtml vendor productType tags
      options{ name values }
      images(first:10){ edges{ node{ url } } }
      variants(first:50){ edges{ node{ id title availableForSale price{ amount } compareAtPrice{ amount } } } }
  } } } }`;
  const res = await fetch(`https://${base}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables: { n: 250 } }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Shopify Storefront API ${res.status} (version ${version}): ${body.slice(0, 180)}`);
  }
  const data = await res.json();
  if (data.errors) throw new Error(`Shopify Storefront API: ${data.errors[0]?.message || 'error'}`);
  const edges = data.data?.products?.edges || [];
  return edges.map((e) => mapStorefrontProduct(e.node));
}

export async function onRequestGet(context) {
  const { env, request } = context;

  // Multi-store: the store's own Shopify domain (tenants.shopify_domain) wins;
  // SHOPIFY_STORE_URL stays as the fallback for single-store deployments.
  // NOTE: per-store access tokens are not supported yet — one token pair in the
  // environment is used for whichever store the request resolved to. Storing a
  // token per tenant (encrypted) is the next step in docs/multi-store-plan.md.
  const resolved = await resolveStore(env, request).catch(() => null);
  const tenantDomain = resolved && resolved.tenant ? resolved.tenant.shopify_domain : null;
  const store = String(tenantDomain || env.SHOPIFY_STORE_URL || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  // Token: the store's own encrypted credential wins, then the shared env token
  // (single-store deployments and local development keep working).
  const tenantId = resolved && resolved.clientId ? resolved.clientId : null;
  const tenantAdminToken = tenantId ? await getCredential(env, tenantId, 'shopify_admin_token') : null;
  const tenantStorefrontToken = tenantId ? await getCredential(env, tenantId, 'shopify_storefront_token') : null;
  const adminToken = tenantAdminToken || env.SHOPIFY_ADMIN_API_TOKEN;
  const storefrontToken = tenantStorefrontToken || env.SHOPIFY_STOREFRONT_TOKEN;
  const credentialSource = tenantAdminToken || tenantStorefrontToken ? 'tenant' : (adminToken || storefrontToken ? 'env' : 'none');

  const missing = [];
  if (!store) missing.push('tenants.shopify_domain (หรือ SHOPIFY_STORE_URL)');
  if (!adminToken && !storefrontToken) missing.push('SHOPIFY_ADMIN_API_TOKEN (or SHOPIFY_STOREFRONT_TOKEN) หรือ token ของร้านใน tenant_credentials');
  if (missing.length) {
    return json({ error: 'shopify_not_configured', missing, store: resolved ? resolved.slug : null }, 503);
  }

  try {
    let products;
    let source;
    if (adminToken) {
      products = await fetchAdmin(store, adminToken, apiVersion(env));
      source = 'shopify-admin';
    } else {
      products = await fetchStorefront(store, storefrontToken, apiVersion(env));
      source = 'shopify-storefront';
    }

    // Drop products with no usable image/price — the UI needs both.
    const usable = products.filter((p) => p.slug && p.image && p.price > 0);
    return json({
      products: usable,
      source,
      count: usable.length,
      store,
      store_slug: resolved ? resolved.slug : null,
      credential_source: credentialSource,
      api_version: apiVersion(env),
    });
  } catch (err) {
    console.error('Shopify catalog error:', err);
    return json(
      {
        error: 'shopify_fetch_failed',
        detail: String(err.message || err),
        store,
        store_slug: resolved ? resolved.slug : null,
        credential_source: credentialSource,
      },
      502
    );
  }
}
