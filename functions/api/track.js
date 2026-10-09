import { resolveStore } from '../../shared/store.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // Dashboard funnel uses: PageView → ViewContent → AddToCart → Checkout → Purchase
    // We accept both 'Checkout' and alias 'InitiateCheckout' but normalize to 'Checkout'
    const VALID_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'Checkout', 'InitiateCheckout', 'Purchase'];

    let eventName = typeof body.event_name === 'string' ? body.event_name.trim() : '';
    const sessionId = body.session_id;
    const channel = typeof body.channel === 'string' && body.channel.length > 0 ? body.channel : 'Organic';
    const valueRaw = body.value == null ? 0 : body.value;
    const contentIds = body.content_ids == null ? null : (typeof body.content_ids === 'string' ? body.content_ids : JSON.stringify(body.content_ids));
    const currency = typeof body.currency === 'string' && body.currency.length > 0 ? body.currency : 'THB';
    const orderId = typeof body.order_id === 'string' && body.order_id.length > 0 ? body.order_id : null;
    const productCount = Number.isFinite(Number(body.product_count)) ? Number(body.product_count) : null;
    const pagePath = typeof body.page_path === 'string' && body.page_path.length > 0 ? body.page_path : null;

    if (eventName === 'InitiateCheckout') eventName = 'Checkout';

    if (!eventName || !VALID_EVENTS.includes(eventName)) {
      return json({ error: 'Invalid or missing event_name', allowed: VALID_EVENTS }, 400);
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return json({ error: 'Invalid or missing session_id' }, 400);
    }
    const value = Number(valueRaw);
    if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
      return json({ error: 'Invalid value' }, 400);
    }

    // Multi-store: every event belongs to the store this request resolved to,
    // so each store's analytics stay separate.
    const store = await resolveStore(env, request);

    const { success, meta } = await env.DB.prepare(
      `INSERT INTO events (session_id, event_name, channel, value, content_ids, currency, order_id, product_count, page_path, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId, eventName, channel, value, contentIds, currency, orderId, productCount, pagePath, store.clientId
    ).run();

    if (success) {
      return json({
        status: 'tracked',
        event: eventName,
        row_id: meta && meta.last_row_id ? meta.last_row_id : null,
        store: store.slug,
      });
    }
    throw new Error('D1 insert failed');
  } catch (err) {
    console.error('track API error:', err);
    return json({ error: 'Internal Server Error' }, 500);
  }
}
