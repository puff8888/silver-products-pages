import { Link } from 'react-router-dom';
import shopifyLogo from '../assets/shopify-lockup.svg';
import lineLogo from '../assets/line-wordmark.svg';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-silver-900/70 bg-surface-700 text-foreground relative overflow-hidden">
      {/* Ambient backdrop to mirror header's hero-gradient */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-64 hero-gradient opacity-40 pointer-events-none rotate-180"></div>
      <div aria-hidden="true" className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-silver-600/5 blur-[120px] z-0 pointer-events-none"></div>

      {/* ═══ Main Footer body — mirrors header max-w-7xl, px-4 lg:px-8 ═══ */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8 pt-16 sm:pt-20 pb-10">
        <div className="grid gap-12 sm:gap-10 sm:grid-cols-12">

          {/* ─── Zone 1 (col-span-5): Brand + Description — mirrors header Left Zone size ─── */}
          <div className="sm:col-span-5">
            {/* Wordmark — exact visual match to Navbar brand block */}
            <Link to="/" className="flex items-center gap-2.5 group/brand">
              <div className="flex items-center justify-center size-8 rounded-lg bg-metallic-button text-background shadow-apple-sm border border-silver-400/30
                              group-hover/brand:bg-metallic-button-hover group-hover/brand:shadow-apple group-hover/brand:scale-105
                              transition-all duration-220 ease-apple">
                <svg width="16" height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-display font-sans text-[14px] font-extrabold tracking-apple-tight text-foreground
                               group-hover/brand:opacity-80 transition-opacity duration-200 ease-apple">
                SILVER SURFACE
              </span>
            </Link>

            {/* Description — matches secondary/subhead typography scale from header
                Nav subhead = 15px/base/lg; footer desc = 14px/13px proportional */}
            <p className="mt-5 max-w-sm text-[14px] leading-apple-relaxed text-muted/95 font-medium">
              Premium curated essentials · โมเดิร์น เรียบหรู
              <br className="hidden sm:block"/>
              จัดส่งด่วนทั่วประเทศไทย · ผ่อนชำระ 0% พร้อม PromptPay
            </p>

            {/* Mirror of header's icon-button row but as social/platform icons (same size-10 rounded-full) */}
            <div className="mt-7 flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="inline-flex size-10 items-center justify-center rounded-full
                           border border-silver-800/80 bg-glass-light text-silver-300
                           hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm hover:-translate-y-0.5
                           transition-all duration-220 ease-apple active-scale"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <path d="M17.5 6.5h.01" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Twitter / X"
                className="inline-flex size-10 items-center justify-center rounded-full
                           border border-silver-800/80 bg-glass-light text-silver-300
                           hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm hover:-translate-y-0.5
                           transition-all duration-220 ease-apple active-scale"
              >
                <svg className="w-[17px] h-[17px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2H21.5l-7.11 8.13L22.5 22h-6.81l-4.77-6.24L5.3 22H2.04l7.62-8.7L1.5 2h6.98l4.31 5.69L18.244 2Zm-1.192 18h1.88L7.03 4H5.05l12.002 16Z"/>
                </svg>
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex size-10 items-center justify-center rounded-full
                           border border-silver-800/80 bg-glass-light text-silver-300
                           hover:text-foreground hover:bg-surface-100/90 hover:border-silver-600/80 hover:shadow-apple-sm hover:-translate-y-0.5
                           transition-all duration-220 ease-apple active-scale"
              >
                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* ─── Zone 2 (col-span-3): Shop column — heading matches mega-menu heading spec ─── */}
          <div className="sm:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-silver-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-silver-400"></span>
              ช้อปสินค้า
            </h3>
            <ul className="space-y-3 font-sans">
              <li>
                <Link
                  to="/product"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  คอลเลกชันทั้งหมด
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  ตะกร้าสินค้า
                </Link>
              </li>
              <li>
                <Link
                  to="/product"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  สินค้าใหม่
                </Link>
              </li>
              <li>
                <Link
                  to="/#premium-collection"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  ข้อเสนอพิเศษ
                </Link>
              </li>
            </ul>
          </div>

          {/* ─── Zone 3 (col-span-4): Help + Channels — heading matches mega-menu spec ─── */}
          <div className="sm:col-span-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-silver-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-silver-500"></span>
              ช่วยเหลือ &amp; ติดต่อ
            </h3>
            <ul className="space-y-3 font-sans mb-7">
              <li>
                <Link
                  to="/order"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  ติดตามคำสั่งซื้อ
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  การชำระเงิน &amp; PromptPay
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  นโยบายการคืนสินค้า
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@silversurface.store"
                  className="text-[14px] font-medium text-foreground/80 hover:text-foreground
                             transition-colors duration-200 ease-apple leading-apple"
                >
                  hello@silversurface.store
                </a>
              </li>
            </ul>

            {/* Channel badges — mirrors header's pill treatment */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-silver-300">
                Powered by
              </span>
              <a
                href="#"
                aria-label="Shopify"
                className="inline-flex items-center h-9 px-3 rounded-xl
                           bg-white border border-white/20
                           hover:shadow-apple-sm hover:-translate-y-0.5
                           transition-all duration-220 ease-apple active-scale"
              >
                <img src={shopifyLogo} alt="Shopify" className="h-5 w-auto" />
              </a>
              <a
                href="#"
                aria-label="LINE Official Account"
                className="inline-flex items-center h-9 px-3 rounded-xl
                           bg-white border border-white/20
                           hover:shadow-apple-sm hover:-translate-y-0.5
                           transition-all duration-220 ease-apple active-scale"
              >
                <img src={lineLogo} alt="LINE" className="h-5 w-auto" />
              </a>
            </div>
          </div>
        </div>

        {/* ═══ Divider + Copyright bar — mirrors header bottom border visual weight ═══ */}
        <div className="mt-14 pt-6 border-t border-silver-900/70
                        flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-[12px] text-muted/90 leading-apple tracking-apple-wide">
            © {new Date().getFullYear()} SILVER SURFACE. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="#"
              className="text-[12px] font-medium text-muted hover:text-foreground transition-colors duration-200 ease-apple tracking-apple-wide"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-[12px] font-medium text-muted hover:text-foreground transition-colors duration-200 ease-apple tracking-apple-wide"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-[12px] font-medium text-muted hover:text-foreground transition-colors duration-200 ease-apple tracking-apple-wide"
            >
              Cookies
            </a>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-silver-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}