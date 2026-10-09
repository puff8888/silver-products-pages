import React, { useState } from 'react';

/**
 * Public order tracking (audit fix #2).
 *
 * The deployed version was pure theatre: any input — a real order id or
 * "garbage-xyz-999" — produced the same hard-coded "Order #BS-12345" card with
 * "Estimated Delivery: Oct 10 - Oct 12". Customers could not track anything.
 * This now queries the real order in D1 via GET /api/orders?id=SS-######.
 */

const ID_RE = /^SS-\d{6}$/;

const STEPS = [
  { key: 'received', label: 'รับคำสั่งซื้อ', en: 'Order received' },
  { key: 'confirmed', label: 'ยืนยันคำสั่งซื้อ', en: 'Order confirmed' },
  { key: 'packed', label: 'แพ็คสินค้า', en: 'Packed' },
  { key: 'shipped', label: 'จัดส่งแล้ว', en: 'Shipped' },
  { key: 'delivered', label: 'ส่งถึงแล้ว', en: 'Delivered' },
];

function stepIndexFor(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('deliver')) return 4;
  if (s.includes('ship')) return 3;
  if (s.includes('pack')) return 2;
  if (s.includes('confirm') || s.includes('paid')) return 1;
  return 0; // Pending
}

export default function OrderLookup() {
  const [orderId, setOrderId] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  const submit = async (e) => {
    e.preventDefault();
    const id = orderId.trim().toUpperCase();

    if (!ID_RE.test(id)) {
      setState({ status: 'invalid', message: 'เลขคำสั่งซื้อต้องอยู่ในรูปแบบ SS-###### (เช่น SS-123456)' });
      return;
    }

    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setState({ status: 'notfound', id });
        return;
      }
      if (!res.ok) {
        setState({ status: 'error', message: `ระบบตอบกลับ HTTP ${res.status} — ลองใหม่อีกครั้ง` });
        return;
      }
      const data = await res.json();
      if (!data.order) {
        setState({ status: 'error', message: 'รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง' });
        return;
      }
      setState({ status: 'found', order: data.order });
    } catch (err) {
      setState({ status: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่' });
    }
  };

  const order = state.status === 'found' ? state.order : null;
  const currentStep = order ? stepIndexFor(order.status) : 0;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Track Your Order</h1>
        <p className="mt-2 text-sm text-muted">ติดตามคำสั่งซื้อ</p>

        <form onSubmit={submit} className="mt-8 flex gap-3">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. SS-123456"
            required
            aria-label="Order number"
            className="flex-grow h-12 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors"
          />
          <button
            type="submit"
            disabled={state.status === 'loading'}
            className="h-12 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {state.status === 'loading' ? 'กำลังค้นหา…' : 'Track'}
          </button>
        </form>

        <p className="mt-2 text-xs text-muted">
          เลขคำสั่งซื้ออยู่ในหน้าขอบคุณหลังสั่งซื้อ และในอีเมลยืนยันคำสั่งซื้อ
        </p>

        {state.status === 'invalid' && (
          <p className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
            {state.message}
          </p>
        )}

        {state.status === 'error' && (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}

        {state.status === 'notfound' && (
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-left" role="alert">
            <h2 className="font-display text-xl font-bold">ไม่พบคำสั่งซื้อ {state.id}</h2>
            <p className="mt-2 text-sm text-muted">
              เราไม่พบเลขคำสั่งซื้อนี้ในระบบ — ตรวจสอบตัวอักษร/ตัวเลขอีกครั้ง
              หรือติดต่อร้านพร้อมแนบเลขคำสั่งซื้อเพื่อให้เราช่วยตรวจสอบ
            </p>
            <p className="mt-2 text-xs text-muted">
              We could not find this order number. Please double-check it, or contact us with the number.
            </p>
          </div>
        )}

        {order && (
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-left">
            <h2 className="font-display text-xl font-bold">Order #{order.order_id}</h2>
            <p className="mt-1 text-sm text-muted">
              สถานะปัจจุบัน · Current status: <span className="font-semibold text-foreground">{order.status}</span>
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">ยอดรวม · Total</dt>
                <dd className="font-semibold tabular-nums">฿{Number(order.total_amount).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">วิธีชำระเงิน · Payment</dt>
                <dd className="font-semibold">{order.payment_method || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">วันที่สั่งซื้อ · Placed</dt>
                <dd className="font-semibold">
                  {order.created_at ? new Date(order.created_at.replace(' ', 'T') + 'Z').toLocaleString('th-TH') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">ผู้สั่งซื้อ · Customer</dt>
                <dd className="font-semibold">{order.customer_name_masked || '—'}</dd>
              </div>
            </dl>

            <div className="relative mt-8 pl-6 border-l-2 border-border space-y-8">
              {STEPS.map((s, i) => {
                const done = i <= currentStep;
                return (
                  <div key={s.key} className={`relative ${done ? '' : 'opacity-40'}`}>
                    <div className={`absolute -left-[35px] top-1 size-4 rounded-full ${done ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-border'}`} />
                    <h4 className="text-sm font-semibold">{s.label}</h4>
                    <span className="text-xs text-muted">{done ? s.en : 'Pending'}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-muted leading-relaxed">
              สถานะจะอัปเดตเมื่อร้านยืนยัน/จัดส่ง — ระบบจะไม่แสดงวันจัดส่งโดยประมาณจนกว่าจะมีการจัดส่งจริง
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
