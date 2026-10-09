import { useState, useEffect } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useCatalog } from '../context/CatalogContext';
import { trackAddToCart } from '../lib/analytics';
import UnifiedActionDrawer from './UnifiedActionDrawer';

const HIDE_ON = ['/cart', '/checkout', '/order/confirmation', '/dashboard', '/ads', '/settings'];
const WORKER_BASE_DEFAULT = 'https://round-frost-db21.sv9.workers.dev';

export default function FloatingDock() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDefaultTab, setDrawerDefaultTab] = useState('bag'); // 'bag' or 'ai'
  const [aiPingVisible, setAiPingVisible] = useState(true);  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount, addToCart } = useCart();
  const { toast } = useToast();
  const { products } = useCatalog();

  const productMatch = useMatch('/product/:id');
  const product = productMatch
    ? products.find(p => p.slug === productMatch.id || p.id === parseInt(productMatch.id, 10))
    : null;

  useEffect(() => {
    if (drawerOpen) setAiPingVisible(false);
  }, [drawerOpen]);

  if (HIDE_ON.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return null;
  }

  const handleBuyNow = () => {
    if (!product) return;
    const swatch = product.swatches[0];
    addToCart(product, swatch?.id, 1);
    trackAddToCart(product, swatch?.name, 1);
    toast(`⚡ "${product.name}" พร้อมชำระเงิน — ไปที่ Checkout แล้ว`);
    navigate('/checkout');
  };

  const openAsBag = () => {
    setDrawerDefaultTab('bag');
    setDrawerOpen(true);
  };

  const aiBaseUrl = (import.meta.env.VITE_AI_PROXY_URL || WORKER_BASE_DEFAULT).replace(/\/$/, '');

  const onPdp = !!product;

  return (
    <>
      {/* ═══ Floating stack — bottom-right ═══
            Overlap avoidance:
              • On PDP pages below lg breakpoint, the <ProductDetail/> mobile sticky CTA
                bar occupies fixed bottom-0 full-width. Raise dock by ~88px and hide the
                redundant context Buy-Now pill (sticky bar already shows price + ATC).
              • On non-PDP or desktop (lg+), keep the standard bottom-6 anchor.
      */}
      <div className={`fixed z-50 flex flex-col items-end gap-2 sm:gap-2.5 transition-all duration-300 ease-apple
                       right-4 sm:right-6
                       ${onPdp ? 'bottom-[92px] lg:bottom-6' : 'bottom-6'}`}>

        {/* Contextual Buy Now pill (only on product detail pages, NOT on mobile PDP) */}
        {product && (
          <button
            onClick={handleBuyNow}
            className="group/buy hidden lg:inline-flex items-center gap-2 rounded-apple py-2.5 pl-4 pr-5
                       bg-metallic-button hover:bg-metallic-button-hover text-background
                       text-[12px] font-bold tracking-apple-wide
                       border border-silver-400/30 shadow-apple hover:shadow-apple-lg hover:-translate-y-0.5 active-scale
                       transition-all duration-240 ease-apple overflow-hidden"
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <span aria-hidden="true">⚡</span>
              <span>ซื้อเลย · <span className="tabular-nums">฿{product.price.toLocaleString()}</span></span>
            </span>
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0
                                                 group-hover/buy:opacity-100 translate-x-[-100%] group-hover/buy:translate-x-[100%]
                                                 transition-transform duration-700 ease-out pointer-events-none"></span>
          </button>
        )}

        {/* ═══ Single merged button ═══
              Bag + chat fused in one SVG mark, one gesture target.
              Opens the unified drawer (Bag + AI tabs live inside),
              so the mini-cart and chat entries merge into one bubble. */}
        <div className="relative">
          {/* Mirrored ambient glow under the bubble */}
          <div aria-hidden="true" className="pointer-events-none -z-10 absolute -bottom-11 right-1/2 translate-x-1/2 w-[180px] h-10 rounded-[50%] bg-silver-500/10 blur-2xl"></div>

          {/* ═══ MERGED BAG + CHAT bubble ═══ */}
          <button
            onClick={openAsBag}
            aria-label={`Open shopping bag and AI assistant (${itemCount} items in bag)`}
            aria-expanded={drawerOpen}
            className="group/root relative z-20 flex size-[56px] items-center justify-center rounded-[40%]
                       bg-metallic-button hover:bg-metallic-button-hover text-background
                       border border-silver-400/30 shadow-apple-xl hover:shadow-apple-2xl hover:-translate-y-0.5 active-scale
                       transition-all duration-240 ease-apple overflow-hidden"
          >
            {/* Metallic sheen overlay */}
            <span aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none opacity-80"></span>

            {/* MERGED SVG MARK: symmetric shopping-bag body with a chat-bubble
                tail fused to the bottom edge. All body coordinates mirror about
                x=16 (5↔27, 6.5↔25.5, 9↔23, 11↔21); the tail is the single
                deliberate accent hanging below the bottom edge. */}
            <svg className="relative z-10 w-[28px] h-[28px]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* Bag handles */}
              <path d="M11 4 L9 9" />
              <path d="M21 4 L23 9" />
              <path d="M21.5 9.5 a5.5 5.5 0 0 1 -11 0" />
              {/* Symmetric trapezoid body */}
              <path d="M5 9.5 H27 L25.5 21 H6.5 Z" />
              {/* Chat-bubble tail fused below the bottom edge */}
              <path d="M17 21 L15.5 25.5 L22 21" />
            </svg>

            {/* AI hint ping — top-left corner, clears after first open */}
            {aiPingVisible && (
              <span className="absolute top-0.5 left-0.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success ring-2 ring-background"></span>
              </span>
            )}

            {/* Item-count badge — bottom-right corner */}
            {itemCount > 0 && (
              <span className="absolute -bottom-1.5 -right-1.5 z-30 flex h-5 min-w-5 items-center justify-center rounded-full
                               bg-destructive text-background px-1 text-[10px] font-extrabold tabular-nums
                               border border-destructive-foreground/40 shadow-apple-sm ring-2 ring-background">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ Unified drawer (2 tabs inside one sliding sheet) ═══ */}
      <UnifiedActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultTab={drawerDefaultTab}
        workerUrl={aiBaseUrl}
      />
    </>
  );
}
