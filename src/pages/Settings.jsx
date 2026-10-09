import React from 'react';
import { AdminShell, AdminHeader, MetalCard } from '../components/admin';

/**
 * Settings / Connections (audit fix #7).
 *
 * The deployed page looked like a saveable form (10 editable inputs, one
 * "ทดสอบ / Test" + one "Save Changes · บันทึก" button per integration) but had
 * zero handlers: clicking did nothing, and a reload wiped everything. Its copy
 * even invited the user to paste private tokens and promised they were "stored
 * on our server" — which was not true of that page at all.
 *
 * Every value here is build-time configuration (Vite inlines import.meta.env
 * into the bundle), so this page is now an honest read-only reference: it shows
 * the real status of each key and where to set it. Inputs and the dead buttons
 * are gone.
 */

const PLACEHOLDER_MARKERS = ['XXXXXXXX', '1234567890', '123456789', 'C123', 'AW-123456789', 'xxxx'];

function clientKeyStatus(value) {
  if (!value) return { state: 'unset', label: 'ยังไม่ได้ตั้งค่า', tone: 'destructive' };
  if (PLACEHOLDER_MARKERS.some((m) => String(value).includes(m))) {
    return { state: 'placeholder', label: 'ยังเป็นค่าตัวอย่าง (placeholder)', tone: 'warning' };
  }
  return { state: 'set', label: 'ตั้งค่าแล้ว', tone: 'success' };
}

const TONE = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-surface-500/80 text-muted border-silver-900/70',
};

const integrations = [
  {
    id: 'shopify',
    title: 'Shopify Sync',
    titleTh: 'ซิงค์กับช้อปปี้ไฟ',
    desc: 'Connect your Shopify store to sync products, orders, and inventory bi-directionally.',
    descTh: 'เชื่อมต่อร้าน Shopify เพื่อซิงค์สินค้า ออเดอร์ และสินค้าคงคลังสองทาง',
    fields: [
      { label: 'Shopify Store URL', env: 'SHOPIFY_STORE_URL', serverOnly: true },
      { label: 'Admin API Access Token', env: 'SHOPIFY_ADMIN_API_TOKEN', serverOnly: true },
    ],
  },
  {
    id: 'meta',
    title: 'Meta Pixel & Conversions API (CAPI)',
    titleTh: 'เมตา พิกเซล + CAPI (FB/IG)',
    desc: 'Browser pixel plus server-side CAPI events. Every order is matched by order_id so a sale is counted once.',
    descTh: 'พิกเซลฝั่งเบราว์เซอร์ + อีเวนต์ CAPI ฝั่งเซิร์ฟเวอร์ จับคู่ออเดอร์ด้วย order_id เพื่อไม่ให้นับยอดซ้ำ',
    fields: [
      { label: 'Meta Pixel ID', env: 'VITE_META_PIXEL_ID', client: true },
      { label: 'Conversions API Access Token', env: 'META_CAPI_TOKEN', serverOnly: true },
    ],
  },
  {
    id: 'google',
    title: 'Google Analytics 4 & Ads',
    titleTh: 'Google Analytics 4 + Ads',
    desc: 'GA4 Enhanced Ecommerce (view_item, add_to_cart, begin_checkout, purchase) with items[] and transaction_id.',
    descTh: 'GA4 Enhanced Ecommerce พร้อมรายการสินค้า items[] และ transaction_id สำหรับ Google Ads Import',
    fields: [
      { label: 'GA4 Measurement ID', env: 'VITE_GA4_MEASUREMENT_ID', client: true },
      { label: 'Google Ads Conversion ID', env: 'VITE_GOOGLE_ADS_CONVERSION_ID', client: true },
    ],
  },
  {
    id: 'tiktok',
    title: 'TikTok Pixel & Events API',
    titleTh: 'ติ๊กต๊อก พิกเซล + Events API',
    desc: 'TikTok ad measurement — the browser SDK is only downloaded when a real Pixel ID is configured.',
    descTh: 'วัดผลโฆษณา TikTok — SDK จะถูกโหลดเฉพาะเมื่อมี Pixel ID จริงเท่านั้น',
    fields: [
      { label: 'TikTok Pixel ID', env: 'VITE_TIKTOK_PIXEL_ID', client: true },
      { label: 'Events API Access Token', env: 'TIKTOK_EVENTS_API_TOKEN', serverOnly: true },
    ],
  },
  {
    id: 'line',
    title: 'LINE Tag (LINE Ads) + LINE OA',
    titleTh: 'ไลน์ แท็ก + LINE OA',
    desc: 'Conversion tracking for LINE Ads, plus remarketing audiences from LINE Official Account visitors.',
    descTh: 'ติดตาม Conversion สำหรับ LINE Ads + สร้างกลุ่มรีมาสเก็ตติ้งจากผู้เยี่ยมชม LINE OA',
    fields: [
      { label: 'LINE Tag ID', env: 'VITE_LINE_TAG_ID', client: true },
      { label: 'LINE OA Channel Access Token (optional)', env: 'LINE_OA_CHANNEL_TOKEN', serverOnly: true },
    ],
  },
];

