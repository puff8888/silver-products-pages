export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Invalid or missing event_name', allowed: VALID_EVENTS }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing session_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const value = Number(valueRaw);
    if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
      return new Response(JSON.stringify({ error: 'Invalid value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { success, meta } = await env.DB.prepare(
      `INSERT INTO events (session_id, event_name, channel, value, content_ids, currency, order_id, product_count, page_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sessionId, eventName, channel, value, contentIds, currency, orderId, productCount, pagePath).run();

    if (success) {
      return new Response(JSON.stringify({ status: 'tracked', event: eventName, row_id: meta && meta.last_row_id ? meta.last_row_id : null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('D1 insert failed');
    }
  } catch (err) {
    console.error('track API error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
