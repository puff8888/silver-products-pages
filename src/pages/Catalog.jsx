import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';

import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { trackAddToCart } from '../lib/analytics';
import SilverPathBackground from '../components/SilverPathBackground';

export default function Catalog() {
  const { products } = useCatalog();
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [addedProductId, setAddedProductId] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.product-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!quickViewProduct) return;
    lastFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setQuickViewProduct(null);
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus?.();
    };
  }, [quickViewProduct]);

  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    const selectedSwatchId = product.swatches[0]?.id;
    addToCart(product, selectedSwatchId, 1);
    trackAddToCart(product, product.swatches[0]?.name, 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1600);
  };

  return (
    <main className="flex-1 relative overflow-hidden">
      {/* ── Ambient background stack ── */}
      <div aria-hidden="true" className="absolute inset-0 apple-grid z-0 pointer-events-none opacity-80"></div>
      <SilverPathBackground className="absolute inset-0 z-0 opacity-80" />

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-muted mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">หน้าแรก</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Collection</span>
        </nav>

        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">The Collection</h1>
        <p className="mt-2 text-sm text-muted">Explore our full range of curated essentials.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map(p => (
            <div key={p.id} className="product-card group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm transition-all duration-220 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20">
              {/* Clicking image/title goes to PDP for deeper engagement */}
              <Link to={`/product/${p.slug}`} className="block flex flex-col flex-1">
                <div className="overflow-hidden bg-surface aspect-square">
                  <img src={p.image} alt={p.name} loading="lazy" className="aspect-square w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105" />
                </div>
                <div className="p-3 pt-2.5 space-y-0.5 flex-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{p.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted/90">{p.category}</p>
                  <div className="flex items-baseline gap-2 pt-1.5">
                    <p className="text-[15px] font-extrabold tabular-nums text-foreground">฿{p.price.toLocaleString()}</p>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <p className="text-[11px] text-muted/70 line-through tabular-nums">฿{p.originalPrice.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </Link>
              {/* Quick actions — merged segmented button, sits flush against card bottom (no wrapper radius) */}
              <div className="mx-3 mb-3 inline-flex rounded-xl border border-border bg-background overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-sm w-[calc(100%-24px)]">
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(p)}
                  className="flex-1 inline-flex items-center justify-center px-2 py-2.5 text-xs font-semibold text-foreground
                             border-r border-border transition-colors
                             hover:bg-surface active:bg-surface/80"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  Quick View
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToCart(p)}
                  aria-live="polite"
                  className={`flex-1 inline-flex items-center justify-center px-2 py-2.5 text-xs font-bold
                              transition-all duration-200
                              ${addedProductId === p.id
                                  ? 'bg-emerald-600 text-white shadow-inner'
                                  : 'bg-primary text-primary-foreground hover:bg-primary/92 active:bg-primary/80'}`}
                >
                  {addedProductId === p.id ? (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                        <path d="M3 6h18"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                      </svg>
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close quick view"
            onClick={() => setQuickViewProduct(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quickview-title"
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-background shadow-2xl fade-in flex flex-col sm:flex-row"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setQuickViewProduct(null)}
              aria-label={`Close quick view for ${quickViewProduct.name}`}
              className="absolute top-4 right-4 z-10 rounded-full bg-surface p-2 text-muted hover:text-foreground focus-visible:outline-2"
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-full sm:w-1/2 bg-surface p-8 flex items-center justify-center">
              <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-auto object-contain" />
            </div>
            <div className="w-full sm:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
              <h2 id="quickview-title" className="text-2xl font-bold text-foreground mb-2">{quickViewProduct.name}</h2>
              <p className="text-xl font-extrabold text-foreground mb-4 tabular-nums">฿{quickViewProduct.price.toLocaleString()}</p>
              <p className="text-sm text-muted mb-6 leading-relaxed line-clamp-3">{quickViewProduct.description}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    handleAddToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  เพิ่มลงตะกร้า
                </button>
                <Link
                  to={`/product/${quickViewProduct.slug}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-surface border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-border"
                >
                  ดูรายละเอียดเต็ม
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
