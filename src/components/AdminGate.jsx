import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useCatalog } from '../context/CatalogContext';

/**
 * Gate for the admin area (/dashboard, /clients, /settings).
 *
 * These pages used to be fully public: anyone could read every store's revenue
 * from /api/dashboard and register stores through /api/tenants. The APIs are now
 * session-protected; this component is the matching UI.
 */

const FIELD = 'h-11 w-full rounded-xl border border-silver-900/80 bg-background/60 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-silver-500 transition-colors';
const LABEL = 'mb-1.5 block text-xs font-semibold text-silver-200';
const PRIMARY = 'inline-flex h-11 items-center justify-center rounded-xl bg-metallic-button hover:bg-metallic-button-hover px-6 text-sm font-bold text-background border border-silver-400/30 shadow-apple-sm transition-all disabled:opacity-50';

function Shell({ children }) {
  return (
    <div className="admin-light min-h-screen flex items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-silver-900/70 bg-glass p-8 backdrop-blur-xl">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Silver Surface</p>
          <h1 className="mt-1 font-display text-xl font-extrabold tracking-apple-tight">Admin · ผู้ดูแลระบบ</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminGate({ children }) {
  const { loading, authenticated, user, stores, canAccessCurrentStore, setupRequired, error, login, setup, logout, refresh } = useAdminAuth();
  const { store } = useCatalog();

  const [mode, setMode] = useState(setupRequired ? 'setup' : 'login');
  const [form, setForm] = useState({ email: '', password: '', name: '', token: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-sm text-muted" role="status">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          กำลังตรวจสอบสิทธิ์…
        </div>
      </Shell>
    );
  }

  if (!authenticated) {
    const isSetup = mode === 'setup' || setupRequired;
    const submit = async (e) => {
      e.preventDefault();
      setBusy(true);
      setMessage(null);
      try {
        if (isSetup) {
          await setup({ token: form.token, email: form.email, password: form.password, name: form.name });
        } else {
          await login(form.email, form.password);
        }
      } catch (err) {
        const map = {
          invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
          too_many_attempts: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที',
          invalid_setup_token: 'Setup token ไม่ถูกต้อง',
          weak_password: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
          invalid_email: 'อีเมลไม่ถูกต้อง',
          setup_already_done: 'มีผู้ดูแลอยู่แล้ว — เข้าสู่ระบบปกติ',
          setup_disabled: 'ยังไม่ได้ตั้งค่า ADMIN_SETUP_TOKEN ที่ Cloudflare',
        };
        setMessage({ type: 'error', text: map[err.message] || `ไม่สำเร็จ: ${err.message}` });
      } finally {
        setBusy(false);
      }
    };

    return (
      <Shell>
        {isSetup ? (
          <p className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            ยังไม่มีผู้ดูแลในระบบ — สร้างบัญชีแรกด้วย Setup token ที่ตั้งไว้ใน Cloudflare (ADMIN_SETUP_TOKEN)
          </p>
        ) : (
          <p className="mb-5 text-xs text-muted">เข้าสู่ระบบเพื่อดูแดชบอร์ดและข้อมูลร้าน</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {isSetup && (
            <label className="block">
              <span className={LABEL}>Setup token</span>
              <input type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} className={FIELD} placeholder="ค่าของ ADMIN_SETUP_TOKEN" required />
            </label>
          )}
          {isSetup && (
            <label className="block">
              <span className={LABEL}>ชื่อที่แสดง · Display name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD} placeholder="เช่น เจ้าของร้าน" />
            </label>
          )}
          <label className="block">
            <span className={LABEL}>อีเมล · Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={FIELD} placeholder="you@example.com" required autoComplete="username" />
          </label>
          <label className="block">
            <span className={LABEL}>รหัสผ่าน · Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={FIELD} placeholder={isSetup ? 'อย่างน้อย 8 ตัวอักษร' : '••••••••'} required autoComplete={isSetup ? 'new-password' : 'current-password'} />
          </label>

          {message && (
            <p className={`rounded-xl px-3 py-2 text-xs ${message.type === 'error' ? 'border border-destructive/30 bg-destructive/10 text-destructive' : 'border border-success/30 bg-success/10 text-success'}`} role="alert">
              {message.text}
            </p>
          )}

          <button type="submit" disabled={busy} className={`${PRIMARY} w-full`}>
            {busy ? 'กำลังดำเนินการ…' : isSetup ? 'สร้างผู้ดูแลและเข้าใช้' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {!setupRequired && (
          <button
            type="button"
            onClick={() => setMode(isSetup ? 'login' : 'setup')}
            className="mt-4 w-full text-center text-[11px] text-muted underline hover:text-foreground"
          >
            {isSetup ? 'มีบัญชีแล้ว — เข้าสู่ระบบ' : 'ครั้งแรกของระบบ? สร้างผู้ดูแล'}
          </button>
        )}

        {error && <p className="mt-4 text-[11px] text-muted">หมายเหตุ: {error}</p>}
      </Shell>
    );
  }

  if (!canAccessCurrentStore) {
    return (
      <Shell>
        <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          บัญชีนี้ไม่มีสิทธิ์เข้าถึงร้าน <span className="font-mono">{store?.slug || '—'}</span>
        </p>
        <p className="mb-4 text-xs text-muted">ร้านที่คุณเข้าถึงได้:</p>
        <ul className="space-y-2">
          {stores.map((s) => (
            <li key={s.id}>
              <a
                href={`/dashboard?store=${encodeURIComponent(s.slug || s.id)}`}
                className="flex items-center justify-between rounded-xl border border-silver-900/70 bg-background/60 px-4 py-3 text-sm hover:border-silver-600/80 transition-colors"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-[11px] text-muted">{s.slug}</span>
              </a>
            </li>
          ))}
          {stores.length === 0 && <li className="text-sm text-muted">ยังไม่มีร้านที่ผูกกับบัญชีนี้</li>}
        </ul>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={refresh} className="h-10 flex-1 rounded-xl border border-silver-800/80 bg-glass-light text-sm font-semibold">
            ตรวจสอบอีกครั้ง
          </button>
          <button type="button" onClick={logout} className="h-10 flex-1 rounded-xl border border-silver-800/80 bg-glass-light text-sm font-semibold">
            ออกจากระบบ
          </button>
        </div>
        <p className="mt-4 text-[11px] text-muted">เข้าสู่ระบบเป็น {user?.email}</p>
      </Shell>
    );
  }

  return children;
}
