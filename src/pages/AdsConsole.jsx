import React from 'react';
import { Link } from 'react-router-dom';
import { AdminShell, AdminHeader, MetalCard } from '../components/admin';

/**
 * Ads Console (audit fix #10).
 *
 * What was wrong on the deployed site:
 *   * Every status was "Not Configured" forever, and the page showed the raw
 *     placeholder IDs ("123456789012345", "G-XXXXXXXXXX") as if they were real.
 *   * It claimed guarantees that nothing in the codebase implements ("each order
 *     is matched across Meta, TikTok, LINE & Google", "no double-counting").
 *
 * The status itself is legitimately build-time: Vite inlines import.meta.env
 * into the bundle, so a pixel becomes "Active" by setting the env var and
 * redeploying. This page now says exactly that, and reports honestly what the
 * current build has.
 */

const PLACEHOLDER_MARKERS = ['XXXXXXXX', '1234567890', '123456789', 'C123'];

function getPixelStatus(envId) {
  if (!envId) return { status: 'ปิดอยู่ · Not configured', ok: false, reason: 'ไม่ได้ตั้งค่า env' };
  if (PLACEHOLDER_MARKERS.some((m) => String(envId).includes(m))) {
    return { status: 'ปิดอยู่ · Not configured', ok: false, reason: 'ยังเป็นค่าตัวอย่าง (placeholder)' };
  }
  return { status: 'เปิดใช้งาน · Active', ok: true, reason: 'ตั้งค่าจริงแล้ว — SDK จะถูกโหลด' , envId };
}

export default function AdsConsole() {
  const env = (import.meta && import.meta.env) || {};

  const meta = getPixelStatus(env.VITE_META_PIXEL_ID);
  const ga4 = getPixelStatus(env.VITE_GA4_MEASUREMENT_ID);
  const line = getPixelStatus(env.VITE_LINE_TAG_ID);
  const tiktok = getPixelStatus(env.VITE_TIKTOK_PIXEL_ID);

  const cards = [
    {
      title: 'Meta · เมตา (Facebook / Instagram)',
      env: 'VITE_META_PIXEL_ID',
      state: meta,
      desc: 'Browser pixel for Meta ads. The fbevents.js SDK is only downloaded when a real Pixel ID is set.',
      descTh: 'พิกเซลฝั่งเบราว์เซอร์ — ตัว SDK จะถูกโหลดเฉพาะเมื่อมี Pixel ID จริงเท่านั้น',
    },
    {
      title: 'Google Analytics 4 · GA4',
      env: 'VITE_GA4_MEASUREMENT_ID',
      state: ga4,
      desc: 'GA4 page views and e-commerce events (view_item, add_to_cart, begin_checkout, purchase).',
      descTh: 'ส่ง page_view และอีเวนต์อีคอมเมิร์ซไปยัง GA4',
    },
    {
      title: 'LINE · ไลน์',
      env: 'VITE_LINE_TAG_ID',
      state: line,
      desc: 'LINE Ads conversion tag for Thai-market remarketing audiences.',
      descTh: 'แท็ก Conversion สำหรับ LINE Ads และกลุ่มรีมาสเก็ตติ้ง',
    },
    {
      title: 'TikTok · ติ๊กต๊อก',
      env: 'VITE_TIKTOK_PIXEL_ID',
      state: tiktok,
      desc: 'TikTok ads measurement. Note: the SDK used to be downloaded even with no Pixel ID, which threw a console error on every page — that is fixed.',
      descTh: 'วัดผลโฆษณา TikTok — เดิมโหลด SDK ทุกหน้าแม้ไม่มี Pixel ID ทำให้เกิด error ใน console (แก้แล้ว)',
    },
  ];

  const activeCount = cards.filter((c) => c.state.ok).length;

  return (
    <AdminShell>
      <AdminHeader
        eyebrow={`Ads tracking · ${activeCount}/${cards.length} เปิดใช้งาน`}
        title="Ads Console"
        titleTh="คอนโซลติดตามโฆษณา"
        description="สถานะของพิกเซลทั้งหมดมาจาก build-time environment variables — หน้านี้อ่านค่าที่ถูกฝังอยู่ในเวอร์ชันที่ deploy อยู่จริง"
        actions={
          <>
            <Link
              to="/settings"
              className="inline-flex h-10 items-center rounded-xl border border-silver-800/80 bg-glass-light px-4 text-[13px] font-semibold text-silver-200 hover:text-foreground hover:border-silver-600/80 transition-colors"
            >
              Settings / ตั้งค่า
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-xl bg-metallic-button hover:bg-metallic-button-hover px-4 text-[13px] font-bold text-background border border-silver-400/30 shadow-apple-sm transition-all"
            >
              ← Dashboard
            </Link>
          </>
        }
      />

      <MetalCard className="p-5 text-xs text-muted leading-relaxed">
        <p className="mb-2 font-semibold text-silver-200">ทำไมสถานะถึงไม่เปลี่ยน · why the status cannot change here</p>
        <p>
          ค่า VITE_* ถูกฝังลงไฟล์ JS ตอน build — ต้องตั้งใน Cloudflare Pages → Environment variables (หรือ .env)
          แล้ว <strong className="text-foreground">deploy ใหม่</strong> สถานะจึงจะกลายเป็น Active
          หน้านี้ไม่มีปุ่มเปิด/ปิด เพราะค่าเหล่านี้ไม่ใช่ค่าที่แก้ตอน runtime ได้
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <span>
            <strong className="text-silver-200">ที่เก็บอีเวนต์จริง:</strong> Cloudflare D1 ผ่าน{' '}
            <code className="font-mono">POST /api/track</code> (ทำงานอยู่จริง)
          </span>
          <span>
            <strong className="text-silver-200">สกุลเงิน:</strong> THB (฿)
          </span>
        </div>
      </MetalCard>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <MetalCard key={card.env} className="p-8">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold border ${
                  card.state.ok
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}
              >
                {card.state.status}
              </span>
            </div>
            <p className="text-sm text-muted mb-2 leading-relaxed">{card.desc}</p>
            <p className="text-xs text-muted/80 mb-6 leading-relaxed">{card.descTh}</p>

            <div className="rounded-xl bg-background/60 border border-silver-900/70 p-4 text-xs text-muted overflow-x-auto whitespace-pre mb-4">
              {`Env:         ${card.env}
Status:      ${card.state.reason}
SDK loaded:  ${card.state.ok ? 'yes' : 'no (ไม่โหลดสคริปต์ของแพลตฟอร์มนี้)'}
Currency:    THB`}
            </div>

            {card.state.ok ? (
              <p className="rounded-xl bg-background/60 border border-silver-900/70 p-4 text-[11px] text-muted leading-relaxed">
                ตั้งค่าแล้ว — อีเวนต์จะถูกส่งไปยังแพลตฟอร์มนี้เมื่อผู้ใช้ทำ action ที่เกี่ยวข้อง
                (PageView / ViewContent / AddToCart / Checkout / Purchase)
              </p>
            ) : (
              <Link
                to="/settings"
                className="flex w-full h-11 items-center justify-center rounded-xl bg-glass-light border border-silver-800/80 hover:border-silver-600/80 text-sm font-semibold text-foreground transition-colors"
              >
                วิธีตั้งค่า · Configure in Settings
              </Link>
            )}
          </MetalCard>
        ))}
      </div>
    </AdminShell>
  );
}
