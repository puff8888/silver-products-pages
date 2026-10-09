import { ALL_PRODUCTS } from '../data/products';

/**
 * Storefront catalog loader.
 *
 * Primary source: /api/products (Pages Function -> Shopify, token server-side).
 * Fallback: the bundled demo catalog in src/data/products.js, so the store
 * never renders empty when Shopify is not configured yet or is unreachable.
 */

export const LOCAL_CATALOG_SOURCE = 'local-fallback';

export async function loadCatalog() {
  try {
    const res = await fetch('/api/products');

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        return {
          products: data.products,
          source: data.source || 'shopify',
          store: data.store || null,
          error: null,
          loading: false,
        };
      }
      return {
        products: ALL_PRODUCTS,
        source: LOCAL_CATALOG_SOURCE,
        store: null,
        error: 'แคตตาล็อกจาก Shopify ว่างเปล่า',
        loading: false,
      };
    }

    const detail = await res.json().catch(() => ({}));
    return {
      products: ALL_PRODUCTS,
      source: LOCAL_CATALOG_SOURCE,
      store: null,
      error:
        res.status === 503
          ? 'ยังไม่ได้ตั้งค่า Shopify (ใช้แคตตาล็อกตัวอย่างก่อน)'
          : `ดึงแคตตาล็อกจาก Shopify ไม่สำเร็จ: ${detail.error || detail.detail || `HTTP ${res.status}`}`,
      loading: false,
    };
  } catch (e) {
    return {
      products: ALL_PRODUCTS,
      source: LOCAL_CATALOG_SOURCE,
      store: null,
      error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ใช้แคตตาล็อกตัวอย่างก่อน)',
      loading: false,
    };
  }
}

/** True when the products came from the bundled demo catalog, not from Shopify. */
export function isFallbackSource(source) {
  return !source || source === LOCAL_CATALOG_SOURCE;
}
