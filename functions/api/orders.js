import { resolveStore } from '../../shared/store.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const ORDER_ID_RE = /^SS-\d{6}$/;

/**
 * Public order tracking lookup (audit fix #2).
 *
 * Scoped per store: an order id only resolves inside the store it was placed in,
 * so one store can never look up another store's orders.
 * Customer-facing PII is masked — the tracking page only needs to confirm the
 * order is real.
 */
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = (url.searchParams.get('id') || url.searchParams.get('order_id') || '').trim();

    if (!id) return json({ error: 'missing_order_id' }, 400);
    if (!ORDER_ID_RE.test(id)) return json({ error: 'invalid_order_id_format', expected: 'SS-######' }, 400);

    const store = await resolveStore(env, request);

    const { results } = await env.DB.prepare(
      `SELECT order_id, customer_name, total_amount, payment_method, status, created_at
         FROM orders WHERE order_id = ? AND client_id = ? LIMIT 1`
    ).bind(id, store.clientId).all();

    if (!results || results.length === 0) {
      return json({ error: 'not_found', order_id: id, store: store.slug }, 404);
    }

    const row = results[0];
    const name = typeof row.customer_name === 'string' ? row.customer_name.trim() : '';
    const maskedName = name.length <= 2
      ? name.replace(/./g, '•')
      : `${name.slice(0, 2)}${'•'.repeat(Math.min(name.length - 2, 6))}`;

    return json({
      order: {
        order_id: row.order_id,
        customer_name_masked: maskedName,
        total_amount: Number(row.total_amount) || 0,
        currency: 'THB',
        payment_method: row.payment_method || null,
        status: row.status || 'Pending',
        created_at: row.created_at || null,
      },
      store: store.slug,
    });
  } catch (err) {
    console.error('Order lookup error:', err);
    return json({ error: 'internal_error' }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const { customer_name, customer_phone, total_amount, payment_method, items } = body;

    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
      return json({ error: 'Invalid customer_name' }, 400);
    }
    if (!customer_phone || typeof customer_phone !== 'string') {
      return json({ error: 'Invalid customer_phone' }, 400);
    }
    if (typeof total_amount !== 'number' || total_amount < 0 || !Number.isFinite(total_amount)) {
      return json({ error: 'Invalid total_amount' }, 400);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return json({ error: 'Invalid items' }, 400);
    }

    const store = await resolveStore(env, request);
    const orderId = 'SS-' + Math.floor(100000 + Math.random() * 900000);

    const { success } = await env.DB.prepare(
      `INSERT INTO orders (order_id, customer_name, customer_phone, total_amount, payment_method, status, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId,
      customer_name.trim(),
      customer_phone,
      total_amount,
      payment_method || 'cod',
      'Pending',
      store.clientId
    ).run();

    if (!success) throw new Error('D1 insert failed');

    return json({ status: 'created', order_id: orderId, store: store.slug });
  } catch (err) {
    console.error('Order create error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}
