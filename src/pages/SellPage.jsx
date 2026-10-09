import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Sales page for the platform itself (/sell) — the equivalent of the membership
 * platform's "ขายระบบ" page.
 *
 * The CTA is a real form: it writes to store_requests, which the platform admin
 * sees in the API. No dead buttons (the audit flagged exactly that pattern).
 */

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 299,
    period: 'เดือน',
    tagline: 'เริ่มต้นสำหรับร้านเดียว',
    features: [
      'หน้าร้าน + ตะกร้า + PromptPay/COD',
      'แดชบอร์ดสถิติของร้านตัวเอง',
      'ออเดอร์ + ติดตามพัสดุ',
      'ต่อ Shopify ได้ (สินค้าจริง)',
    ],
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 790,
    period: 'เดือน',
    tagline: 'สำหรับร้านที่ยิงโฆษณาจริงจัง',
    features: [
      'ทุกอย่างใน Starter',
      'พิกเซล Meta / TikTok / LINE / GA4 แยกร้าน',
      'Sales attribution + funnel ต่อร้าน',
      'พาร์ทเนอร์/Affiliate + ค่าคอมมิชชัน',
    ],
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1990,
    period: 'เดือน',
    tagline: 'หลายร้าน/ทีมงาน',
    features: [
      'ทุกอย่างใน Growth',
      'หลายร้านในบัญชีเดียว + สิทธิ์ทีมงาน',
      'โดเมนของตัวเองต่อร้าน',
      'สำรองข้อมูล + ซัพพอร์ตเร่งด่วน',
    ],
    highlight: false,
  },
];

const FIELD = 'h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-foreground/50 transition-colors';

export default function SellPage() {
  const [form, setForm] = useState({ brand: '', contact: '', note: '', website: '' });
  const [state, setState] = useState({ busy: false, ok: false, error: null });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, ok: false, error: null });
    try {
      const res = await fetch('/api/store-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setState({ busy: false, ok: true, error: null });
      setForm({ brand: '', contact: '', note: '', website: '' });
    } catch (err) {
      const map = {
        invalid_brand: 'กรอกชื่อร้านอย่างน้อย 2 ตัวอักษร',
        invalid_contact: 'กรอกช่องทางติดต่อ (อีเมล/เบอร์/LINE) อย่างน้อย 5 ตัวอักษร',
        too_many_requests: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่',
      };
      setState({ busy: false, ok: false, error: map[err.message] || `ส่งไม่สำเร็จ: ${err.message}` });
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 lg:px-8">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sell · ขายระบบ</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          เปิดหน้าร้านออนไลน์ของตัวเอง<br className="hidden sm:block" /> ในไม่กี่นาที
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted leading-relaxed">
          ระบบร้านค้าครบวงจร — หน้าร้าน ตะกร้า ชำระเงิน พิกเซลโฆษณา และแดชบอร์ดสถิติ
          แต่ละร้านแยกข้อมูลกันโดยสมบูรณ์ ไม่ปนกับร้านอื่น
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="#request" className="inline-flex h-12 items-center rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            ขอเปิดร้าน →
          </a>
          <Link to="/stores" className="inline-flex h-12 items-center rounded-xl border border-border px-7 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40">
            ดูร้านตัวอย่าง
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`flex flex-col rounded-2xl border p-6 ${tier.highlight ? 'border-foreground/30 bg-surface shadow-lg' : 'border-border bg-surface'}`}
          >
            {tier.highlight && (
              <span className="mb-3 self-start rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[10px] font-bold text-success">
                คุ้มที่สุด
              </span>
            )}
            <h2 className="font-display text-lg font-bold text-foreground">{tier.name}</h2>
            <p className="mt-1 text-xs text-muted">{tier.tagline}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">฿{tier.price.toLocaleString()}</span>
              <span className="text-xs text-muted">/{tier.period}</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-success">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a href="#request" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:border-foreground/40">
              เลือกแพ็กเกจนี้
            </a>
          </div>
        ))}
      </section>

      <section id="request" className="mt-16 scroll-mt-24 rounded-2xl border border-border bg-surface p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">ขอเปิดร้าน</h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              กรอกข้อมูลร้าน แล้วทีมงานจะติดต่อกลับเพื่อเปิดร้านให้
              (ตอนนี้ระบบเปิดร้านโดยผู้ดูแลแพลตฟอร์ม เพื่อให้ตรวจสอบโดเมนและ Shopify ให้ถูกต้องก่อน)
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              <li>• ใช้ Shopify อยู่แล้ว — เชื่อมได้เลย (สินค้าดึงจากร้านจริง)</li>
              <li>• ยังไม่มี Shopify — ใช้แคตตาล็อกเริ่มต้นแล้วปรับทีหลังได้</li>
              <li>• อยากได้โดเมนของตัวเอง เช่น <code className="font-mono">ร้านคุณ.com</code></li>
            </ul>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">ชื่อร้าน · Brand *</span>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={FIELD} placeholder="เช่น คาเฟ่อบอุ่น" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">ช่องทางติดต่อ · Contact *</span>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={FIELD} placeholder="อีเมล / เบอร์โทร / LINE ID" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">รายละเอียดเพิ่มเติม · Note</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-foreground/50 transition-colors"
                placeholder="ขายอะไร ใช้ Shopify อยู่ไหม อยากได้แพ็กเกจไหน"
              />
            </label>

            {/* honeypot — humans never fill this */}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="hidden"
              aria-hidden="true"
            />

            {state.ok && (
              <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success" role="status">
                ✓ ได้รับคำขอแล้ว ทีมงานจะติดต่อกลับ
              </p>
            )}
            {state.error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                ✕ {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={state.busy}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {state.busy ? 'กำลังส่ง…' : 'ส่งคำขอเปิดร้าน'}
            </button>
            <p className="text-[11px] text-muted">
              คำขอจะถูกบันทึกในระบบจริง และผู้ดูแลเห็นในคิว (ไม่ใช่ฟอร์มหลอก)
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
