import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';

import { ALL_PRODUCTS } from '../data/products';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { trackAddToCart, trackViewContent } from '../lib/analytics';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Find product by slug or numeric ID
  const product = ALL_PRODUCTS.find(
    (p) => p.slug === id || p.id === parseInt(id, 10)
  );

  const [selectedSwatch, setSelectedSwatch] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedSwatch(product.swatches[0]?.id);
      setActiveImage(0);
      setIsAdded(false);
      setQty(1);
    }
  }, [product?.id]);

  useEffect(() => {
    if (containerRef.current) {
      let ctx = gsap.context(() => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
        );
      });
      return () => ctx.revert();
    }
  }, [product?.id]);

  // Track ViewContent on load
  useEffect(() => {
    if (!product) return;
    trackViewContent(product);
  }, [product?.id]);

  if (!product) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="font-display text-2xl font-bold text-foreground">ไม่พบสินค้า</h1>
          <p className="mt-2 text-sm text-muted">Product not found</p>
          <Link
            to="/product"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            ดูคอลเลกชันทั้งหมด
          </Link>
        </div>
      </main>
    );
  }

  const currentSwatch = product.swatches.find((s) => s.id === selectedSwatch) || product.swatches[0];
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const relatedProducts = ALL_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  const handleAddToCart = async () => {
    setIsAdded(true);

    addToCart(product, selectedSwatch, qty);
    trackAddToCart(product, currentSwatch?.name, qty);
    toast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`);

    setTimeout(() => navigate('/cart'), 800);
  };

  return (
    <main className="flex-1 bg-background text-foreground antialiased pb-28 lg:pb-0">
      <div ref={containerRef}>
        {/* Breadcrumbs */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-2 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted">
            <Link to="/" className="hover:text-foreground transition-colors">หน้าแรก</Link>
            <span>/</span>
            <Link to="/product" className="hover:text-foreground transition-colors">Collection</Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[180px]">{product.name}</span>
          </nav>
        </div>

        {/* ─── Main PDP Grid ─── */}
        <section className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* LEFT: Image Gallery */}
            <div className="flex flex-col gap-3">
              {/* Hero Image */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/80 bg-surface group">
                <img
                  src={product.gallery[activeImage]}
                  alt={`${product.name} — view ${activeImage + 1} of ${product.gallery.length}`}
                  className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                />
                {/* Discount badge */}
                <div className="absolute top-4 left-4">
                  <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-red-500/20">
                    -{discount}%
                  </span>
                </div>
                {/* Product badge */}
                <div className="absolute top-4 right-4">
                  <span className="rounded-full bg-surface/95 backdrop-blur-sm border border-border/70 px-3 py-1 text-xs font-bold text-foreground shadow-sm">
                    {product.badge}
                  </span>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {product.gallery.length > 1 && (
                <div className="flex gap-2.5" role="group" aria-label={`Choose product view for ${product.name}`}>
                  {product.gallery.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      aria-label={`View ${idx + 1} of ${product.name}${activeImage === idx ? ' (current)' : ''}`}
                      aria-pressed={activeImage === idx}
                      aria-current={activeImage === idx ? 'true' : undefined}
                      className={`aspect-square w-20 overflow-hidden rounded-xl border-2 transition-all ${
                        activeImage === idx
                          ? 'border-foreground shadow-md scale-105'
                          : 'border-border/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" aria-hidden="true" className="h-full w-full object-contain p-1.5" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Product Info */}
            <div className="flex flex-col">
              {/* Category & Rating */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {product.category}
                </span>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold" role="img" aria-label={`Rating: ${product.rating} out of 5 stars, ${product.reviewsCount} reviews`}>
                  <span aria-hidden="true">★★★★★</span>
                  <span className="text-foreground font-bold">{product.rating}</span>
                  <span className="text-muted">({product.reviewsCount} รีวิว)</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground leading-tight">
                {product.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted">{product.nameTh}</p>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">
                  ฿{product.price.toLocaleString()}
                </span>
                <span className="text-lg text-muted line-through tabular-nums">
                  ฿{product.originalPrice.toLocaleString()}
                </span>
                <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  ประหยัด ฿{(product.originalPrice - product.price).toLocaleString()}
                </span>
              </div>

              {/* Urgency micro-indicator */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  พร้อมส่ง · In Stock
                </span>
                <span className="text-muted">•</span>
                <span className="text-muted">สั่งวันนี้ ได้รับภายใน 1-3 วัน</span>
              </div>

              {/* Description */}
              <p className="mt-5 text-sm leading-relaxed text-muted">
                {product.description}
              </p>

              {/* ─── Swatches ─── */}
              <div className="mt-6 pt-5 border-t border-border/60">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span id="pdp-swatch-label" className="font-semibold text-foreground">สี / วัสดุ</span>
                  <span aria-live="polite" className="text-muted font-medium">{currentSwatch.name}</span>
                </div>
                <div role="radiogroup" aria-labelledby="pdp-swatch-label" className="flex items-center gap-3">
                  {product.swatches.map((swatch) => {
                    const isSelected = selectedSwatch === swatch.id;
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedSwatch(swatch.id)}
                        aria-label={`Select color: ${swatch.name}${isSelected ? ' (selected)' : ''}`}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                          isSelected
                            ? 'ring-2 ring-foreground ring-offset-2 scale-110'
                            : 'opacity-70 hover:opacity-100 hover:scale-110'
                        }`}
                        title={swatch.name}
                      >
                        <span
                          aria-hidden="true"
                          className="h-7 w-7 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: swatch.hex }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Quantity ─── */}
              <div className="mt-5 pt-5 border-t border-border/60">
                <span className="text-sm font-semibold text-foreground mb-3 block">จำนวน</span>
                <div className="inline-flex items-center rounded-xl border border-border bg-surface">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-lg font-bold text-muted hover:text-foreground transition-colors"
                  >
                    −
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center text-sm font-bold tabular-nums border-x border-border">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-lg font-bold text-muted hover:text-foreground transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ─── Add to Cart CTA ─── */}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdded}
                  className={`w-full inline-flex items-center justify-center gap-2.5 rounded-2xl py-4 px-6 text-sm font-bold transition-all shadow-lg ${
                    isAdded
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>เพิ่มเข้าตะกร้าแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>เพิ่มลงตะกร้า — ฿{(product.price * qty).toLocaleString()}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    addToCart(product, selectedSwatch, qty);
                    trackAddToCart(product, currentSwatch?.name, qty);
                    navigate('/checkout');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6 text-sm font-semibold border-2 border-foreground text-foreground transition-all hover:bg-foreground hover:text-background"
                >
                  ซื้อเลย — ชำระเงินทันที
                </button>
              </div>

              {/* ─── Trust Badges (inline) ─── */}
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {[
                  { icon: '🛡️', text: 'Premium Quality Guaranteed' },
                  { icon: '🚚', text: 'ส่งฟรีเมื่อซื้อ ≥฿2,500' },
                  { icon: '🔄', text: '60-Day Returns' },
                  { icon: '💬', text: 'LINE @UnifiedChrome' },
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/50 px-3 py-2.5">
                    <span className="text-base">{badge.icon}</span>
                    <span className="text-[11px] font-medium text-muted">{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Product Details Accordion ─── */}
        <section className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-6 lg:p-8">
            <h2 className="font-display text-lg font-bold text-foreground mb-5">รายละเอียดสินค้า</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {product.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted">{d.label}</span>
                  <span className="text-sm font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted italic">{product.descriptionEn}</p>
          </div>
        </section>

        {/* ─── Reviews ─── */}
        <section className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">
            รีวิวจากลูกค้า ({product.reviewsCount})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {product.reviews.map((review, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{review.name}</span>
                  <span className="text-amber-500 text-xs font-semibold">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">{review.text}</p>
                <span className="text-[11px] text-muted/70">{review.date}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Related Products (Cross-sell) ─── */}
        <section className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8 border-t border-border/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-foreground">สินค้าที่คุณอาจสนใจ</h2>
            <Link to="/product" className="text-xs font-semibold text-muted hover:text-foreground transition-colors">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={`/product/${rp.slug}`}
                className="group rounded-2xl border border-border/80 bg-surface p-3.5 shadow-sm transition-all hover:shadow-md hover:border-foreground/30 flex flex-col"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface">
                  <img
                    src={rp.image}
                    alt={rp.name}
                    className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-foreground">{rp.name}</h3>
                  <p className="text-[12px] text-muted">{rp.nameTh}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm font-extrabold text-foreground tabular-nums">
                      ฿{rp.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted line-through tabular-nums">
                      ฿{rp.originalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Sticky Mobile CTA ─── */}
      <div aria-label="Quick add to cart" className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-lg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1" aria-live="polite">
            <p className="text-xs text-muted line-through tabular-nums">฿{product.originalPrice.toLocaleString()}</p>
            <p className="text-lg font-extrabold text-foreground tabular-nums">฿{(product.price * qty).toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdded}
            aria-live="polite"
            className={`flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all shadow-md ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isAdded ? '✓ Added!' : 'เพิ่มลงตะกร้า'}
          </button>
        </div>
      </div>

      {/* ─── Sticky Desktop CTA ─── */}
      <div aria-hidden={!showStickyBar} className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/95 backdrop-blur-lg py-3 hidden lg:block transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4 max-w-7xl mx-auto px-4 lg:px-8">
          <img src={product.gallery[0]} alt="" aria-hidden="true" className="w-12 h-12 object-contain bg-background rounded-md border border-border" />
          <div>
            <h4 className="text-sm font-bold text-foreground">{product.name}</h4>
            <p className="text-xs text-muted">{currentSwatch.name}</p>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <span className="text-lg font-extrabold text-foreground tabular-nums">฿{(product.price * qty).toLocaleString()}</span>
            <button
              onClick={handleAddToCart}
              disabled={isAdded}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 px-8 text-sm font-bold transition-all shadow-md ${
                isAdded ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isAdded ? '✓ Added!' : 'เพิ่มลงตะกร้า'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
