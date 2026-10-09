import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';

/* ─── Confetti Canvas Animation ─── */
function ConfettiCanvas() {
  const canvasRef = useRef(null);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#E5C158'];
    const pieces = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.1,
        drift: (Math.random() - 0.5) * 2,
        opacity: 1,
      });
    }

    let animationId;
    let frame = 0;

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        p.y += p.speed;
        p.x += p.drift + Math.sin(p.angle) * 0.5;
        p.angle += p.spin;

        if (p.y > canvas.height * 0.7) {
          p.opacity = Math.max(0, p.opacity - 0.01);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frame < 300) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReduced]);

  return prefersReduced ? null : (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}

/* ─── Cross-sell products (from main catalog) ─── */
import { ALL_PRODUCTS } from '../data/products';
const CROSS_SELL = ALL_PRODUCTS.slice(0, 3);

export default function OrderConfirmation() {
  const containerRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const order = location.state;

  useEffect(() => {
    if (!order) {
      navigate('/cart', { replace: true });
      return;
    }

    console.log('[Tracking] Purchase Confirmation Page Viewed');

    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.anim-in'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
      );
    }

    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [order, navigate]);

  if (!order) {
    return null;
  }

  const orderDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="flex-1 bg-background text-foreground antialiased">
      {showConfetti && <ConfettiCanvas />}

      <div ref={containerRef} className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8 text-center">
        {/* ─── Success Icon ─── */}
        <div className="anim-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-lg shadow-emerald-500/10">
          <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* ─── Thank You Message ─── */}
        <h1 className="anim-in mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
          ขอบคุณสำหรับคำสั่งซื้อ! 🎉
        </h1>
        <p className="anim-in mt-2 text-sm text-muted">
          Thank you for your order! We're preparing your package with care.
        </p>

        {/* ─── Order Summary Card ─── */}
        <div className="anim-in mt-8 rounded-2xl border border-border bg-surface p-6 lg:p-8 text-left shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Order Number</p>
              <p className="mt-0.5 text-lg font-extrabold text-foreground tabular-nums">{order.orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">วันที่สั่งซื้อ</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{orderDate}</p>
            </div>
          </div>

          {/* Order items */}
          <div className="mt-4 space-y-4">
            {order.items.map((item) => {
              const swatch = item.product.swatches.find(s => s.id === item.swatchId) || item.product.swatches[0];
              return (
                <div key={`${item.product.id}-${item.swatchId}`} className="flex items-center gap-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-semibold text-foreground">{item.product.name}</p>
                    <p className="text-xs text-muted">
                      {swatch ? swatch.name : 'Default'} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    ฿{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">฿{order.total - order.shipping}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shipping</span>
              <span className="tabular-nums">{order.shipping === 0 ? 'Free' : `฿${order.shipping}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-3 border-t border-border/60">
              <span>Total</span>
              <span className="tabular-nums">฿{order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ─── Delivery Timeline ─── */}
        <div className="anim-in mt-6 rounded-2xl border border-border bg-surface p-6 text-left">
          <h3 className="text-sm font-bold text-foreground mb-4">📦 การจัดส่ง</h3>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
              <div className="w-0.5 h-8 bg-border"></div>
              <div className="h-4 w-4 rounded-full bg-border"></div>
              <div className="w-0.5 h-8 bg-border"></div>
              <div className="h-4 w-4 rounded-full bg-border"></div>
            </div>
            <div className="flex flex-col gap-3.5">
              <div>
                <p className="text-sm font-semibold text-foreground">ยืนยันคำสั่งซื้อแล้ว</p>
                <p className="text-xs text-muted">เมื่อสักครู่</p>
              </div>
              <div className="opacity-50 mt-1.5">
                <p className="text-sm font-semibold text-foreground">กำลังเตรียมจัดส่ง</p>
                <p className="text-xs text-muted">ภายใน 24 ชม.</p>
              </div>
              <div className="opacity-50 mt-1.5">
                <p className="text-sm font-semibold text-foreground">ได้รับสินค้า</p>
                <p className="text-xs text-muted">ภายใน 1-3 วัน</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="anim-in mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            to="/order"
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            ติดตามสถานะคำสั่งซื้อ
          </Link>
          <Link
            to="/"
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium text-foreground transition-all hover:bg-surface/80 hover:shadow-sm"
          >
            กลับหน้าร้าน
          </Link>
        </div>

        {/* ─── Social Sharing ─── */}
        <div className="anim-in mt-6 rounded-2xl border border-border/60 bg-surface/50 p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">แชร์ให้เพื่อน · Share</p>
          <div className="flex items-center justify-center gap-3">
            {[
              { label: 'LINE', icon: '💬', bg: 'bg-emerald-500 hover:bg-emerald-600' },
              { label: 'Facebook', icon: '📘', bg: 'bg-blue-600 hover:bg-blue-700' },
              { label: 'Twitter', icon: '🐦', bg: 'bg-sky-500 hover:bg-sky-600' },
              { label: 'Copy Link', icon: '🔗', bg: 'bg-chrome-700 hover:bg-chrome-800' },
            ].map((s) => (
              <button
                key={s.label}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors shadow-sm ${s.bg}`}
                title={s.label}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Cross-sell Carousel ─── */}
        <div className="anim-in mt-10 text-left">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold text-foreground">✨ แนะนำสินค้าสำหรับคุณ</h2>
            <Link to="/product" className="text-xs font-semibold text-muted hover:text-foreground transition-colors">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CROSS_SELL.map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.slug}`}
                className="group rounded-2xl border border-border/80 bg-surface p-3.5 shadow-sm transition-all hover:shadow-md hover:border-foreground/30 flex flex-col"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                  <p className="text-[12px] text-muted">{item.nameTh}</p>
                  <p className="mt-1.5 text-sm font-extrabold text-foreground tabular-nums">
                    ฿{item.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Guarantee Footer ─── */}
        <div className="anim-in mt-10 grid grid-cols-3 gap-3 pt-8 border-t border-border/60">
          {[
            { icon: '🛡️', label: 'Premium Quality' },
            { icon: '🔄', label: '60-Day Returns' },
            { icon: '💬', label: 'LINE @UnifiedChrome' },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-xl">{b.icon}</span>
              <span className="text-[11px] font-medium text-muted leading-tight">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
