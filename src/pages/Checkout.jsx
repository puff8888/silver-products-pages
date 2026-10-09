import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { trackPurchase, trackInitiateCheckout, getSessionId, getRefCode } from '../lib/analytics';
import { syncOrderToCrm } from '../lib/crm';

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('promptpay');
  const shipping = subtotal >= 2500 ? 0 : 50;
  const total = subtotal + shipping;

  useEffect(() => {
    if (cartItems.length > 0) {
      trackInitiateCheckout(cartItems, subtotal);
    }
  }, []);

  if (cartItems.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">ตะกร้าว่างเปล่า</h1>
        <p className="mt-2 text-sm text-muted">Your cart is currently empty.</p>
        <button
          onClick={() => navigate('/product')}
          className="mt-6 flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          เริ่มช้อปปิ้งเลย / Start Shopping
        </button>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const customerName = formData.get('full_name');
    const customerPhone = formData.get('phone');
    const address = formData.get('address');
    const city = formData.get('city');
    const postalCode = formData.get('postal_code');

    let orderId = null;
    let orderResponseOK = false;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          total_amount: total,
          payment_method: selectedPayment,
          items: cartItems,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.order_id) {
          orderId = data.order_id;
          orderResponseOK = true;
        }
      }
    } catch (e) {
      console.warn("Order creation failed:", e);
    }

    if (!orderId) {
      orderId = 'SS-' + Math.floor(100000 + Math.random() * 900000);
    }

    trackPurchase(total, orderId, cartItems);

    // Mirror the order into the CRM/affiliate worker (fire-and-forget).
    syncOrderToCrm({
      orderId,
      customerName,
      customerPhone,
      total,
      refCode: getRefCode(),
      sessionId: getSessionId(),
    });

    toast(`🎉 สั่งซื้อสำเร็จ! Order #${orderId} กำลังดำเนินการจัดส่ง`);

    clearCart();
    navigate('/order/confirmation', {
      replace: true,
      state: {
        orderId,
        orderResponseOK,
        items: cartItems,
        total,
        shipping,
        customerName,
        customerPhone,
        address,
        city,
        postalCode,
        paymentMethod: selectedPayment,
      },
    });
  };

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted mb-6" aria-label="Breadcrumb">
          <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">หน้าแรก / Home</button>
          <span>/</span>
          <button onClick={() => navigate('/cart')} className="hover:text-foreground transition-colors">ตะกร้า / Cart</button>
          <span>/</span>
          <span className="text-foreground font-medium">Checkout · ชำระเงิน</span>
        </nav>

        <h1 className="font-display text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted">ชำระเงิน · Please complete your information</p>

        <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-5">
          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Shipping · ที่อยู่จัดส่ง</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium mb-1.5">ชื่อ-นามสกุล · Full Name</label>
                  <input type="text" id="full_name" name="full_name" required placeholder="สมชาย ใจดี / Somchai Jaidee" className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1.5">เบอร์โทรศัพท์ · Phone</label>
                  <input type="tel" id="phone" name="phone" required placeholder="08x-xxx-xxxx" pattern="[0-9+\- ]{9,}" className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors" />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium mb-1.5">ที่อยู่ · Address</label>
                  <input type="text" id="address" name="address" required placeholder="123 ถนนสุขุมวิท / 123 Sukhumvit Road" className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium mb-1.5">จังหวัด/เมือง · City</label>
                    <input type="text" id="city" name="city" required placeholder="Bangkok / กรุงเทพฯ" className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium mb-1.5">รหัสไปรษณีย์ · Postal Code</label>
                    <input type="text" id="postal_code" name="postal_code" required placeholder="10110" pattern="[0-9]{5}" className="w-full h-11 rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-foreground transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Payment · วิธีชำระเงิน</h2>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-4 rounded-xl border border-border p-4 cursor-pointer transition-colors hover:border-foreground">
                  <input type="radio" name="payment" value="promptpay" checked={selectedPayment === 'promptpay'} onChange={() => setSelectedPayment('promptpay')} className="size-4" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">PromptPay (QR Code)</span>
                    <p className="text-xs text-muted mt-0.5">แสกนจ่ายผ่านแอปธนาคาร · Scan &amp; pay via banking app</p>
                  </div>
                </label>
                <label className="flex items-center gap-4 rounded-xl border border-border p-4 cursor-pointer transition-colors hover:border-foreground">
                  <input type="radio" name="payment" value="cod" checked={selectedPayment === 'cod'} onChange={() => setSelectedPayment('cod')} className="size-4" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Cash on Delivery (COD)</span>
                    <p className="text-xs text-muted mt-0.5">จ่ายเงินตอนรับสินค้า · Pay when you receive</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : `สั่งซื้อ · Place Order (฿${total.toLocaleString()})`}
            </button>
            <p className="text-[11px] text-muted text-center leading-relaxed">
              โดยการกดสั่งซื้อ = คุณยอมรับ <a href="#" className="underline hover:text-foreground">นโยบายความเป็นส่วนตัว / Privacy Policy</a> และ <a href="#" className="underline hover:text-foreground">เงื่อนไขการใช้งาน / Terms</a>
            </p>
          </form>

          <div className="md:col-span-2">
            <div className="sticky top-28 rounded-2xl border border-border bg-card p-8">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted">Order Summary · สรุปคำสั่งซื้อ</h3>
              <div className="mt-4 space-y-3">
                {cartItems.map((item) => {
                  const swatch = item.product.swatches.find(s => s.id === item.swatchId) || item.product.swatches[0];
                  return (
                    <div key={`${item.product.id}-${item.swatchId}`} className="flex justify-between text-sm">
                      <span className="text-muted">
                        {item.product.name} ×{item.quantity}
                        {swatch ? ` (${swatch.name})` : ''}
                      </span>
                      <span className="tabular-nums">฿{(item.product.price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal · ยอดรวม</span>
                  <span className="tabular-nums">฿{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Shipping · ค่าจัดส่ง</span>
                  <span className="tabular-nums">{shipping === 0 ? 'Free' : `฿${shipping}`}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-lg font-semibold border-t border-border pt-4">
                <span>Total · ทั้งสิ้น</span>
                <span className="tabular-nums">฿{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
