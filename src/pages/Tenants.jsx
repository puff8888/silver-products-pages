import React, { useState, useEffect, useCallback } from 'react';
import { AdminShell, AdminHeader, MetalCard } from '../components/admin';

/**
 * Clients / tenant onboarding (audit fix #4).
 *
 * Two bugs in the deployed version:
 *   1. A failed POST (e.g. HTTP 500) still showed "Registered — awaiting your
 *      approval.", so the user believed the write succeeded.
 *   2. The failure path replaced the list loaded from the API with the
 *      localStorage-only list, which made the real client (BC Activewear)
 *      disappear from the screen until a reload.
 *
 * Demo/offline mode still exists, but it is now explicit: it is only entered
 * when the API cannot be reached, it says so in the header and in every
 * message, and it never overwrites API-sourced data.
 */

const TEMPLATES_SEEDED = '2 carousel SKU templates (Meta + TikTok)';
const DEMO_STORAGE_KEY = 'ss_tenants_mock';

function readDemoTenants() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function Tenants() {
  const [liveTenants, setLiveTenants] = useState([]);
  const [demoTenants, setDemoTenants] = useState([]);
  const [live, setLive] = useState(null); // null = ยังไม่รู้, true = ต่อ API ได้, false = demo mode
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ name: '', shopify_domain: '', contact_email: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  // Per-store admin panel (branding + per-store Shopify token)
  const [selected, setSelected] = useState(null);
  const [panelForm, setPanelForm] = useState({});
  const [tokenValue, setTokenValue] = useState('');
  const [panelMsg, setPanelMsg] = useState(null);
  const [panelBusy, setPanelBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.tenants)) throw new Error('bad shape');
      setLiveTenants(data.tenants);
      setLive(true);
      setLoadError(null);
    } catch (err) {
      setLive(false);
      setDemoTenants(readDemoTenants());
      setLoadError(`โหลดรายชื่อลูกค้าจากเซิร์ฟเวอร์ไม่ได้ (${err.message}) — กำลังแสดงข้อมูลตัวอย่างในเครื่องนี้`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (action, payload) => {
    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');

    const isApprove = action === 'approve';
    const label = isApprove ? `Approved ${payload.name || ''}`.trim() : 'Registered';

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && err.error) detail = `${err.error} (HTTP ${res.status})`;
        } catch { /* keep the status text */ }
        throw new Error(detail);
      }

      setSuccessMsg(
        isApprove
          ? `${label} — เปิดพื้นที่งานและ seed เทมเพลตแล้ว (บันทึกที่เซิร์ฟเวอร์แล้ว)`
          : 'ลงทะเบียนแล้ว — รอการอนุมัติ (บันทึกที่เซิร์ฟเวอร์แล้ว)'
      );
      setForm({ name: '', shopify_domain: '', contact_email: '' });
      await load();
    } catch (err) {
      setErrorMsg(
        `บันทึกไม่สำเร็จ: ${err.message} — ข้อมูลยังไม่ถูกบันทึกที่เซิร์ฟเวอร์ กรุณาลองใหม่`
      );
      // Deliberately NOT writing to localStorage and NOT touching the API-sourced
      // list: a failed write must not look like a successful one.
    } finally {
      setBusy(false);
    }
  };

  // The list that is actually displayed. Demo entries only ever appear in demo
  // mode, so real data can never be replaced by local placeholders.
  const openStore = (tenant) => {
    setSelected(tenant);
    setTokenValue('');
    setPanelMsg(null);
    setCredentials(null);
    // Which credentials exist (hint only — values are never readable)
    fetch(`/api/tenants/credentials?tenant_id=${encodeURIComponent(tenant.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCredentials(data ? data.credentials : null))
      .catch(() => setCredentials(null));
    setPanelForm({
      name: tenant.name || '',
      tagline: tenant.tagline || '',
      brand_color: tenant.brand_color || '#8e8e93',
      logo_url: tenant.logo_url || '',
      shopify_domain: tenant.shopify_domain || '',
      plan: tenant.plan || 'starter',
      is_public: !!tenant.is_public,
      meta_pixel_id: tenant.meta_pixel_id || '',
      tiktok_pixel_id: tenant.tiktok_pixel_id || '',
      line_tag_id: tenant.line_tag_id || '',
    });
  };

  const callJson = async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const saveStoreSettings = async () => {
    if (!selected) return;
    setPanelBusy(true);
    setPanelMsg(null);
    try {
      await callJson('/api/tenants', {
        action: 'update',
        id: selected.id,
        ...panelForm,
        is_public: panelForm.is_public,
      });
      setPanelMsg({ type: 'ok', text: 'บันทึกการตั้งค่าร้านแล้ว' });
      await load();
    } catch (err) {
      setPanelMsg({ type: 'err', text: `บันทึกไม่สำเร็จ: ${err.message}` });
    } finally {
      setPanelBusy(false);
    }
  };

  const saveStoreToken = async () => {
    if (!selected || tokenValue.trim().length < 8) {
      setPanelMsg({ type: 'err', text: 'token สั้นเกินไป (ต้องยาวอย่างน้อย 8 ตัวอักษร)' });
      return;
    }
    setPanelBusy(true);
    setPanelMsg(null);
    try {
      const data = await callJson('/api/tenants/credentials', {
        tenant_id: selected.id,
        provider: 'shopify_admin_token',
        value: tokenValue.trim(),
      });
      setTokenValue('');
      setPanelMsg({ type: 'ok', text: `เก็บ token แบบเข้ารหัสแล้ว (${data.hint}) — ระบบอ่านกลับไม่ได้` });
      await load();
    } catch (err) {
      setPanelMsg({ type: 'err', text: `เก็บ token ไม่สำเร็จ: ${err.message}` });
    } finally {
      setPanelBusy(false);
    }
  };

  const seedStore = async (tenant) => {
    setPanelBusy(true);
    setPanelMsg(null);
    try {
      const data = await callJson('/api/tenants', { action: 'approve', id: tenant.id });
      setPanelMsg({ type: 'ok', text: `Seed สำเร็จ — เทมเพลต ${data.seeded_templates} รายการ` });
      await load();
      if (selected && selected.id === tenant.id) setSelected(data.tenant || selected);
    } catch (err) {
      setPanelMsg({ type: 'err', text: `Seed ไม่สำเร็จ: ${err.message}` });
    } finally {
      setPanelBusy(false);
    }
  };

  const tenants = live === false ? demoTenants : liveTenants;
  const pending = tenants.filter((t) => t.status === 'pending');
  const active = tenants.filter((t) => t.status !== 'pending');

  const eyebrow = loading
    ? 'Loading…'
    : live === false
      ? 'Preview · Demo data (not saved to server)'
      : 'Live · Connected';

  return (
    <AdminShell>
      <AdminHeader
        eyebrow={eyebrow}
        title="Clients"
        titleTh="ลงทะเบียนลูกค้า → อนุมัติ → เปิดพื้นที่งานอัตโนมัติ"
        description="New client registers → you approve → their carousel workspace (SKU templates for Meta + TikTok) is created automatically. Each client gets their own workspace — no manual setup."
      />

      {loadError && (
        <p className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning" role="status">
          ⚠️ {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetalCard className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-foreground">Register a client</h2>
          <p className="mt-1 text-sm text-muted">
            Goes to <strong>pending</strong> — nothing is seeded until you approve.
          </p>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">Brand name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. BC Activewear"
                className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-foreground/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">Shopify domain</span>
              <input
                value={form.shopify_domain}
                onChange={(e) => setForm({ ...form, shopify_domain: e.target.value })}
                placeholder="brand.myshopify.com"
                className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-foreground/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">Contact email</span>
              <input
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="owner@brand.com"
                type="email"
                className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-foreground/50"
              />
            </label>
            <button
              type="button"
              disabled={form.name.trim().length < 2 || busy || live === false}
              onClick={() => submit(undefined, form)}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? 'กำลังบันทึก…' : 'Register → Pending'}
            </button>
            {live === false && (
              <p className="text-xs text-muted">
                ปิดการลงทะเบียนชั่วคราว เพราะยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ไม่ให้บันทึกแล้วเข้าใจผิดว่าสำเร็จ)
              </p>
            )}
            {successMsg && (
              <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success" role="status">
                ✓ {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                ✕ {errorMsg}
              </p>
            )}
          </div>
        </MetalCard>

        <MetalCard className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-foreground">Pending approvals ({pending.length})</h2>
          <p className="mt-1 text-sm text-muted">
            Approving flips status to <strong>active</strong> + seeds {TEMPLATES_SEEDED}.
          </p>
          <div className="mt-5 space-y-3">
            {loading && <div className="animate-pulse h-16 bg-surface-500/60 rounded-xl" />}
            {!loading && pending.length === 0 && <p className="text-sm text-muted">No pending clients. 🎉</p>}
            {pending.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{t.shopify_domain || t.contact_email || t.id}</p>
                </div>
                <button
                  type="button"
                  disabled={busy || live === false}
                  onClick={() => submit('approve', { id: t.id, name: t.name })}
                  className="inline-flex h-10 shrink-0 items-center rounded-xl bg-metallic-button px-4 text-[13px] font-bold text-background border border-silver-400/30 disabled:opacity-40"
                >
                  Approve + Seed
                </button>
              </div>
            ))}
          </div>
        </MetalCard>
      </div>

      <MetalCard className="mt-6 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Active clients ({active.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-3 pr-4 font-semibold">Brand</th>
                <th className="pb-3 pr-4 font-semibold">Shopify</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Templates</th>
                <th className="pb-3 pr-4 font-semibold">Approved</th>
                <th className="pb-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {active.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="py-3 pr-4 font-semibold text-foreground">
                    {t.name}
                    <span className="block font-mono text-[11px] font-normal text-muted">{t.slug}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">{t.shopify_domain || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-success/10 border border-success/20 px-2.5 py-1 text-[11px] font-bold text-success">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-muted">
                    {t.templates ?? '—'}
                    {t.credentials_set > 0 && (
                      <span className="ml-2 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                        token {t.credentials_set}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted">
                    {t.approved_at ? new Date(t.approved_at.replace(' ', 'T') + 'Z').toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {(!t.templates || t.templates === 0) && (
                        <button
                          type="button"
                          disabled={panelBusy || live === false}
                          onClick={() => seedStore(t)}
                          className="inline-flex h-9 items-center rounded-lg bg-metallic-button px-3 text-[12px] font-bold text-background border border-silver-400/30 disabled:opacity-40"
                        >
                          Approve + Seed
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openStore(t)}
                        className="inline-flex h-9 items-center rounded-lg border border-silver-800/80 bg-glass-light px-3 text-[12px] font-semibold text-foreground hover:border-silver-600/80 transition-colors"
                      >
                        ตั้งค่าร้าน
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && active.length === 0 && (
                <tr className="border-t border-border/60">
                  <td colSpan="6" className="py-4 text-sm text-muted">No active clients yet — approve one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </MetalCard>

      {/* ── Per-store settings: branding + Shopify token (admin) ── */}
      {selected && (
        <MetalCard className="mt-6 p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                ตั้งค่าร้าน · {selected.name}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {selected.slug} · {selected.id}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-xs text-muted underline hover:text-foreground">
              ปิด
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">ชื่อร้าน · Brand</span>
              <input value={panelForm.name || ''} onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">Shopify domain</span>
              <input value={panelForm.shopify_domain || ''} onChange={(e) => setPanelForm({ ...panelForm, shopify_domain: e.target.value })} placeholder="brand.myshopify.com" className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">แท็กไลน์ · Tagline</span>
              <input value={panelForm.tagline || ''} onChange={(e) => setPanelForm({ ...panelForm, tagline: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">โลโก้ · Logo URL</span>
              <input value={panelForm.logo_url || ''} onChange={(e) => setPanelForm({ ...panelForm, logo_url: e.target.value })} placeholder="https://…/logo.png" className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">สีแบรนด์ · Brand colour</span>
              <span className="flex items-center gap-3">
                <input type="color" value={panelForm.brand_color || '#8e8e93'} onChange={(e) => setPanelForm({ ...panelForm, brand_color: e.target.value })} className="h-11 w-14 rounded-lg border border-border bg-background/60" />
                <input value={panelForm.brand_color || ''} onChange={(e) => setPanelForm({ ...panelForm, brand_color: e.target.value })} className="h-11 flex-1 rounded-xl border border-border bg-background/60 px-4 font-mono text-sm" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-silver-200">แพ็กเกจ · Plan</span>
              <select value={panelForm.plan || 'starter'} onChange={(e) => setPanelForm({ ...panelForm, plan: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 text-sm">
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="pro">pro</option>
              </select>
            </label>
            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" checked={!!panelForm.is_public} onChange={(e) => setPanelForm({ ...panelForm, is_public: e.target.checked })} className="size-4" />
              <span className="text-sm text-muted">แสดงร้านนี้ในไดเรกทอรีสาธารณะ (/stores)</span>
            </label>

            <div className="sm:col-span-2 mt-2 border-t border-silver-900/70 pt-4">
              <h3 className="text-sm font-bold text-foreground">พิกเซลโฆษณาของร้านนี้</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                ใช้ค่าเหล่านี้ตอนเปิดหน้าเว็บ (runtime) — แต่ละร้านมีพิกเซลของตัวเอง ไม่ใช้ค่าตอน build
                ค่าเหล่านี้เป็นค่าสาธารณะ (ฝังอยู่ในหน้าเว็บอยู่แล้ว) ไม่ใช่ความลับ
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-silver-200">Meta Pixel ID</span>
                  <input value={panelForm.meta_pixel_id || ''} onChange={(e) => setPanelForm({ ...panelForm, meta_pixel_id: e.target.value })} placeholder="123456789012345" className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 font-mono text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-silver-200">TikTok Pixel ID</span>
                  <input value={panelForm.tiktok_pixel_id || ''} onChange={(e) => setPanelForm({ ...panelForm, tiktok_pixel_id: e.target.value })} placeholder="C1234ABCD5678" className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 font-mono text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-silver-200">LINE Tag ID</span>
                  <input value={panelForm.line_tag_id || ''} onChange={(e) => setPanelForm({ ...panelForm, line_tag_id: e.target.value })} placeholder="LNT-…" className="h-11 w-full rounded-xl border border-border bg-background/60 px-4 font-mono text-sm" />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={panelBusy} onClick={saveStoreSettings} className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              บันทึกการตั้งค่า
            </button>
            {(!selected.templates || selected.templates === 0) && (
              <button type="button" disabled={panelBusy} onClick={() => seedStore(selected)} className="inline-flex h-10 items-center rounded-xl bg-metallic-button px-5 text-[13px] font-bold text-background border border-silver-400/30 disabled:opacity-50">
                Approve + Seed (2 เทมเพลต)
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-silver-900/70 pt-5">
            <h3 className="text-sm font-bold text-foreground">Shopify Admin token (เข้ารหัสก่อนเก็บ)</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              เก็บด้วย AES-256-GCM — ระบบอ่านค่ากลับมาแสดงไม่ได้ (แสดงได้แค่ 4 ตัวท้าย)
              {selected.credentials_set > 0 && ' · มี token อยู่แล้ว การบันทึกจะทับของเดิม'}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                type="password"
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                placeholder="shpat_…"
                className="h-10 min-w-[240px] flex-1 rounded-xl border border-border bg-background/60 px-4 font-mono text-sm"
              />
              <button type="button" disabled={panelBusy} onClick={saveStoreToken} className="inline-flex h-10 items-center rounded-xl border border-silver-800/80 bg-glass-light px-5 text-sm font-semibold text-foreground hover:border-silver-600/80 transition-colors disabled:opacity-50">
                เก็บ token
              </button>
            </div>

            {credentials && Object.keys(credentials).length > 0 && (
              <ul className="mt-3 space-y-1 text-[11px] text-muted">
                {Object.entries(credentials).map(([provider, info]) => (
                  <li key={provider} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-foreground/80">{provider}</span>
                    <span className="rounded-full border border-silver-900/70 bg-background/60 px-2 py-0.5">ท้าย {info.hint}</span>
                    <span>อัปเดต {info.updated_at}</span>
                    <span className="text-muted/70">
                      — เทียบ 4 ตัวท้ายนี้กับ token จริงของคุณ ถ้าไม่ตรงแปลว่าคัดลอกมาไม่ครบ
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {credentials && Object.keys(credentials).length === 0 && (
              <p className="mt-3 text-[11px] text-muted">ยังไม่มี token เก็บไว้สำหรับร้านนี้</p>
            )}
          </div>

          {panelMsg && (
            <p
              className={`mt-4 rounded-xl px-3 py-2 text-xs ${
                panelMsg.type === 'ok'
                  ? 'border border-success/30 bg-success/10 text-success'
                  : 'border border-destructive/30 bg-destructive/10 text-destructive'
              }`}
              role={panelMsg.type === 'ok' ? 'status' : 'alert'}
            >
              {panelMsg.type === 'ok' ? '✓ ' : '✕ '}{panelMsg.text}
            </p>
          )}
        </MetalCard>
      )}
    </AdminShell>
  );
}
