import React, { useState, useMemo } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { trackAddToCart } from '../lib/analytics';

// Reconstructed from the deployed chunk `SwatchifyPage-DB0ahTXq.js`.
// 3-step colour finder that reuses the storefront's {id, name, hex} swatch model.

const VIBES = [
  { id: 'all', label: 'All', labelTh: 'ทั้งหมด' },
  { id: 'dark', label: 'Dark', labelTh: 'โทนเข้ม' },
  { id: 'light', label: 'Light', labelTh: 'โทนอ่อน' },
  { id: 'color', label: 'Colourful', labelTh: 'มีสีสัน' },
];

const STEPS = ['Vibe', 'Product', 'Review'];

// Perceived brightness of a hex colour (0 = black, 1 = white).
function luminance(hex) {
  if (!hex || typeof hex !== 'string') return 0.5;
  const raw = hex.replace('#', '').slice(0, 6);
  if (raw.length !== 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Saturation of a hex colour (0 = grey, 1 = pure hue).
function saturation(hex) {
  if (!hex || typeof hex !== 'string') return 0;
  const raw = hex.replace('#', '').slice(0, 6);
  const parts = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  return (Math.max(...parts) - Math.min(...parts)) / 255;
}

function classifySwatch(swatch) {
  const l = luminance(swatch.hex);
  if (saturation(swatch.hex) > 0.45) return 'color';
  return l < 0.45 ? 'dark' : 'light';
}

function productsForVibe(products, vibe) {
  if (!vibe || vibe === 'all') return products;
  return products.filter((p) => (p.swatches || []).some((s) => classifySwatch(s) === vibe));
}

function pickSwatch(product, vibe) {
  if (!product?.swatches?.length) return null;
  if (!vibe || vibe === 'all') return product.swatches[0];
  return product.swatches.find((s) => classifySwatch(s) === vibe) || product.swatches[0];
}

function SwatchPicker({ swatches, value, onChange, label }) {
  if (!swatches?.length) return null;
  const current = swatches.find((s) => s.id === value) || swatches[0];
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="font-semibold text-foreground">{label || 'สี / วัสดุ'}</span>
        <span aria-live="polite" className="text-muted font-medium">{current?.name}</span>
      </div>
      <div role="radiogroup" aria-label={label || 'Select color'} className="flex items-center gap-3">
        {swatches.map((s) => {
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(s.id)}
              aria-label={`Select color: ${s.name}${selected ? ' (selected)' : ''}`}
              title={s.name}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                selected ? 'ring-2 ring-foreground ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'
              }`}
            >
              <span aria-hidden="true" className="h-7 w-7 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: s.hex }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwatchifyWizard() {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { products } = useCatalog();
  const [step, setStep] = useState(0);
  const [vibe, setVibe] = useState('all');
  const [productId, setProductId] = useState(null);
  const [swatchId, setSwatchId] = useState(null);
  const [qty, setQty] = useState(1);

  const visible = useMemo(() => productsForVibe(products, vibe), [products, vibe]);
  const product = visible.find((p) => p.id === productId) || null;
  const swatch = product ? product.swatches.find((s) => s.id === swatchId) || pickSwatch(product, vibe) : null;

  const chooseProduct = (p) => {
    setProductId(p.id);
    setSwatchId(pickSwatch(p, vibe)?.id || null);
    setStep(2);
  };

  const add = () => {
    if (!product || !swatch) return;
    addToCart(product, swatch.id, qty);
    trackAddToCart(product, swatch.name, qty);
    toast(`เพิ่ม "${product.name} (${swatch.name})" ลงตะกร้าแล้ว`);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <ol className="mb-6 flex items-center gap-2 text-xs font-semibold">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-surface-500 text-muted'}`}>
              {i + 1}
            </span>
            <span className={i === step ? 'text-foreground' : 'text-muted'}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-muted">→</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div>
          <h2 className="font-display text-lg font-bold">1 · Pick your vibe</h2>
          <p className="mt-1 text-sm text-muted">เลือกโทนสีก่อน แล้วเราจะกรองสินค้าที่มี swatch ตรงโทนให้</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {VIBES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVibe(v.id)}
                aria-pressed={vibe === v.id}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  vibe === v.id ? 'border-foreground bg-background text-foreground' : 'border-border text-muted hover:text-foreground'
                }`}
              >
                <span className="block text-sm font-bold">{v.label}</span>
                <span className="block text-xs">{v.labelTh}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            Continue · {visible.length} products
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="font-display text-lg font-bold">2 · Pick a product</h2>
          <p className="mt-1 text-sm text-muted">แตะสินค้าเพื่อเลือก แล้วปรับ swatch ต่อในขั้นตอนถัดไป</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => chooseProduct(p)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-foreground/40 ${
                  p.id === productId ? 'border-foreground' : 'border-border'
                }`}
              >
                <img src={p.image} alt="" aria-hidden="true" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                <span>
                  <span className="block text-sm font-bold text-foreground">{p.name}</span>
                  <span className="block text-xs text-muted tabular-nums">
                    ฿{p.price.toLocaleString()} · {p.swatches.length} colours
                  </span>
                </span>
              </button>
            ))}
          </div>
          {visible.length === 0 && <p className="mt-4 text-sm text-muted">No products match this vibe.</p>}
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setStep(0)} className="h-11 rounded-xl border border-border px-5 text-sm">
              Back
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="font-display text-lg font-bold">3 · Review &amp; add</h2>
          {product ? (
            <div className="mt-4 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-bold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted">{product.nameTh}</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums">฿{(product.price * qty).toLocaleString()}</p>
                </div>
              </div>

              <SwatchPicker swatches={product.swatches} value={swatch?.id} onChange={setSwatchId} />

              <div>
                <span className="mb-2 block text-sm font-semibold">จำนวน</span>
                <div className="inline-flex items-center rounded-xl border border-border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center"
                  >
                    −
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center text-sm font-bold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="flex h-10 w-10 items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(1)} className="h-11 rounded-xl border border-border px-5 text-sm">
                  Back
                </button>
                <button
                  type="button"
                  onClick={add}
                  className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
                >
                  Add to cart · เพิ่มลงตะกร้า
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Go back and pick a product first.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SwatchifyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Swatchify · ตัวช่วยเลือกสี</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Find your finish in 3 steps</h1>
      <p className="mt-2 text-sm text-muted">
        Reuses the same <code className="font-mono">{'{id, name, hex}'}</code> swatch model as the storefront PDP — pick a vibe, pick a product, review and add to cart.
      </p>
      <div className="mt-6">
        <SwatchifyWizard />
      </div>
    </main>
  );
}
