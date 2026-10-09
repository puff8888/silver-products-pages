const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'today';

    const VALID_RANGES = ['today', '7d', '30d'];
    if (!VALID_RANGES.includes(range)) {
      return json({ error: 'Invalid range parameter', allowed: VALID_RANGES }, 400);
    }

    const dateFilters = {
      today: "date(created_at) = date('now')",
      '7d': "created_at >= date('now', '-7 days')",
      '30d': "created_at >= date('now', '-30 days')",
    };
    const dateFilter = dateFilters[range];

    // 1. Total events
    const { results: eventRes } = await env.DB.prepare(
      `SELECT count(*) as total FROM events WHERE ${dateFilter}`
    ).all();
    const totalEvents = eventRes[0]?.total || 0;

    // 2. Revenue & orders (storefront orders live in D1)
    const { results: revRes } = await env.DB.prepare(
      `SELECT count(*) as orders, COALESCE(sum(total_amount),0) as revenue FROM orders WHERE ${dateFilter}`
    ).all();
    const totalOrders = revRes[0]?.orders || 0;
    const totalRevenue = revRes[0]?.revenue || 0;

    // 3. Funnel — audit fix #7.
    // This used to count EVENT ROWS, so one visitor reloading a page could make
    // a later stage look bigger than the previous one (observed 4 → 6 → 8).
    // It now counts DISTINCT sessions per stage.
    const { results: funnelData } = await env.DB.prepare(`
      SELECT event_name, count(DISTINCT session_id) as count
      FROM events
      WHERE ${dateFilter}
        AND event_name IN ('PageView','ViewContent','AddToCart','Checkout','Purchase')
      GROUP BY event_name
    `).all();

    // 4. Sessions — the denominator for the conversion rate
    const { results: sessionRes } = await env.DB.prepare(
      `SELECT count(DISTINCT session_id) as sessions FROM events WHERE ${dateFilter}`
    ).all();
    const totalSessions = sessionRes[0]?.sessions || 0;

    // 5. Attribution — grouped by the acquisition channel recorded on each event
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
      WHERE ${dateFilter}
      GROUP BY e.channel
      ORDER BY pv DESC
    `).all();

    const attribution = attributionData.map((row) => {
      const spend = 0; // ad-spend integration is still required for a real ROAS
      return {
        ch: row.channel,
        sessions: row.sessions,
        pv: row.pv,
        vc: row.vc,
        atc: row.atc,
        p: row.p,
        purchase_value: row.purchase_value,
        roas: spend > 0 ? `${(row.purchase_value / spend).toFixed(1)}x` : '—',
      };
    });

    const eventCounts = { PageView: 0, ViewContent: 0, AddToCart: 0, Checkout: 0, Purchase: 0 };
    funnelData.forEach((row) => {
      if (eventCounts[row.event_name] !== undefined) eventCounts[row.event_name] = row.count;
    });

    // Audit fix #8: conversion rate is orders ÷ distinct sessions — a real,
    // comparable denominator. It used to be orders ÷ max(ViewContent, AddToCart),
    // which inflated the figure badly on low-traffic ranges.
    let crValue = null;
    if (totalSessions > 0) {
      crValue = ((totalOrders / totalSessions) * 100).toFixed(1);
    }

    // Audit fixes #7 + #15: a step whose later stage has MORE sessions than the
    // earlier one is not a drop-off at all. Return rate/drop = null + a note
    // instead of clamping to 100%/0% and printing a meaningless "-100%".
    const calcStep = (from, to) => {
      const fromCount = eventCounts[from] || 0;
      const toCount = eventCounts[to] || 0;
      if (fromCount === 0) return { rate: null, drop: null, note: 'no_data' };
      if (toCount > fromCount) return { rate: null, drop: null, note: 'later_stage_higher' };
      const rate = Math.round((toCount / fromCount) * 100);
      return { rate, drop: 100 - rate, note: null };
    };

    const s1 = calcStep('PageView', 'ViewContent');
    const s2 = calcStep('ViewContent', 'AddToCart');
    const s3 = calcStep('AddToCart', 'Checkout');
    const s4 = calcStep('Checkout', 'Purchase');

    const formattedFunnel = [
      { step: 'PageView → ViewContent', stepTh: 'เข้าชม → ดูสินค้า', ...s1, from: eventCounts.PageView, to: eventCounts.ViewContent },
      { step: 'ViewContent → AddToCart', stepTh: 'ดูสินค้า → ใส่ตะกร้า', ...s2, from: eventCounts.ViewContent, to: eventCounts.AddToCart },
      { step: 'AddToCart → Checkout', stepTh: 'ใส่ตะกร้า → เริ่มชำระ', ...s3, from: eventCounts.AddToCart, to: eventCounts.Checkout },
      { step: 'Checkout → Purchase', stepTh: 'เริ่มชำระ → สั่งซื้อสำเร็จ', ...s4, from: eventCounts.Checkout, to: eventCounts.Purchase },
    ];

    // Audit fix #13: the "LINE Friends" tile fell back to 0 forever and was
    // labelled "Live Sync". Return the LINE channel's session count, or null
    // when no event carries a LINE channel at all.
    const lineRow = attribution.find((a) => /LINE/i.test(a.ch));
    const lineValue = lineRow ? lineRow.sessions : null;

    const activeSessions = await env.DB.prepare(
      `SELECT count(DISTINCT session_id) as u FROM events WHERE created_at >= datetime('now', '-30 minutes')`
    ).all();
    const active = activeSessions.results?.[0]?.u ?? 0;

    return json({
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
