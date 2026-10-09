import { Link, useLocation } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';

// ─── Shared admin theme — single source of truth ───
// Base = homepage (Storefront) tokens only:
//   page:       bg-background text-foreground + apple-grid + hero-gradient
//   headings:   text-silver-gradient, font-display, tracking-apple-tight
//   eyebrow:    rounded-full border-silver-800/80 bg-glass-light text-silver-300
//   cards:      bg-metallic-card + hairline-border + border-silver-900/80
//   primary:    bg-metallic-button text-background border-silver-400/30
//   secondary:  bg-glass-light border-silver-800/80 hover:border-silver-600/80

const NAV = [
  { to: '/dashboard', label: 'Dashboard', labelTh: 'แดชบอร์ด' },
  { to: '/ads', label: 'Ads Console', labelTh: 'คอนโซลโฆษณา' },
  { to: '/clients', label: 'Clients', labelTh: 'ลูกค้า' },
  { to: '/', label: 'My Page', labelTh: 'หน้าของฉัน' },
  { to: '/settings', label: 'Settings & APIs', labelTh: 'ตั้งค่า' },
];

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group/brand shrink-0" aria-label="Silver Surface home">
      <div className="flex items-center justify-center size-8 rounded-lg bg-metallic-button text-background shadow-apple-sm border border-silver-400/30 group-hover/brand:bg-metallic-button-hover transition-all duration-220">
        <svg width="16" height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
        </svg>
      </div>
      <span>
        <span className="font-display text-[14px] font-extrabold tracking-apple-tight text-foreground block leading-none">SILVER SURFACE</span>
        <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-muted block mt-1">Client CRM &amp; Insights</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children, maxWidth = 'max-w-6xl' }) {
  const location = useLocation();
  const { store } = useCatalog();
  return (
    <div className="admin-light min-h-screen flex flex-col md:flex-row bg-background text-foreground relative overflow-hidden">
      {/* Homepage ambient stack — same as Storefront */}
      <div aria-hidden="true" className="absolute inset-0 apple-grid z-0 pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[480px] hero-gradient z-0 pointer-events-none" />

      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between border-b border-silver-900/70 bg-glass px-4 py-3 sticky top-0 z-30 backdrop-blur-xl relative">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex h-9 items-center rounded-full border border-silver-800/80 bg-glass-light px-3.5 text-xs font-semibold text-silver-200 hover:text-foreground hover:border-silver-600/80 transition-colors"
          >
            Store
          </Link>
          <Link
            to="/settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-silver-800/80 bg-glass-light text-silver-300 hover:text-foreground hover:border-silver-600/80 transition-colors"
            aria-label="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Sidebar — homepage glass + pill nav */}
      <aside className="w-64 shrink-0 border-r border-silver-900/70 bg-glass hidden md:flex flex-col p-6 sticky top-0 h-screen z-10 backdrop-blur-xl relative">
        <div className="mb-8">
          <BrandMark />
        </div>
        <nav className="flex flex-col gap-1.5 p-1 rounded-2xl bg-surface-500/60 border border-silver-900/70" aria-label="Admin">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to + item.label}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 active-scale ${
                  active
                    ? 'bg-metallic-button text-background shadow-apple-sm border border-silver-400/30'
                    : 'text-muted hover:text-foreground hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {item.label}
                <span className={`block text-[11px] font-medium ${active ? 'text-background/70' : 'text-muted/70'}`}>{item.labelTh}</span>
              </Link>
            );
          })}
        </nav>
        {/* Which store is being viewed (multi-store: resolved from the subdomain) */}
        <div className="mt-6 rounded-xl border border-silver-900/70 bg-background/60 p-3 text-[11px]">
          <p className="text-muted">Store · ร้านที่กำลังดู</p>
          <p className="truncate font-semibold text-foreground">
            {store ? (store.name || store.slug) : '…'}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
            {store ? `${store.slug}${store.resolution ? ` · ${store.resolution}` : ''}` : ''}
          </p>
          {store && store.resolved === false && (
            <p className="mt-1 text-[10px] text-warning">ไม่พบร้านนี้ — แสดงร้านเริ่มต้นแทน</p>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-silver-900/70 text-[11px] text-muted leading-relaxed">
          <p className="font-semibold text-silver-200 mb-1">Thai Market Dedicated</p>
          <p>PromptPay · COD · LINE OA</p>
          <p className="mt-2 opacity-70">Currency: THB (฿)</p>
        </div>
      </aside>

      {/* Main */}
      <main className={`relative z-10 flex-1 p-6 md:p-10 w-full ${maxWidth} min-w-0`}>
        {children}
      </main>
    </div>
  );
}

export function AdminHeader({ eyebrow, title, titleTh, description, actions }) {
  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-8">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 rounded-full border border-silver-800/80 bg-glass-light px-3.5 py-1.5 text-[11px] font-semibold text-silver-300 shadow-apple-sm mb-4 tracking-[0.12em] normal-case">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-apple-tight leading-apple-tight text-silver-gradient">
          {title}
          {titleTh && <span className="block text-lg sm:text-xl text-muted/80 font-semibold mt-1 tracking-apple">{titleTh}</span>}
        </h1>
        {description && <p className="mt-3 text-sm text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </header>
  );
}

export function MetalCard({ className = '', children, ...rest }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-metallic-card border border-silver-900/80 hairline-border shadow-apple ${className}`}
      {...rest}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-surface-500/80 border border-silver-900/80 shadow-inner-glow" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`px-4 py-2 min-h-[40px] text-[13px] font-semibold rounded-xl whitespace-nowrap cursor-pointer active-scale transition-all duration-200 ${
              active
                ? 'bg-metallic-button text-background shadow-apple-sm border border-silver-400/30'
                : 'text-muted hover:text-silver-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
