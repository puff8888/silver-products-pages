import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { trackInitiateCheckout } from '../lib/analytics';

const FREE_SHIPPING_THRESHOLD = 2500;

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useCart();

  const handleGoCheckout = () => {
    trackInitiateCheckout(cartItems, subtotal);
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">ตะกร้าว่างเปล่า</h1>
        <p className="mt-2 text-sm text-muted">Your cart is currently empty.</p>
        <Link to="/product" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          เริ่มช้อปปิ้งเลย / Start Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">หน้าแรก / Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">ตะกร้าสินค้า / Cart</span>
        </nav>

        <h1 className="font-display text-3xl font-extrabold tracking-tight">ตะกร้าของคุณ</h1>
        <p className="mt-1 text-sm text-muted">Your Cart</p>

        {subtotal < FREE_SHIPPING_THRESHOLD && (
          <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-muted">อีก <span className="font-bold text-foreground">฿{(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString()}</span> ก็ได้ส่งฟรี! · Only <span className="font-bold text-foreground">฿{(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString()}</span> to free shipping</span>
              <span className="font-semibold text-emerald-600">Free shipping เมื่อซื้อครบ ฿{FREE_SHIPPING_THRESHOLD.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {subtotal >= FREE_SHIPPING_THRESHOLD && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            <span>✅</span>
            <span>คุณได้รับสิทธิ์จัดส่งฟรีแล้ว! · Free shipping unlocked!</span>
          </div>
        )}

        <div className="mt-8 divide-y divide-border border-t border-border">
          {cartItems.map((item) => {
            const swatch = item.product.swatches.find(s => s.id === item.swatchId) || item.product.swatches[0];
            return (
              <div key={`${item.product.id}-${item.swatchId}`} className="flex items-start gap-4 py-6 sm:gap-6">
                <Link to={`/product/${item.product.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24 border border-border/60">
                  <img src={item.product.image} alt={item.product.name} className="h-full w-full object-contain p-2" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        <Link to={`/product/${item.product.slug}`} className="hover:underline">{item.product.name}</Link>
                      </h3>
                      <p className="mt-0.5 text-xs text-muted">{item.product.nameTh}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: swatch.hex }}></span>
                          {swatch.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold tabular-nums text-foreground">
                      ฿{(item.product.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-lg border border-border bg-surface shadow-xs">
                      <button onClick={() => updateQuantity(item.product.id, item.swatchId, item.quantity - 1)} aria-label={`Decrease quantity of ${item.product.name}`} className="flex h-8 w-8 items-center justify-center text-muted hover:text-foreground">−</button>
                      <span className="flex h-8 w-8 items-center justify-center text-xs font-bold tabular-nums border-x border-border">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.swatchId, item.quantity + 1)} aria-label={`Increase quantity of ${item.product.name}`} className="flex h-8 w-8 items-center justify-center text-muted hover:text-foreground">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id, item.swatchId)} className="text-xs font-semibold text-muted hover:text-red-600 transition-colors">
                      ลบออก / Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-muted">ยอดรวมสินค้า · Subtotal</span>
            <span className="tabular-nums font-semibold">฿{subtotal.toLocaleString()}</span>
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted">ค่าจัดส่ง · Shipping</span>
            <span className="text-emerald-600 font-semibold">{subtotal >= 2500 ? 'Free' : '฿50'}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-extrabold">
            <span>ยอดสุทธิ · Total</span>
            <span className="tabular-nums text-foreground">฿{(subtotal + (subtotal >= 2500 ? 0 : 50)).toLocaleString()}</span>
          </div>
          <button onClick={handleGoCheckout} className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-md">
            ดำเนินการชำระเงิน · Proceed to Checkout
          </button>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted font-medium">
            <span className="flex items-center gap-1">🛡️ Secure Checkout</span>
            <span className="flex items-center gap-1">🔄 60-Day Returns · 7-Day Return (TH)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
