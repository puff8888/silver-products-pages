import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Public store directory — the equivalent of the membership platform's /demo.
 * Lists every store that opted in (tenants.is_public = 1) and links to its own
 * storefront (subdomain in production, ?store=<slug> in development).
 */

export default function StoreDirectory() {
  const [state, setState] = useState({ loading: true, stores: [], current: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stores')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, stores: data.stores || [], current: data.current_store || null, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, stores: [], current: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Stores · ร้านค้าในระบบ</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">ร้านค้าที่ใช้ระบบของเรา</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
        แต่ละร้านมีหน้าร้าน แบรนด์ และข้อมูลของตัวเองแยกกันโดยสมบูรณ์ — ทั้งสินค้า ออเดอร์ และสถิติการตลาด
        (เลือกดูร้านด้านล่างได้เลย)
      </p>

      {state.loading && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />)}
        </div>
      )}

      {!state.loading && state.stores.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-sm text-muted">
          <p className="font-semibold text-foreground">ยังไม่มีร้านที่เปิดแสดงในไดเรกทอรีนี้</p>
          <p className="mt-2 leading-relaxed">
            ร้านจะปรากฏที่นี่เมื่อผู้ดูแลตั้งค่า <code className="font-mono">is_public</code> ให้ร้านนั้น
            (สถานะต้องเป็น active ด้วย) — ถ้าคุณเป็นเจ้าของระบบ เข้าไปเปิดได้ที่หน้า{' '}
            <Link to="/clients" className="underline hover:text-foreground">Clients</Link>
          </p>
          {state.error && <p className="mt-3 text-xs text-destructive">โหลดรายการไม่สำเร็จ: {state.error}</p>}
        </div>
      )}

      {!state.loading && state.stores.length > 0 && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {state.stores.map((store) => (
            <a
              key={store.slug}
              href={store.url}
              className="group card flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-220 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: store.brand_color || '#8e8e93' }} />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-foreground">{store.name}</h2>
                  {store.is_current && (
                    <span className="shrink-0 rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[10px] font-bold text-success">
                      ร้านนี้
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">{store.slug}</p>
                <p className="mt-3 flex-1 text-sm text-muted leading-relaxed">
                  {store.tagline || 'ร้านค้าในระบบ Silver Surface'}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="rounded-full border border-border px-2.5 py-1 font-semibold uppercase tracking-wider text-muted">
                    {store.plan}
                  </span>
                  <span className="font-semibold text-foreground group-hover:underline">ดูหน้าร้าน →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-border bg-surface p-8">
        <h2 className="font-display text-lg font-bold text-foreground">อยากมีหน้าร้านแบบนี้ไหม?</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          ตั้งแบรนด์ แพ็กเกจ และช่องทางโฆษณาของตัวเองได้ แยกข้อมูลจากร้านอื่นทั้งหมด
        </p>
        <Link
          to="/sell"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          ดูราคาและสมัครใช้งาน →
        </Link>
      </div>
    </main>
  );
}
