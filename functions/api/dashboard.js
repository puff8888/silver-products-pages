import { resolveStore } from '../../shared/store.js';
import { getSessionUser, canAccessStore } from '../../shared/auth.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const VALID_RANGES = ['today', '7d', '30d'];

/**
 * Per-store analytics.
 *
 * Every query is scoped by `client_id` (the resolved store), so a dashboard can
 * only ever show the store it was opened for — required for multi-store.
 */
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'today';

    if (!VALID_RANGES.includes(range)) {
      return json({ error: 'Invalid range parameter', allowed: VALID_RANGES }, 400);
    }

    const store = await resolveStore(env, request);
    const scope = store.clientId;

    // Store analytics are private: only a signed-in user with access to this
    // store may read them.
    const user = await getSessionUser(env, request);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (!(await canAccessStore(env, user, scope))) {
      return json({ error: 'forbidden', store: store.slug }, 403);
    }

    const dateFilters = {
      today: "date(created_at) = date('now')",
      '7d': "created_at >= date('now', '-7 days')",
      '30d': "created_at >= date('now', '-30 days')",
    };
    const dateFilter = dateFilters[range];

    // 1. Total events
    const { results: eventRes } = await env.DB.prepare(
      `SELECT count(*) as total FROM events WHERE ${dateFilter} AND client_id = ?`
    ).bind(scope).all();
    const totalEvents = eventRes[0]?.total || 0;

    // 2. Revenue & orders
    const { results: revRes } = await env.DB.prepare(
      `SELECT count(*) as orders, COALESCE(sum(total_amount),0) as revenue FROM orders WHERE ${dateFilter} AND client_id = ?`
    ).bind(scope).all();
    const totalOrders = revRes[0]?.orders || 0;
    const totalRevenue = revRes[0]?.revenue || 0;

    // 3. Funnel — distinct sessions per stage (audit fix #7)
    const { results: funnelData } = await env.DB.prepare(`
      SELECT event_name, count(DISTINCT session_id) as count
      FROM events
      WHERE ${dateFilter} AND client_id = ?
        AND event_name IN ('PageView','ViewContent','AddToCart','Checkout','Purchase')
      GROUP BY event_name
    `).bind(scope).all();

    // 4. Sessions — denominator for the conversion rate
    const { results: sessionRes } = await env.DB.prepare(
      `SELECT count(DISTINCT session_id) as sessions FROM events WHERE ${dateFilter} AND client_id = ?`
    ).bind(scope).all();
    const totalSessions = sessionRes[0]?.sessions || 0;

    // 5. Attribution by acquisition channel
    const { results: attributionData } = await env.DB.prepare(`
      SELECT
        e.channel,
        count(DISTINCT e.session_id) as sessions,
        count(*) as pv,
        count(DISTINCT CASE WHEN e.event_name = 'ViewContent' THEN e.session_id END) as vc,
        count(DISTINCT CASE WHEN e.event_name = 'AddToCart' THEN e.session_id END) as atc,
        count(DISTINCT CASE WHEN e.event_name = 'Purchase' THEN e.session_id END) as p,
        COALESCE(SUM(CASE WHEN e.event_name = 'Purchase' THEN e.value ELSE 0 END),0) as purchase_value
      FROM events e
      WHERE ${dateFilter} AND e.client_id = ?
      GROUP BY e.channel
      ORDER BY pv DESC
    `).bind(scope).all();

    const attribution = attributionData.map((row) => ({
      ch: row.channel,
      sessions: row.sessions,
      pv: row.pv,
      vc: row.vc,
      atc: row.atc,
      p: row.p,
      purchase_value: row.purchase_value,
      roas: '—', // ad-spend integration still required for a real ROAS
    }));

    const eventCounts = { PageView: 0, ViewContent: 0, AddToCart: 0, Checkout: 0, Purchase: 0 };
    funnelData.forEach((row) => {
      if (eventCounts[row.event_name] !== undefined) eventCounts[row.event_name] = row.count;
    });

    // 6. Conversion rate: orders ÷ distinct sessions (audit fix #8)
    let crValue = null;
    if (totalSessions > 0) {
      crValue = ((totalOrders / totalSessions) * 100).toFixed(1);
    }

    // 7. Funnel steps (audit fixes #7 + #15)
    const calcStep = (from, to) => {
      const fromCount = eventCounts[from] || 0;
      const toCount = eventCounts[to] || 0;
      if (fromCount === 0) return { rate: null, drop: null, note: 'no_data' };
      if (toCount > fromCount) return { rate: null, drop: null, note: 'later_stage_higher' };
      const rate = Math.round((toCount / fromCount) * 100);
      return { rate, drop: 100 - rate, note: null };
    };

    const formattedFunnel = [
      { step: 'PageView → ViewContent', stepTh: 'เข้าชม → ดูสินค้า', ...calcStep('PageView', 'ViewContent'), from: eventCounts.PageView, to: eventCounts.ViewContent },
      { step: 'ViewContent → AddToCart', stepTh: 'ดูสินค้า → ใส่ตะกร้า', ...calcStep('ViewContent', 'AddToCart'), from: eventCounts.ViewContent, to: eventCounts.AddToCart },
      { step: 'AddToCart → Checkout', stepTh: 'ใส่ตะกร้า → เริ่มชำระ', ...calcStep('AddToCart', 'Checkout'), from: eventCounts.AddToCart, to: eventCounts.Checkout },
      { step: 'Checkout → Purchase', stepTh: 'เริ่มชำระ → สั่งซื้อสำเร็จ', ...calcStep('Checkout', 'Purchase'), from: eventCounts.Checkout, to: eventCounts.Purchase },
    ];

    // 8. LINE channel sessions, or null when the store has no LINE traffic (#13)
    const lineRow = attribution.find((a) => /LINE/i.test(a.ch));
    const lineValue = lineRow ? lineRow.sessions : null;

    const activeSessions = await env.DB.prepare(
      `SELECT count(DISTINCT session_id) as u FROM events WHERE created_at >= datetime('now', '-30 minutes') AND client_id = ?`
    ).bind(scope).all();
    const active = activeSessions.results?.[0]?.u ?? 0;

    return json({
      store: store.slug,
      events: totalEvents.toLocaleString(),
      revenue: `฿ ${Number(totalRevenue).toLocaleString()}`,
      revenue_raw: Number(totalRevenue),
      orders: totalOrders,
      sessions: totalSessions,
      cr: crValue === null ? '—' : `${crValue}%`,
      cr_basis: 'orders / distinct sessions',
      line: lineValue,
      active_shoppers: active,
      funnel: formattedFunnel,
      attribution,
      data_source: 'cloudflare-d1',
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return json({ error: 'Internal Server Error', detail: String(err.message || err) }, 500);
  }
}
