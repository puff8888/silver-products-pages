import { getSessionUser } from '../../shared/auth.js';

/**
 * Store requests from the /sell page.
 *
 *   POST /api/store-requests   (public)  { brand, contact, note }
 *   GET  /api/store-requests   (admin)   -> the queue
 *
 * The sales page used to be the kind of page this audit disliked: buttons that
 * do nothing. The CTA here writes a real row that the platform admin can see.
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Honeypot: bots fill every field, humans never see this one.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ status: 'received' }, 201);
  }

  const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null;

  if (brand.length < 2) return json({ error: 'invalid_brand' }, 400);
  if (contact.length < 5) return json({ error: 'invalid_contact', hint: 'อีเมล เบอร์โทร หรือ LINE ID' }, 400);

  try {
    // Light abuse guard: the same contact cannot submit more than 5 times per hour.
    const { results } = await env.DB.prepare(
      `SELECT count(*) AS n FROM store_requests WHERE contact = ? AND created_at > datetime('now', '-1 hour')`
    ).bind(contact).all();
    if ((results?.[0]?.n || 0) >= 5) {
      return json({ error: 'too_many_requests' }, 429);
    }

  try {
    await env.DB.prepare(
      `INSERT INTO store_requests (brand, contact, note) VALUES (?, ?, ?)`
    ).bind(brand, contact, note).run();

    return json({ status: 'received', message: 'ได้รับคำขอแล้ว ทีมงานจะติดต่อกลับ' }, 201);
  } catch (err) {
    if (/no such table/i.test(String(err.message || ''))) {
      return json(
        { error: 'migration_required', migration: '0003_credentials_branding', detail: String(err.message) },
        503
      );
    }
    console.error('store request failed:', err);
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;

  const user = await getSessionUser(env, request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'forbidden' }, 403);

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, brand, contact, note, status, created_at FROM store_requests ORDER BY created_at DESC LIMIT 100`
    ).all();
    return json({ requests: results || [] });
  } catch (err) {
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