export default function Settings() {
  const env = (import.meta && import.meta.env) || {};

  return (
    <AdminShell maxWidth="max-w-5xl">
      <AdminHeader
        eyebrow="Reference only · เอกสารอ้างอิง (ไม่ใช่ฟอร์มบันทึก)"
        title="Connections"
        titleTh="เชื่อมต่อร้านค้า & ช่องทางโฆษณา"
        description="ค่าทั้งหมดในหน้านี้ถูกตั้งตอน build (Vite env) แล้ว inline ลงเว็บ — แก้ในหน้านี้ไม่ได้ ต้องตั้งที่ environment ของ Cloudflare Pages แล้ว deploy ใหม่"
      />

      {/* How to actually change these values */}
      <MetalCard className="mb-6 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">วิธีตั้งค่า · How to configure</h2>
        <ol className="mt-3 space-y-3 text-sm text-muted leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-foreground">ค่า client (ขึ้นต้นด้วย VITE_)</strong> — ตั้งที่ Cloudflare Pages →
            Settings → Environment variables (Production) หรือไฟล์ <code className="font-mono">.env</code> ตอนพัฒนาบนเครื่อง
            จากนั้น <strong className="text-foreground">ต้อง deploy ใหม่</strong> ค่าจึงจะเปลี่ยน (ค่าเหล่านี้ถูกฝังตอน build)
          </li>
          <li>
            <strong className="text-foreground">ค่า server / ความลับ</strong> — ตั้งเป็น secret ของ Cloudflare Worker
            หรือ Pages Functions และเรียกใช้ผ่าน <code className="font-mono">env.*</code> เท่านั้น
            ห้ามตั้งเป็น <code className="font-mono">VITE_*</code> เพราะจะหลุดไปอยู่ในไฟล์ JS ที่ผู้ใช้ดาวน์โหลดได้
          </li>
          <li>
            ตรวจสถานะหลัง deploy ได้ที่หน้า <a href="/ads" className="underline hover:text-foreground">Ads Console</a>
          </li>
        </ol>
        <p className="mt-4 rounded-xl border border-silver-900/70 bg-background/60 px-4 py-3 text-xs text-muted leading-relaxed">
          หมายเหตุ: หน้านี้เคยมีช่องกรอกและปุ่ม “ทดสอบ / Test” กับ “Save Changes · บันทึก” ที่กดแล้วไม่เกิดอะไรขึ้นเลย
          (ไม่มี request, ไม่บันทึก, refresh แล้วหาย) — ปุ่มเหล่านั้นถูกถอดออกแล้วเพื่อไม่ให้เข้าใจผิด
        </p>
      </MetalCard>

      <div className="space-y-6">
        {integrations.map((section) => (
          <MetalCard key={section.id} className="p-8">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground">{section.title}</h3>
                <p className="text-xs text-muted/80 mt-0.5">{section.titleTh}</p>
                <p className="text-sm text-muted mt-3 leading-relaxed">{section.desc}</p>
                <p className="text-xs text-muted/80 mt-2 leading-relaxed">{section.descTh}</p>
              </div>
              <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-surface-500/80 border border-silver-900/70 text-muted uppercase tracking-wider">
                ENV
              </span>
            </div>

            <div className="space-y-3">
              {section.fields.map((field) => {
                const value = field.client ? env[field.env] : undefined;
                const status = field.client
                  ? clientKeyStatus(value)
                  : { label: 'Server-side · ตั้งที่ Cloudflare (ไม่แสดงในเบราว์เซอร์)', tone: 'neutral' };
                return (
                  <div key={field.env} className="rounded-xl border border-silver-900/70 bg-background/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{field.label}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${TONE[status.tone]}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted/80">
                      Env: <code className="px-2 py-0.5 bg-surface-500/80 border border-silver-900/60 rounded">{field.env}</code>
                    </p>
                    {field.client && status.state === 'set' && (
                      <p className="mt-2 text-[11px] text-muted">
                        ค่าที่ใช้จริงตอนนี้: <code className="font-mono text-foreground">{String(value)}</code>
                        <span className="block text-muted/70">
                          (ค่า VITE_* เป็นค่าสาธารณะ — ฝังอยู่ในไฟล์ JS ที่ผู้ใช้ดาวน์โหลดได้ จึงแสดงได้)
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </MetalCard>
        ))}

        {/* Privacy & Cookie banner section */}
        <MetalCard className="p-8">
          <h3 className="font-display text-lg font-bold mb-2 text-foreground">Privacy &amp; Cookie Preferences</h3>
          <p className="text-xs text-muted/80 mt-0.5">นโยบายความเป็นส่วนตัว &amp; การตั้งค่าคุกกี้</p>
          <p className="text-sm text-muted mt-3 leading-relaxed mb-6">
            To comply with Thailand PDPA, GDPR and CCPA the plan is to defer 3rd-party pixels until the visitor grants
            consent. <strong className="text-foreground">A consent banner is not mounted yet</strong> — until it is,
            the table below describes the intended policy rather than enforced behaviour.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {[
              { cat: 'Strictly Necessary', th: 'จำเป็นอย่างยิ่ง', items: 'Session storage, Cart state, Security tokens', status: 'Always On', color: TONE.success },
              { cat: 'Analytics', th: 'วิเคราะห์ผลงาน', items: 'GA4, Server-side D1 events', status: 'Default: Ask', color: TONE.warning },
              { cat: 'Marketing / Ads', th: 'การตลาด / โฆษณา', items: 'Meta Pixel, TikTok Pixel, LINE Tag', status: 'Default: Off', color: TONE.destructive },
            ].map((b) => (
              <div key={b.cat} className="rounded-xl border border-silver-900/70 bg-background/50 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">
                    {b.cat}<br /><span className="text-xs font-medium text-muted">{b.th}</span>
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${b.color}`}>{b.status}</span>
                </div>
                <p className="text-muted/80 leading-relaxed">{b.items}</p>
              </div>
            ))}
          </div>
        </MetalCard>
      </div>
    </AdminShell>
  );
}
