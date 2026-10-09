import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const FREE_SHIPPING_THRESHOLD = 2500;

const TAB_BAG = 'bag';
const TAB_AI = 'ai';

const TABS = [
  { id: TAB_BAG, label: 'Shopping Bag', hint: 'ตะกร้า' },
  { id: TAB_AI, label: 'AI Assistant', hint: 'ช่วยเหลือ' },
];

export default function UnifiedActionDrawer({ open, onClose, defaultTab = TAB_BAG, workerUrl }) {
  const [tab, setTab] = useState(defaultTab);
  const [aiLoading, setAiLoading] = useState(true);
  const iframeRef = useRef(null);
  const tabRefs = useRef(new Map());

  // Keep default tab prop synced on re-open (so callers can control which tab opens)
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Reset iframe loading state when tab becomes AI
  useEffect(() => {
    if (tab === TAB_AI && open) setAiLoading(true);
  }, [tab, open, workerUrl]);

  // Escape key + body scroll lock (shared between both tabs)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Cart data (memoized so recompute only when cart actually changes)
  const { cartItems, updateQuantity, removeFromCart, subtotal, itemCount } = useCart();
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;
  const freeProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Compute the sliding tab indicator position (matches Premium Collection segmented control)
  const indicatorStyle = useMemo(() => {
    const el = tabRefs.current.get(tab);
    if (!el) return { left: 0, width: 0 };
    return { left: el.offsetLeft, width: el.offsetWidth };
  }, [tab, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Actions">
      {/* Scrim */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="fade-in absolute inset-0 cursor-default bg-black/55 backdrop-blur-md supports-[backdrop-filter]:bg-black/40"
      />

      {/* Unified sheet — slightly wider than old cart to comfortably fit chat iframe */}
      <aside className="slide-over-in absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col
                        bg-glass border-l border-silver-900/80 shadow-apple-2xl backdrop-blur-2xl">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none hairline-border opacity-70"></div>
        <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none opacity-60"></div>

        {/* ═══════════ TOP BAR — segmented tab control ═══════════ */}
        <div className="relative z-10 border-b border-silver-900/70 px-4 sm:px-5 pt-4 pb-4">
          <div className="flex items-center gap-3">

            {/* Segmented tab control */}
            <div className="relative inline-flex h-11 items-center gap-1 rounded-2xl
                            bg-glass-light border border-silver-900/80 p-1 shadow-apple-xs">
              {/* Sliding indicator */}
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 rounded-xl bg-metallic-button shadow-apple-sm border border-silver-400/30
                           transition-all duration-240 ease-apple"
                style={indicatorStyle}
              />
              {TABS.map((t) => (
                <button
                  key={t.id}
                  ref={(el) => { if (el) tabRefs.current.set(t.id, el); }}
                  onClick={() => setTab(t.id)}
                  className={`relative z-10 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl
                              font-bold text-[12.5px] tracking-apple-wide whitespace-nowrap
                              transition-colors duration-200 ease-apple active-scale
                              ${tab === t.id ? 'text-background' : 'text-silver-300 hover:text-foreground'}`}
                  aria-selected={tab === t.id}
                  role="tab"
                >
                  {t.id === TAB_BAG ? (
                    <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                  ) : (
                    <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  )}
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.hint}</span>
                  {/* Bag item count inline badge */}
                  {t.id === TAB_BAG && itemCount > 0 && (
                    <span className={`ml-0.5 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1
                                      text-[10px] font-extrabold tabular-nums
                                      ${tab === TAB_BAG
                                        ? 'bg-background/30 text-background ring-1 ring-background/30'
                                        : 'bg-destructive text-background ring-1 ring-destructive-foreground/40'}`}>
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                  {t.id === TAB_AI && (
                    <span className={`ml-0.5 inline-flex size-2 rounded-full
                                      ${tab === TAB_AI ? 'bg-background/60' : 'bg-success animate-pulse'}`}></span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Close button — same treatment as before */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-2xl
                         border border-silver-800/80 bg-glass-light text-silver-300
                         hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm active-scale
                         transition-all duration-220 ease-apple shrink-0"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ═══════════ TAB CONTENT ═══════════ */}
        <div className="relative z-10 flex-1 min-h-0 w-full overflow-hidden">

          {/* ─────── Tab 1: SHOPPING BAG (shared visual style with old MiniCart) ─────── */}
          {tab === TAB_BAG && (
            <div className="flex h-full flex-col">
              {/* Free-shipping banner */}
              {cartItems.length > 0 && (
                <div className="border-b border-silver-900/70 px-5 sm:px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-silver-300 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                      Free Shipping
                    </span>
                    <span className="text-[12px] font-medium text-muted tabular-nums">
                      {remaining > 0
                        ? <>อีก <span className="text-foreground font-extrabold">฿{remaining.toLocaleString()}</span></>
                        : <span className="text-success font-extrabold">✓ Qualified</span>}
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full rounded-full overflow-hidden bg-surface-500/80 border border-silver-900/60 shadow-inner">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-silver-500 via-silver-300 to-silver-400 transition-all duration-400 ease-apple shadow-[0_0_8px_rgba(199,199,204,0.4)]"
                      style={{ width: `${freeProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 custom-scrollbar">
                {cartItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center px-4">
                    <div className="relative flex size-20 items-center justify-center rounded-3xl
                                    bg-metallic-card border border-silver-900/80 shadow-apple mb-5">
                      <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none"></div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-[34px] h-[34px] text-silver-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                        <path d="M3 6h18"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                      </svg>
                    </div>
                    <p className="text-[16px] font-extrabold text-foreground tracking-apple-tight">ตะกร้าว่างเปล่า</p>
                    <p className="mt-1.5 text-[13px] text-muted leading-apple-relaxed">Your shopping bag is currently empty.</p>
                    <Link
                      to="/product"
                      onClick={onClose}
                      className="group/cta mt-6 relative inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7
                                 bg-metallic-button hover:bg-metallic-button-hover text-background
                                 font-bold text-[14px] tracking-wide shadow-apple hover:shadow-apple-lg active-scale
                                 border border-silver-400/30 transition-all duration-240 ease-apple overflow-hidden"
                    >
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0
                                                           group-hover/cta:opacity-100 translate-x-[-100%] group-hover/cta:translate-x-[100%]
                                                           transition-transform duration-700 ease-out pointer-events-none"></span>
                      <span className="relative z-10 inline-flex items-center gap-2">
                        เริ่มช้อปปิ้งเลย
                        <svg className="w-[17px] h-[17px] transition-transform duration-200 group-hover/cta:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                      </span>
                    </Link>
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {cartItems.map(item => {
                      const swatch = item.product.swatches.find(s => s.id === item.swatchId) || item.product.swatches[0];
                      const lineTotal = item.product.price * item.quantity;
                      return (
                        <li
                          key={`${item.product.id}-${item.swatchId}`}
                          className="group/row flex gap-3 sm:gap-4 py-4 first:pt-0 border-b border-silver-900/60 last:border-0"
                        >
                          <Link
                            to={`/product/${item.product.slug}`}
                            onClick={onClose}
                            className="relative size-16 sm:size-[72px] shrink-0 overflow-hidden rounded-2xl
                                       border border-silver-900/80 bg-metallic-card shadow-apple-sm
                                       transition-all duration-220 ease-apple group-hover/row:border-silver-600/80 group-hover/row:shadow-apple"
                          >
                            <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none opacity-50"></div>
                            <div aria-hidden="true" className="absolute inset-0 card-edge pointer-events-none"></div>
                            <img src={item.product.image} alt={item.product.name} className="relative z-10 h-full w-full object-contain p-1.5 transition-transform duration-350 ease-apple-smooth group-hover/row:scale-105" />
                          </Link>
                          <div className="min-w-0 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/product/${item.product.slug}`}
                                onClick={onClose}
                                className="min-w-0 text-[14px] font-bold text-foreground leading-apple-tight line-clamp-2
                                           hover:text-silver-gradient transition-colors duration-200 ease-apple"
                              >
                                {item.product.name}
                              </Link>
                              <button
                                onClick={() => removeFromCart(item.product.id, item.swatchId)}
                                aria-label={`Remove ${item.product.name}`}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl
                                           border border-transparent text-silver-400
                                           hover:border-destructive/50 hover:text-destructive hover:bg-destructive/10 active-scale
                                           transition-all duration-200 ease-apple"
                              >
                                <svg className="h-[16px] w-[16px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            </div>
                            <p className="mt-1 text-[12px] text-muted flex items-center gap-2">
                              {swatch && (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="inline-block size-3.5 rounded-full border border-silver-900/80 shadow-inner shrink-0" style={{ backgroundColor: swatch?.color || '#999' }} aria-hidden="true" />
                                  <span>{swatch?.name}</span>
                                </span>
                              )}
                              <span className="text-silver-600/80">·</span>
                              <span className="tabular-nums">฿{item.product.price.toLocaleString()}</span>
                            </p>
                            <div className="mt-auto pt-2.5 flex items-center justify-between">
                              <div className="inline-flex items-center rounded-xl border border-silver-800/80 bg-glass-light shadow-apple-xs overflow-hidden">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.swatchId, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground hover:bg-surface-100/80 active-scale
                                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground/80
                                             transition-colors duration-180 ease-apple"
                                  aria-label="Decrease quantity"
                                >
                                  <span className="text-[16px] font-bold leading-none">−</span>
                                </button>
                                <span className="flex h-8 min-w-[32px] items-center justify-center px-2 text-[12px] font-extrabold tabular-nums text-foreground border-x border-silver-800/80">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.swatchId, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground hover:bg-surface-100/80 active-scale transition-colors duration-180 ease-apple"
                                  aria-label="Increase quantity"
                                >
                                  <span className="text-[16px] font-bold leading-none">+</span>
                                </button>
                              </div>
                              <span className="text-[15px] font-extrabold tabular-nums text-foreground tracking-apple-tight">
                                ฿{lineTotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Totals + CTAs footer */}
              {cartItems.length > 0 && (
                <div className="relative z-10 border-t border-silver-900/70 bg-glass-light px-5 sm:px-6 py-5">
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-muted">ยอดรวม (Subtotal)</span>
                      <span className="text-[14px] font-bold tabular-nums text-foreground">฿{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-muted">ค่าจัดส่ง (Shipping)</span>
                      <span className={`text-[14px] font-bold tabular-nums ${shipping === 0 ? 'text-success' : 'text-foreground'}`}>
                        {shipping === 0 ? 'ฟรี · Free' : `฿${shipping}`}
                      </span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-silver-900/70 to-transparent my-3"></div>
                    <div className="flex items-end justify-between">
                      <span className="text-[12px] text-muted tracking-apple-wide uppercase">Total</span>
                      <span className="text-[22px] font-extrabold tabular-nums tracking-apple-tight text-foreground">
                        ฿{(subtotal + shipping).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Link
                      to="/cart"
                      onClick={onClose}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6
                                 bg-glass-light hover:bg-surface-100/90 text-foreground
                                 border border-silver-800/80 hover:border-silver-600/80
                                 font-bold text-[14px] tracking-wide shadow-apple-sm hover:shadow-apple active-scale
                                 transition-all duration-240 ease-apple"
                    >
                      ดูตะกร้าเต็ม · View Cart
                    </Link>
                    <Link
                      to="/checkout"
                      onClick={onClose}
                      className="group/checkout relative inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6
                                 bg-metallic-button hover:bg-metallic-button-hover text-background
                                 border border-silver-400/30
                                 font-bold text-[14px] tracking-wide shadow-apple hover:shadow-apple-lg active-scale
                                 transition-all duration-240 ease-apple overflow-hidden"
                    >
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0
                                                           group-hover/checkout:opacity-100 translate-x-[-100%] group-hover/checkout:translate-x-[100%]
                                                           transition-transform duration-700 ease-out pointer-events-none"></span>
                      <span className="relative z-10 inline-flex items-center gap-2">
                        ซื้อเลย · ชำระเงินทันที
                        <svg className="w-[17px] h-[17px] transition-transform duration-200 group-hover/checkout:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────── Tab 2: AI ASSISTANT (iframe to Cloudflare Agents Worker) ─────── */}
          {tab === TAB_AI && (
            <div className="flex h-full flex-col">
              {/* Quick status subtitle */}
              <div className="border-b border-silver-900/70 px-5 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-success leading-none">
                    Cloudflare Agents · online
                  </span>
                </div>
              </div>

              {/* Stage (skeleton + iframe) */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-surface-700/80">
                {aiLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col gap-4 p-5 sm:p-6 pointer-events-none">
                    <div className="flex items-start gap-3">
                      <div className="size-8 shrink-0 rounded-[40%] bg-metallic-card border border-silver-900/80 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded-lg bg-silver-900/60 animate-pulse"></div>
                        <div className="h-3 w-3/4 rounded-lg bg-silver-900/60 animate-pulse"></div>
                        <div className="h-3 w-2/3 rounded-lg bg-silver-900/60 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="flex-1 max-w-[78%] space-y-2">
                        <div className="h-3 w-5/6 ml-auto rounded-lg bg-silver-800/50 animate-pulse"></div>
                        <div className="h-3 w-1/2 ml-auto rounded-lg bg-silver-800/50 animate-pulse"></div>
                      </div>
                      <div className="size-8 shrink-0 rounded-[40%] bg-metallic-card border border-silver-900/80 animate-pulse"></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="size-8 shrink-0 rounded-[40%] bg-metallic-card border border-silver-900/80 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded-lg bg-silver-900/60 animate-pulse"></div>
                        <div className="h-3 w-1/3 rounded-lg bg-silver-900/60 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="h-11 rounded-2xl bg-silver-900/60 border border-silver-900/80 animate-pulse"></div>
                    </div>
                  </div>
                )}
                <div aria-hidden="true" className="absolute inset-0 card-edge pointer-events-none opacity-50"></div>
                <iframe
                  ref={iframeRef}
                  src={workerUrl}
                  title="Silver Surface — AI Shopping Assistant"
                  onLoad={() => setAiLoading(false)}
                  className={`relative z-10 w-full h-full border-0 bg-transparent transition-opacity duration-300 ease-apple ${aiLoading ? 'opacity-0' : 'opacity-100'}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allow="clipboard-read; clipboard-write; microphone; camera"
                />
              </div>

              {/* Quick suggestion chips */}
              <div className="border-t border-silver-900/70 bg-glass-light px-5 sm:px-6 py-3.5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-silver-300 shrink-0 pl-0.5 pr-1">Try</span>
                  {[
                    '🛒 Recommend a jacket',
                    '📦 Track my order',
                    '📏 Size guide for jeans',
                    '💸 PromptPay?',
                  ].map((s) => (
                    <span key={s} className="shrink-0 inline-flex items-center gap-1 rounded-full border border-silver-800/80 bg-surface-100/70 px-2.5 py-1 text-[11px] font-medium text-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
