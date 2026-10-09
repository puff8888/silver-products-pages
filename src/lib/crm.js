// CRM + Affiliate client.
// Reconstructed from the deployed chunk `crm-BEpXSIQr.js`.
// The CRM/affiliate service lives on a separate Cloudflare Worker.
// The URL comes from VITE_CRM_API_URL at build time, with a hard fallback: a
// missing env var used to wipe out every CRM/affiliate call silently.
const CRM_BASE = (
  (import.meta && import.meta.env && import.meta.env.VITE_CRM_API_URL) ||
  'https://bruno-crm-aff.pkkokola.workers.dev'
).replace(/\/$/, '');

async function post(path, body) {
  try {
    const res = await fetch(`${CRM_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function get(path) {
  try {
    const res = await fetch(`${CRM_BASE}${path}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Mirror a completed order into the CRM, and attribute it to an affiliate
 * when the visitor arrived with a `?ref=` code.
 */
export function syncOrderToCrm({ orderId, customerName, customerPhone, total, refCode, sessionId }) {
  const customer = post('/api/crm/customers/upsert', {
    customer_id: customerPhone ? `PHONE-${customerPhone}` : `ORDER-${orderId}`,
    name: customerName || undefined,
    phone: customerPhone || undefined,
    order_value: total,
  });

  let referral = Promise.resolve(null);
  if (refCode) {
    referral = post('/api/aff/referrals', {
      affiliate_code: refCode,
      order_id: orderId,
      session_id: sessionId || undefined,
      order_value: total,
    });
  }

  return Promise.all([customer, referral]).catch(() => [null, null]);
}

export function fetchAffiliates() {
  return get('/api/aff/affiliates');
}
