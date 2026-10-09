import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoginModal from './LoginModal';

const NAV_LINKS = [
  { to: '/', label: 'Home', match: (p) => p === '/' },
  { to: '/product', label: 'Collection', match: (p) => p.startsWith('/product') },
  { to: '/order', label: 'Track Order', match: (p) => p.startsWith('/order') },
];

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group/brand shrink-0" aria-label="Silver Surface home">
      <div className="flex items-center justify-center size-8 rounded-lg bg-metallic-button text-background shadow-apple-sm border border-silver-400/30
                      group-hover/brand:bg-metallic-button-hover group-hover/brand:shadow-apple group-hover/brand:scale-105
                      transition-all duration-220 ease-apple">
        <svg width="16" height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
        </svg>
      </div>
      <span className="font-display font-sans text-[14px] font-extrabold tracking-apple-tight text-foreground
                       group-hover/brand:opacity-80 transition-opacity duration-200 ease-apple hidden xs:inline sm:inline">
        SILVER SURFACE
      </span>
    </Link>
  );
}

function AccountButton({ onOpenLogin }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  if (!user) {
    return (
      <button
        onClick={onOpenLogin}
        className="hidden sm:inline-flex items-center gap-2 h-10 pl-3.5 pr-4 rounded-full
                   bg-metallic-button hover:bg-metallic-button-hover text-background
                   text-[13px] font-bold tracking-apple-wide
                   border border-silver-400/30 shadow-apple-sm hover:shadow-apple hover:-translate-y-px active-scale
                   transition-all duration-220 ease-apple"
      >
        <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Sign in
      </button>
    );
  }

  const initial = (user.name || 'S').trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast('ออกจากระบบแล้ว / Signed out');
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={`Account — ${user.name}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border transition-all duration-220 ease-apple active-scale
                    ${menuOpen
                      ? 'border-silver-500 bg-surface-100/90 shadow-apple-sm text-foreground'
                      : 'border-silver-800/80 bg-glass-light text-silver-300 hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80'}`}
      >
        <span className="flex items-center justify-center size-7 rounded-full bg-metallic-button text-background text-[12px] font-extrabold border border-silver-400/30">
          {initial}
        </span>
        <span className="max-w-[90px] truncate text-[13px] font-bold">{user.name}</span>
        <svg className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl bg-glass border border-silver-900/80 shadow-apple-2xl backdrop-blur-2xl p-2 fade-in z-50">
          <div className="px-3 pt-2 pb-3 border-b border-silver-900/70 mb-1">
            <p className="text-[14px] font-bold text-foreground truncate">{user.name}</p>
            <p className="text-[12px] text-muted truncate">{user.email}</p>
          </div>
          <Link
            to="/order"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-surface-100/70 transition-colors"
          >
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            My Orders
          </Link>
          <Link
            to="/cart"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-surface-100/70 transition-colors"
          >
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            My Bag
          </Link>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (location.pathname === '/order/confirmation') return null;

  const openLogin = () => {
    setMobileMenuOpen(false);
    setLoginOpen(true);
  };

  return (
    <div className="sticky top-0 z-40">
      <header className="border-b border-silver-900/70 bg-glass backdrop-blur-xl supports-[backdrop-filter]:bg-surface-600/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <BrandMark />

          {/* ─── Center: redesigned pill nav (desktop) ─── */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5 p-1 rounded-full bg-surface-500/80 border border-silver-900/80 shadow-inner-glow backdrop-blur-sm">
            {NAV_LINKS.map((link) => {
              const active = link.match(location.pathname);
              return (
                <NavLink
                  key={link.to + link.label}
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-4 lg:px-5 py-2 rounded-full text-[13px] font-semibold tracking-apple-wide whitespace-nowrap transition-all duration-200 ease-apple active-scale
                    ${active
                      ? 'bg-metallic-button text-background shadow-apple-sm border border-silver-400/30'
                      : 'text-muted hover:text-foreground hover:bg-white/[0.04] border border-transparent'
                    }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          {/* ─── Right: login + utility icons ─── */}
          <div className="flex items-center gap-2.5">
            <AccountButton onOpenLogin={openLogin} />

            <Link
              to="/cart"
              aria-label={`Shopping cart, ${itemCount} items`}
              title="Shopping cart"
              className="hidden md:inline-flex relative items-center justify-center size-10 rounded-full
                         border border-silver-800/80 bg-glass-light text-silver-300
                         hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm
                         transition-all duration-220 ease-apple active-scale"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full
                                 bg-destructive text-white px-1 text-[10px] font-extrabold tabular-nums
                                 border border-background shadow-apple-sm ring-2 ring-background">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            <Link
              to="/dashboard"
              aria-label="Client Dashboard & Analytics"
              title="Client Dashboard & Analytics"
              className="hidden lg:inline-flex items-center justify-center size-10 rounded-full
                         border border-silver-800/80 bg-glass-light text-silver-300
                         hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm
                         transition-all duration-220 ease-apple active-scale"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex size-10 items-center justify-center rounded-full
                         border border-silver-800/80 bg-glass-light text-foreground
                         hover:bg-surface-100/90 hover:shadow-apple-sm
                         transition-all duration-220 ease-apple active-scale shadow-apple-xs"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Mobile menu ─── */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-silver-900/70 bg-glass backdrop-blur-2xl px-4 py-5">
            {user ? (
              <div className="flex items-center gap-3 rounded-2xl border border-silver-900/80 bg-surface-500/60 px-4 py-3 mb-3">
                <span className="flex items-center justify-center size-10 rounded-full bg-metallic-button text-background text-[14px] font-extrabold border border-silver-400/30 shrink-0">
                  {(user.name || 'S').trim().charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground truncate">{user.name}</p>
                  <p className="text-[12px] text-muted truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { logout(); toast('ออกจากระบบแล้ว / Signed out'); }}
                  className="text-[12px] font-bold text-destructive hover:opacity-80 transition-opacity shrink-0"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl mb-3
                           bg-metallic-button hover:bg-metallic-button-hover text-background
                           text-[14px] font-bold tracking-wide shadow-apple active-scale
                           border border-silver-400/30 transition-all"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Sign in / เข้าสู่ระบบ
              </button>
            )}
            <nav className="flex flex-col gap-2 font-sans" aria-label="Mobile">
              {[
                { to: '/', label: 'Home' },
                { to: '/product', label: 'Collection' },
                { to: '/order', label: 'Track Order' },
                { to: '/cart', label: 'Cart', badge: itemCount > 0 ? itemCount : null },
                { to: '/dashboard', label: 'Client Dashboard', muted: true },
              ].map((item) => (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  className={`flex items-center justify-between rounded-apple px-4 py-3 border border-transparent
                              hover:bg-surface-100/70 hover:border-silver-800/60
                              transition-all duration-200 ease-apple active-scale
                              ${item.muted ? 'text-[14px] font-medium text-muted hover:text-foreground' : 'text-[15px] font-bold text-foreground'}`}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.badge != null && (
                      <span className="bg-metallic-button text-background text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-silver-400/40 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <svg className="w-[18px] h-[18px] text-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
