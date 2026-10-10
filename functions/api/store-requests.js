import { getSessionUser } from '../../shared/auth.js';
import { slugify, isValidSlug } from '../../shared/store.js';
import { slugAvailability } from '../../shared/cloudflare.js';

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
  // Optional preferred subdomain slug — validated for uniqueness before saving.
  const requestedSlug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const slug = requestedSlug || slugify(brand);

  if (brand.length < 2) return json({ error: 'invalid_brand' }, 400);
  if (contact.length < 5) return json({ error: 'invalid_contact', hint: 'อีเมล เบอร์โทร หรือ LINE ID' }, 400);
  if (!isValidSlug(slug)) return json({ error: 'invalid_slug', hint: 'a-z, 0-9, hyphen (2-32 ตัว)' }, 400);

  // "ไม่ซ้ำ" — checked against live tenants AND the pending queue.
  const available = await slugAvailability(env, slug);
  if (!available.available) {
    return json(
      available.reason === 'tenant'
        ? { error: 'slug_taken', hint: `โดเมน ${slug} มีร้านใช้อยู่แล้ว — เลือกชื่ออื่น` }
        : { error: 'slug_taken', hint: `ชื่อ ${slug} มีคำขอรออยู่แล้ว — เลือกชื่ออื่น` },
      409
    );
  }

  try {
    // Light abuse guard: the same contact cannot submit more than 5 times per hour.
    const { results } = await env.DB.prepare(
      `SELECT count(*) AS n FROM store_requests WHERE contact = ? AND created_at > datetime('now', '-1 hour')`
    ).bind(contact).all();
    if ((results?.[0]?.n || 0) >= 5) {
      return json({ error: 'too_many_requests' }, 429);
    }

    // store the slug so a second request for the same name is rejected (migration
    // 0004 adds the column; before it is applied the insert falls back to the
    // original three columns).
    try {
      await env.DB.prepare(
        `INSERT INTO store_requests (brand, contact, note, slug) VALUES (?, ?, ?, ?)`
      ).bind(brand, contact, note, slug).run();
    } catch (e) {
      if (/no (such )?column (named )?slug/i.test(String(e.message || ''))) {
        await env.DB.prepare(
          `INSERT INTO store_requests (brand, contact, note) VALUES (?, ?, ?)`
        ).bind(brand, contact, note).run();
      } else {
        throw e;
      }
    }

    return json({ status: 'received', message: 'ได้รับคำขอแล้ว ทีมงานจะติดต่อกลับ', slug }, 201);
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
    let rows;
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, brand, contact, note, slug, status, created_at FROM store_requests ORDER BY created_at DESC LIMIT 100`
      ).all();
      rows = results;
    } catch (e) {
      if (!/no (such )?column (named )?slug/i.test(String(e.message || ''))) throw e;
      const { results } = await env.DB.prepare(
        `SELECT id, brand, contact, note, status, created_at FROM store_requests ORDER BY created_at DESC LIMIT 100`
      ).all();
      rows = results;
    }
    return json({ requests: rows || [] });
  } catch (err) {
    return json({ error: 'internal_error', detail: String(err.message || err) }, 500);
  }
}
