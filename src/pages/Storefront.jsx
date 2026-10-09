import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { trackAddToCart } from '../lib/analytics';
import SilverPathBackground from '../components/SilverPathBackground';
import chromeHero from '../assets/hero-metallic.svg';

export default function Storefront() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const carouselRef = useRef(null);
  const tabRefs = useRef([]);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { products } = useCatalog();

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSwatches, setSelectedSwatches] = useState({});
  const [addedProductId, setAddedProductId] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState('');

  useEffect(() => {
    if (heroRef.current) {
      let ctx = gsap.context(() => {
        gsap.fromTo(heroRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }
        );
      });
      return () => ctx.revert();
    }
  }, []);

  const handleSelectSwatch = (productId, swatchId) => {
    setSelectedSwatches(prev => ({ ...prev, [productId]: swatchId }));
  };

  const handleScrollCarousel = (direction) => {
    if (carouselRef.current) {
      const cardEl = carouselRef.current.querySelector('article');
      const gap = 24;
      const cardWidth = cardEl ? cardEl.getBoundingClientRect().width + gap : 340;
      const viewportWidth = carouselRef.current.clientWidth;
      const cardsPerView = Math.max(1, Math.round(viewportWidth / cardWidth));
      const scrollAmount = cardWidth * Math.max(1, cardsPerView - 0.25);
      carouselRef.current.scrollBy({
        left: direction === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = async (product) => {
    const selectedSwatchId = selectedSwatches[product.id] || product.swatches[0]?.id;
    const swatchObj = product.swatches.find(s => s.id === selectedSwatchId);

    // Quick UI feedback
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1400);

    addToCart(product, selectedSwatchId, 1);
    trackAddToCart(product, swatchObj?.name, 1);
    toast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`);

    // Direct conversion flow: navigate to cart
    navigate('/cart');
  };

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  // Base categories plus any product_type that comes from the connected store,
  // so a real Shopify catalog is never hidden behind a fixed filter list.
  const categories = useMemo(() => {
    const base = [
      { id: 'all', label: 'ทั้งหมด' },
      { id: 'electronics', label: 'อุปกรณ์อิเล็กทรอนิกส์' },
      { id: 'fashion', label: 'แฟชั่น' },
      { id: 'home', label: 'ของใช้ในบ้าน' },
      { id: 'fitness', label: 'ฟิตเนส' },
      { id: 'beauty', label: 'บิวตี้' },
      { id: 'bags', label: 'กระเป๋า' },
      { id: 'stationery', label: 'เครื่องเขียน' },
    ];
    const known = new Set(base.map(c => c.id));
    const extras = Array.from(new Set(products.map(p => p.category).filter(c => c && !known.has(c))))
      .map(id => ({ id, label: id.replace(/-/g, ' ') }));
    return extras.length ? [...base, ...extras] : base;
  }, [products]);

  const handleTabKeyDown = (e, index) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (index + 1) % categories.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + categories.length) % categories.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = categories.length - 1;
    else return;
    e.preventDefault();
    setActiveCategory(categories[next].id);
    tabRefs.current[next]?.focus();
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const value = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setNewsletterError('กรุณากรอกอีเมลให้ถูกต้อง / Please enter a valid email');
      return;
    }
    setNewsletterError('');
    toast('ขอบคุณ! เราจะแจ้งข่าวสารให้คุณทราบ');
    setNewsletterEmail('');
  };

  return (
    <main className="flex-1 bg-background text-foreground antialiased relative overflow-hidden">
      {/* ── Background effects (Apple-inspired ambient) ── */}
      <div aria-hidden="true" className="absolute inset-0 apple-grid z-0 pointer-events-none"></div>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[600px] hero-gradient z-0 pointer-events-none"></div>
      <SilverPathBackground className="absolute inset-0 z-0 opacity-100 mix-blend-screen" />
      <div aria-hidden="true" className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-silver-600/8 blur-[120px] z-0 pointer-events-none"></div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HERO SECTION  —  Apple Metallic Visual Parity             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 border-b border-silver-900/70 overflow-hidden flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 md:py-36">
        <div ref={heroRef} className="mx-auto w-full max-w-4xl flex flex-col items-center">

          {/* ───── Eyebrow pill (glass + hairline) ───── */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-silver-800/70 bg-glass-light px-4 py-1.5
                          text-[11px] font-semibold text-silver-300 shadow-apple-sm mb-8
                          transition-all duration-220 ease-apple hover:bg-surface-100/80 hover:border-silver-700/80 hover:shadow-apple
                          cursor-default tracking-wide uppercase">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-silver-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-silver-400"></span>
            </span>
            <span>Introducing Silver Surface &rsquo;26</span>
          </div>

          {/* ───── Headline (silver gradient) ───── */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-apple-tightest leading-apple-tight">
            <span className="block text-silver-gradient">Unified Essentials.</span>
            <span className="block mt-2 text-foreground/90 sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-apple-tight tracking-apple-tight">
              <span className="text-chrome-gradient">Chrome Aesthetic.</span>
            </span>
          </h1>

          {/* ───── Subheadline ───── */}
          <p className="mt-6 sm:mt-8 max-w-2xl text-[15px] sm:text-base md:text-lg leading-apple-relaxed text-muted/95 font-medium">
            ค้นพบสินค้าพรีเมียมหลากหลายสไตล์ ดีไซน์เรียบหรูในโทนสีเมทัลลิก
            ตอบโจทย์ไลฟ์สไตล์โมเดิร์นของคุณ · เลือกช้อปไอเท็มชิ้นโปรดได้จบในที่เดียว
          </p>

          {/* ───── CTA Row (metallic primary + glass secondary) ───── */}
          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Primary — metallic gradient button */}
            <a
              href="#premium-collection"
              className="group/cta-primary relative inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl px-7 sm:px-9
                         bg-metallic-button hover:bg-metallic-button-hover text-background
                         font-bold text-[14px] sm:text-[15px] tracking-wide
                         shadow-apple hover:shadow-apple-lg hover:-translate-y-0.5 active-scale
                         border border-silver-400/30
                         transition-all duration-240 ease-apple overflow-hidden cursor-pointer"
            >
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover/cta-primary:opacity-100
                                                   translate-x-[-100%] group-hover/cta-primary:translate-x-[100%] transition-transform duration-700 ease-out pointer-events-none"></span>
              <span className="relative z-10 flex items-center gap-2">
                Start Shopping
                <svg className="w-[17px] h-[17px] transition-transform duration-200 ease-apple group-hover/cta-primary:translate-x-0.5"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </a>

            {/* Secondary — glass/translucent button */}
            <Link
              to="/product"
              className="group/cta-secondary relative inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl px-7 sm:px-9
                         bg-glass-light hover:bg-surface-100/90 text-foreground
                         font-semibold text-[14px] sm:text-[15px] tracking-wide
                         shadow-apple-sm hover:shadow-apple hover:-translate-y-0.5 active-scale
                         border border-silver-800/80 hover:border-silver-600/80
                         transition-all duration-240 ease-apple cursor-pointer"
            >
              <svg className="w-[17px] h-[17px] transition-transform duration-200 ease-apple group-hover/cta-secondary:-translate-x-0.5"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
              View Collection
            </Link>
          </div>

          {/* ───── Preview Card (Apple-style window chrome + layered) ───── */}
          <div className="group/preview relative mt-16 sm:mt-20 md:mt-24 w-full max-w-4xl">
            {/* Outer hairline frame */}
            <div aria-hidden="true" className="absolute -inset-[1px] rounded-3xl hairline-border pointer-events-none"></div>

            {/* Card backdrop: metallic + gradient border */}
            <div className="relative rounded-3xl bg-metallic-card border border-silver-900/80 shadow-apple-2xl overflow-hidden
                            transition-all duration-280 ease-apple
                            group-hover/preview:shadow-[0_28px_80px_-12px_rgba(0,0,0,0.55)] group-hover/preview:border-silver-700/70 group-hover/preview:-translate-y-1">

              {/* Subtle inner glow */}
              <div aria-hidden="true" className="absolute inset-0 bg-metallic-sheen pointer-events-none"></div>

              {/* Traffic-light title bar (glass) */}
              <div className="relative z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4
                              border-b border-silver-900/80 bg-glass-light">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]/80 border border-[#ff5f57]/40 shadow-inner"></span>
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]/80 border border-[#febc2e]/40 shadow-inner"></span>
                  <span className="w-3 h-3 rounded-full bg-[#28c840]/80 border border-[#28c840]/40 shadow-inner"></span>
                </div>

                {/* URL pill */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 rounded-xl px-3.5 py-1.5
                                bg-surface-500/80 border border-silver-800/70 shadow-apple-sm">
                  <svg className="w-3.5 h-3.5 text-silver-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[11px] font-medium text-silver-200 font-mono tracking-tight">silversurface.com/store</span>
                </div>

                {/* Spacer */}
                <div className="w-[70px]"></div>
              </div>

              {/* ── Hero Image Stage ── */}
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-spacegray-700 via-spacegray-600 to-spacegray-800">
                {/* Inner pedestal gradient */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent"></div>
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/20 pointer-events-none"></div>

                {/* Edge highlight */}
                <div aria-hidden="true" className="absolute inset-0 card-edge pointer-events-none"></div>

                {/* Local chrome hero (replaces remote Unsplash) */}
                <img
                  src={chromeHero}
                  alt="Silver Surface chrome abstract hero"
                  fetchpriority="high"
                  decoding="async"
                  className="relative z-10 w-full h-full object-cover
                             transition-all duration-500 ease-apple-smooth
                             group-hover/preview:scale-[1.04] group-hover/preview:saturate-110"
                />

                {/* Bottom scrim */}
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/75 via-black/35 to-transparent"></div>

                {/* Floating caption overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 md:p-8 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center rounded-full border border-silver-700/70 bg-background/50 backdrop-blur-md
                                      px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-silver-200 shadow-apple-sm mb-3">
                        Now Available
                      </span>
                      <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-apple-tight leading-apple-tight text-silver-gradient">
                        Silver Series · Season One
                      </h2>
                      <p className="mt-1.5 text-[13px] sm:text-sm text-silver-300/90 max-w-md leading-apple-relaxed">
                        Eight curated essentials · Space gray, silver, chrome · Built to last
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <Link
                        to="/product"
                        className="group/cta-tert inline-flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl px-4 sm:px-5
                                   bg-metallic-button hover:bg-metallic-button-hover text-background
                                   text-[12px] sm:text-[13px] font-bold tracking-wide
                                   shadow-apple hover:shadow-apple-lg active-scale
                                   border border-silver-400/30
                                   transition-all duration-220 ease-apple cursor-pointer"
                      >
                        Explore
                        <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta-tert:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reflected glow under card */}
            <div aria-hidden="true" className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[85%] h-20 rounded-[50%] bg-silver-500/10 blur-2xl pointer-events-none"></div>
          </div>

        </div>

        {/* Bottom fade separator */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none"></div>
      </section>

      {/* PREMIUM COLLECTION — Apple-Inspired Metallic Redesign */}
      <section id="premium-collection" aria-labelledby="premium-collection-heading" className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:py-24 lg:px-8 scroll-mt-20">
        <div id="pocket-store" className="scroll-mt-24"></div>

        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-80 hero-gradient opacity-70" aria-hidden="true"></div>

        {/* ── Section Header ─────────────────────────────────────── */}
        <div className="relative flex flex-col gap-10 pb-10 border-b border-silver-900/70">
          {/* Eyebrow + Title Row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-silver-800/80 bg-glass-light px-3.5 py-1.5 text-[11px] font-semibold text-silver-300 shadow-apple-sm mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="tracking-wide uppercase">Pocket Store · 1-Click Checkout</span>
              </div>

              <h2 id="premium-collection-heading" className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-apple-tight leading-apple-tight text-silver-gradient">
                Premium Collection
                <span className="block text-2xl sm:text-3xl md:text-4xl text-muted/80 font-semibold mt-1 tracking-apple">
                  คอลเลกชันยอดนิยม
                </span>
              </h2>

              <p className="mt-4 text-sm sm:text-[15px] text-muted leading-apple-relaxed max-w-xl">
                Curated essentials, refined in silver and space gray. Swatch materials, 
                tap to add — crafted for the modern lifestyle.
              </p>
            </div>

            {/* Prev / Next Controls (desktop) */}
            <div className="hidden sm:flex items-center gap-3 shrink-0" role="group" aria-label="Carousel navigation">
              <button
                onClick={() => handleScrollCarousel('prev')}
                aria-label="Previous products"
                className="group/btn relative h-11 w-11 rounded-apple border border-silver-800/80 bg-glass-light flex items-center justify-center text-silver-200 shadow-apple-sm active-scale cursor-pointer
                           hover:border-silver-600 hover:bg-surface-200 hover:text-foreground hover:shadow-apple
                           transition-all duration-220 ease-apple"
              >
                <svg className="w-[18px] h-[18px] transition-transform duration-200 group-hover/btn:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => handleScrollCarousel('next')}
                aria-label="Next products"
                className="group/btn relative h-11 w-11 rounded-apple border border-silver-800/80 bg-glass-light flex items-center justify-center text-silver-200 shadow-apple-sm active-scale cursor-pointer
                           hover:border-silver-600 hover:bg-surface-200 hover:text-foreground hover:shadow-apple
                           transition-all duration-220 ease-apple"
              >
                <svg className="w-[18px] h-[18px] transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Category Segmented Control (Apple-style pill tabs) ── */}
          <div className="overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div
              role="tablist"
              aria-label="Product categories. Use left and right arrow keys to move between categories."
              className="relative inline-flex items-center gap-2 p-1.5 rounded-2xl bg-surface-500/80 border border-silver-900/80 shadow-inner-glow backdrop-blur-sm
                         min-w-full sm:min-w-0"
            >
              {/* Sliding indicator (hidden on mobile for simplicity) */}
              <div
                aria-hidden="true"
                className="hidden sm:block absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-b from-surface-100 to-surface-300 shadow-apple-sm border border-silver-800/60
                           transition-all duration-250 ease-apple-smooth pointer-events-none"
                style={{
                  left: `calc(${(categories.findIndex(c => c.id === activeCategory) / categories.length) * 100}% + 6px)`,
                  width: `calc(${(100 / categories.length)}% - 12px)`,
                }}
              ></div>

              {categories.map((cat, index) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    ref={(el) => { tabRefs.current[index] = el; }}
                    role="tab"
                    id={`category-tab-${cat.id}`}
                    aria-selected={isActive}
                    aria-controls="product-carousel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveCategory(cat.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={`relative z-10 flex-none px-4 sm:px-5 py-2.5 min-h-[44px] text-[12px] sm:text-[13px] font-semibold rounded-xl whitespace-nowrap cursor-pointer active-scale
                                transition-colors duration-200 ease-apple tracking-apple-wide
                                ${isActive
                                  ? 'text-foreground'
                                  : 'text-muted hover:text-silver-200 hover:bg-white/[0.02]'
                                }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Product Carousel (horizontal snap w/ responsive widths) ── */}
        <div
          ref={carouselRef}
          id="product-carousel"
          role="tabpanel"
          aria-labelledby={`category-tab-${activeCategory}`}
          tabIndex={0}
          className="relative mt-12 flex gap-5 sm:gap-6 overflow-x-auto pb-6 pt-2 scroll-smooth no-scrollbar snap-x snap-mandatory"
        >
          {filteredProducts.map((product, i) => {
            const currentSwatchId = selectedSwatches[product.id] || product.swatches[0]?.id;
            const currentSwatch = product.swatches.find(s => s.id === currentSwatchId) || product.swatches[0];
            const isAdded = addedProductId === product.id;
            const discount = product.originalPrice > product.price
              ? Math.round((1 - product.price / product.originalPrice) * 100)
              : 0;

            return (
              <article
                key={product.id}
                className={`group/card relative flex flex-col rounded-apple overflow-hidden snap-start
                            flex-none w-[calc(100%-0.25rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]
                            transition-all duration-250 ease-apple will-change-transform
                            hover-lift`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Outer frame — layered hairline */}
                <div className="absolute inset-0 rounded-apple pointer-events-none hairline-border"></div>

                {/* Card background — metallic */}
                <div className="absolute inset-0 bg-metallic-card group-hover/card:bg-metallic-card-hover
                                transition-all duration-250 ease-apple"></div>

                {/* Subtle border */}
                <div className="absolute inset-0 rounded-apple border border-silver-900/70 group-hover/card:border-silver-700/70
                                transition-colors duration-250 ease-apple pointer-events-none"></div>

                {/* Shadow layer */}
                <div className="absolute inset-0 rounded-apple shadow-apple group-hover/card:shadow-apple-xl
                                transition-shadow duration-250 ease-apple pointer-events-none"></div>

                <div className="relative flex flex-col h-full p-4 sm:p-5">
                  {/* ─── Image Stage ─── */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b from-surface-200 via-surface-400 to-surface-600 flex items-center justify-center p-4 sm:p-5 mb-5">
                    {/* Inner shine overlay */}
                    <div className="absolute inset-0 bg-metallic-sheen pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-2xl card-edge pointer-events-none"></div>

                    {/* Badge */}
                    {product.badge && (
                      <div className="absolute top-3 left-3 z-20">
                        <span className="inline-flex items-center rounded-full bg-background/70 backdrop-blur-md border border-silver-800/60
                                        px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-silver-100
                                        shadow-apple-sm">
                          {product.badge}
                        </span>
                      </div>
                    )}

                    {/* Discount pill */}
                    {discount > 0 && (
                      <div className="absolute top-3 right-3 z-20">
                        <span className="inline-flex items-center rounded-full bg-destructive/90 border border-destructive/60
                                        px-2 py-0.5 text-[10px] font-black text-white shadow-apple-sm tabular-nums">
                          −{discount}%
                        </span>
                      </div>
                    )}

                    {/* Wishlist button — appears on hover */}
                    <button
                      type="button"
                      aria-label={`Save ${product.name}`}
                      className="absolute bottom-3 right-3 z-20 smooth-hidden
                                 h-9 w-9 rounded-full bg-background/60 backdrop-blur-md border border-silver-800/60
                                 flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-100
                                 active-scale shadow-apple-sm transition-all duration-200 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>

                    {/* Product image */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]
                                 transition-transform duration-280 ease-apple-smooth
                                 group-hover/card:scale-[1.06] group-hover/card:-translate-y-1"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* ─── Meta: Rating + Stock ─── */}
                  <div className="flex items-center justify-between mb-3">
                    {product.rating > 0 ? (
                      <div className="flex items-center gap-1.5" role="img" aria-label={`Rating ${product.rating} out of 5, ${product.reviewsCount} reviews`}>
                        <span className="text-warning text-sm leading-none" aria-hidden="true">★</span>
                        <span className="text-[13px] font-semibold text-foreground tabular-nums leading-none">{product.rating}</span>
                        <span className="text-[11px] text-muted leading-none">({product.reviewsCount})</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-muted">สินค้าใหม่ · New</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success/90
                                     bg-success/10 border border-success/20 px-2 py-0.5 rounded-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle"></span>
                      พร้อมส่ง
                    </span>
                  </div>

                  {/* ─── Titles ─── */}
                  <h3 className="text-[15px] sm:text-base font-semibold text-foreground tracking-tight line-clamp-1
                                 group-hover/card:text-silver-gradient transition-colors duration-200 leading-apple">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted line-clamp-1 leading-snug">
                    {product.nameTh}
                  </p>

                  {/* ─── Swatches ─── */}
                  <div className="mt-4 pt-4 border-t border-silver-900/60">
                    <div className="flex items-center justify-between text-[11px] mb-2.5">
                      <span className="text-muted font-medium tracking-wide uppercase">Color · Material</span>
                      <span className="font-semibold text-silver-200">{currentSwatch.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {product.swatches.map(swatch => {
                        const isSelected = currentSwatchId === swatch.id;
                        const isLight = /^#([fF]|e5|e8|ea|eb|d1|c7|c4|ae|a8|a1)/.test(swatch.hex);
                        return (
                          <button
                            key={swatch.id}
                            type="button"
                            onClick={() => handleSelectSwatch(product.id, swatch.id)}
                            aria-label={`Select ${swatch.name}${isSelected ? ' (selected)' : ''}`}
                            aria-pressed={isSelected}
                            title={swatch.name}
                            className={`group/sw relative flex h-[30px] w-[30px] items-center justify-center rounded-full cursor-pointer
                                       transition-all duration-200 ease-apple active-scale
                                       ${isSelected
                                         ? 'scale-110'
                                         : 'opacity-75 hover:opacity-100 hover:scale-105'
                                       }`}
                          >
                            {/* Outer ring */}
                            <span
                              className={`absolute inset-0 rounded-full transition-all duration-200
                                          ${isSelected
                                            ? 'ring-2 ring-foreground/90 ring-offset-2 ring-offset-[#1c1c1e] shadow-apple-sm'
                                            : 'ring-1 ring-silver-800/50 hover:ring-silver-600/60'
                                          }`}
                            ></span>
                            {/* Swatch color */}
                            <span
                              className={`relative h-[22px] w-[22px] rounded-full shadow-inner transition-transform duration-200
                                          ${isLight ? 'border border-silver-700/50' : ''}`}
                              style={{ backgroundColor: swatch.hex }}
                            >
                              {/* Inner highlight */}
                              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-black/10 pointer-events-none"></span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── Price + CTA ─── */}
                  <div className="mt-5 pt-4 border-t border-silver-900/60">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-[20px] sm:text-xl font-bold text-foreground tabular-nums tracking-apple-tight leading-none">
                        ฿{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-[12px] text-muted line-through tabular-nums leading-none">
                          ฿{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className={`relative w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4
                                 text-[13px] font-bold tracking-wide active-scale cursor-pointer overflow-hidden
                                 transition-all duration-220 ease-apple
                                 ${isAdded
                                   ? 'bg-gradient-to-b from-success to-emerald-600 text-white shadow-[0_4px_16px_rgba(48,209,88,0.3)] border border-success/40'
                                   : 'bg-metallic-button hover:bg-metallic-button-hover text-background shadow-apple hover:shadow-apple-lg border border-silver-400/30'
                                 }`}
                    >
                      {/* Button highlight sweep */}
                      {!isAdded && (
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover/card:opacity-100
                                        translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-700 ease-out pointer-events-none"></span>
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {isAdded ? (
                          <>
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                            <span>เพิ่มแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                              <path d="M3 6h18" />
                              <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            <span>เพิ่มลงตะกร้า</span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Mobile nav hint (xs/sm only) */}
        <div className="sm:hidden mt-4 flex justify-center gap-1.5" aria-hidden="true">
          <span className="h-1 w-8 rounded-full bg-silver-700/70"></span>
          <span className="h-1 w-1 rounded-full bg-silver-800"></span>
          <span className="h-1 w-1 rounded-full bg-silver-800"></span>
        </div>

        {/* ── WHITE BREAK — Vercel-style light segment (breaks the dark page) ── */}
        <div className="mt-20 relative ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] w-screen bg-white text-[#171717] border-y border-[#eaeaea]">
          {/* subtle light grid — Vercel Geist feel */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.045) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 75% 65% at 50% 0%, #000 35%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 0%, #000 35%, transparent 100%)',
            }}
          ></div>
          {/* top fade from dark page into white */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/10 to-transparent pointer-events-none"></div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            {/* ── Headline block — centered like vercel.com ── */}
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eaeaea] bg-[#fafafa]
                              px-3.5 py-1.5 text-[12px] font-semibold text-[#666] shadow-sm mb-6">
                <span aria-hidden="true" className="text-[11px] text-black">▲</span>
                <span className="tracking-wide">Silver Surface — Built for speed</span>
                <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white leading-none">New</span>
              </div>

              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.04em] leading-[1.05] text-black text-balance">
                Shop faster.
                <span className="block text-[#666]">Checkout in one click.</span>
              </h2>
              <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-[#666] max-w-xl text-balance">
                The storefront for modern essentials — curated products, honest pricing,
                and delivery tracking. No noise, just what works.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
                <Link
                  to="/product"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-8
                             bg-[#171717] hover:bg-black text-white text-[14px] font-semibold
                             shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)]
                             hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  Start Shopping
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  to="/order"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-8
                             bg-white hover:bg-[#fafafa] text-[#171717] text-[14px] font-semibold
                             border border-[#eaeaea] hover:border-[#d4d4d4] shadow-sm
                             hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  Track Order
                </Link>
              </div>
            </div>

            {/* ── Feature grid — Vercel hairline cards ── */}
            <div className="mt-14 grid sm:grid-cols-3 rounded-2xl overflow-hidden border border-[#eaeaea] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  ),
                  title: '1-Click Checkout',
                  desc: 'Cash on delivery with instant order confirmation. No account gymnastics.',
                  link: 'Try checkout',
                  to: '/cart',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                  ),
                  title: 'Curated Quality',
                  desc: 'Eight essentials, hand-picked and rated 4.8+ by real shoppers.',
                  link: 'Browse collection',
                  to: '/product',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ),
                  title: 'Tracked Delivery',
                  desc: 'Live status from confirmed → shipped → delivered. Look it up anytime.',
                  link: 'Track order',
                  to: '/order',
                },
              ].map((f, idx) => (
                <Link
                  key={f.title}
                  to={f.to}
                  className={`group relative p-7 sm:p-8 text-left bg-white hover:bg-[#fafafa] transition-colors duration-200 cursor-pointer
                    ${idx !== 0 ? 'border-t sm:border-t-0 sm:border-l border-[#eaeaea]' : ''}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-[#171717] text-white flex items-center justify-center shadow-sm mb-5 group-hover:scale-105 transition-transform duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-tight text-black">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0070f3] group-hover:gap-2 transition-all duration-200">
                    {f.link}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>

            {/* ── Stats bar — Vercel numbers row ── */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 rounded-2xl border border-[#eaeaea] bg-[#fafafa] overflow-hidden divide-x divide-[#eaeaea]">
              {[
                { value: '8', label: 'Curated essentials' },
                { value: '4.8★', label: 'Average rating' },
                { value: 'COD', label: 'Cash on delivery' },
                { value: '24h', label: 'Fast dispatch' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`px-6 py-6 text-center ${i >= 2 ? 'border-t sm:border-t-0 border-[#eaeaea]' : ''} ${i === 2 ? 'border-l-0 sm:border-l' : ''}`}
                >
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black tabular-nums">{s.value}</div>
                  <div className="mt-1 text-[12px] font-medium text-[#666] uppercase tracking-[0.12em]">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Black CTA card inside white — classic Vercel triangle footer ── */}
            <div className="mt-4 relative overflow-hidden rounded-2xl bg-black text-white border border-black">
              {/* triangle motif */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{
                  backgroundImage: 'linear-gradient(115deg, transparent 49.5%, #fff 49.5%, #fff 50.5%, transparent 50.5%)',
                  backgroundSize: '72px 72px',
                }}
              ></div>
              <div aria-hidden="true" className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[240px] rounded-full bg-white/10 blur-[100px] pointer-events-none"></div>

              <div className="relative px-6 py-12 sm:p-14 text-center max-w-xl mx-auto">
                <div className="text-2xl mb-4" aria-hidden="true">▲</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-tight">
                  Get drops first.
                </h3>
                <p className="mt-3 text-[14px] text-[#a1a1a6] leading-relaxed">
                  New arrivals, limited editions, and exclusive offers — straight to your inbox. No spam, ever.
                </p>

                <form
                  className="mt-8 flex flex-col sm:flex-row gap-3"
                  onSubmit={handleNewsletterSubmit}
                  noValidate
                >
                  <div className="w-full flex flex-col text-left">
                    <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                    <input
                      id="newsletter-email"
                      type="email"
                      placeholder="your@email.com"
                      autoComplete="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => { setNewsletterEmail(e.target.value); if (newsletterError) setNewsletterError(''); }}
                      aria-label="Email address"
                      aria-invalid={newsletterError ? 'true' : undefined}
                      aria-describedby={newsletterError ? 'newsletter-error' : 'newsletter-hint'}
                      className="w-full h-12 px-4 rounded-full border border-white/15 bg-white/[0.06]
                               text-[14px] text-white placeholder:text-[#8e8e93]
                               focus:outline-none focus:border-white/40 focus:bg-white/[0.09] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]
                               transition-all duration-200"
                    />
                    {newsletterError ? (
                      <p id="newsletter-error" role="alert" className="mt-2 text-[13px] font-medium text-[#ff9d9a]">{newsletterError}</p>
                    ) : (
                      <p id="newsletter-hint" className="mt-2 text-[12px] text-[#8e8e93]">Unsubscribe anytime. We respect your privacy.</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="h-12 px-7 rounded-full shrink-0 cursor-pointer
                               bg-white hover:bg-[#e8e8ed] text-black
                               font-semibold text-[14px] shadow-lg
                               hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200
                               flex items-center justify-center gap-2"
                  >
                    Subscribe
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            {/* ── Logo strip — grayscale wordmarks ── */}
            <p className="mt-12 text-center text-[12px] font-semibold uppercase tracking-[0.22em] text-[#666]">
              Powering modern everyday carry
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[#666]">
              {['CHROME', 'MONO', 'ATELIER', 'NORDIC', 'KIOSK', 'FORM'].map((brand) => (
                <span key={brand} className="text-[15px] font-extrabold tracking-[0.18em] hover:text-black transition-colors duration-200 cursor-default select-none">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
