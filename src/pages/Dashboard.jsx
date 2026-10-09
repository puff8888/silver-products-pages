import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AdminShell, AdminHeader, MetalCard, SegmentedControl } from '../components/admin';
import { fetchAffiliates } from '../lib/crm';

/**
 * Dashboard data loader.
 *
 * NOTE (audit fix #1): this used to fall back to a hard-coded "mock" dataset
 * whenever /api/dashboard failed. That silently rendered fabricated revenue,
 * funnel and attribution numbers behind a "Live" badge. It now surfaces the
 * failure instead of inventing data.
 */
const fetchDashboardData = async (range) => {
  try {
    const res = await fetch(`/api/dashboard?range=${range}`);
    if (!res.ok) {
      return { ok: false, error: `API ตอบกลับ HTTP ${res.status}` };
    }
    const d = await res.json();
    return {
      ok: true,
      events: d.events,
      revenue: d.revenue,
      revenue_raw: d.revenue_raw,
      orders: d.orders,
      cr: d.cr,
      line: d.line,
      active_shoppers: d.active_shoppers,
      funnel: d.funnel,
      attribution: d.attribution,
      data_source: d.data_source,
    };
  } catch (e) {
    return { ok: false, error: 'เชื่อมต่อ API ไม่ได้' };
  }
};

const KPI_ICONS = {
  events: (<path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 5-6" />),
  revenue: (<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-5.5h8M12 21a9 9 0 100-18 9 9 0 000 18z" />),
  cr: (<path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M15 7h6v6" />),
  line: (<path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-8 4h5M21 12a9 9 0 01-13.2 7.9L3 21l1.2-4.3A9 9 0 1121 12z" />),
};

const thb = (n) => `฿${Number(n || 0).toLocaleString()}`;

export default function Dashboard() {
  const [range, setRange] = useState('today');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState(null);
  const [affiliateError, setAffiliateError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [deepDive, setDeepDive] = useState(false);

  const containerRef = useRef(null);
  const barsRef = useRef([]);

  const addToRefs = (el) => {
    if (el && !barsRef.current.includes(el)) barsRef.current.push(el);
  };

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.card', { opacity: 0, y: 20, stagger: 0.08, duration: 0.7, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    barsRef.current = [];

    fetchAffiliates().then((res) => {
      if (cancelled) return;
      if (res && Array.isArray(res.affiliates)) {
        setAffiliates(res.affiliates);
        setAffiliateError(null);
      } else {
        setAffiliates([]);
        setAffiliateError('ดึงข้อมูล Affiliate (CRM worker) ไม่สำเร็จ');
      }
    });

    fetchDashboardData(range).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res);
      setTimeout(() => {
        gsap.fromTo(
          barsRef.current,
          { width: '0%' },
          { width: (i, el) => el.dataset.width, duration: 1, ease: 'power3.out', stagger: 0.1 }
        );
      }, 50);
    });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const getDropClass = (drop) => {
    if (drop >= 70) return 'bg-destructive/10 text-destructive border border-destructive/20';
    if (drop >= 40) return 'bg-warning/10 text-warning border border-warning/20';
    return 'bg-success/10 text-success border border-success/20';
  };

  const liveActive = data?.active_shoppers ?? 0;

  // LINE tile (#13): the API only knows about a LINE channel if events actually
  // carry one. `line === null` now means "no LINE data" — so we show "—"
  // instead of a permanent, meaningless 0 labelled "Live Sync".
  const lineValue = data?.line;

  const kpis = [
    {
      key: 'events',
      label: 'Total Events',
      labelTh: 'อีเวนต์ทั้งหมด',
      val: data?.events,
      sub: 'จาก D1 · บันทึกอัตโนมัติทุกหน้า',
      trend: 'text-success',
      line: 'M0,20 Q10,5 20,15 T40,10 T60,20 T80,5',
    },
    {
      key: 'revenue',
      label: 'Purchases · Revenue',
      labelTh: 'ยอดขายรวม',
      val: data?.revenue,
      sub: `${data?.orders || 0} Orders / คำสั่งซื้อ (จาก D1)`,
      trend: 'text-success',
      line: 'M0,25 Q15,20 25,10 T50,15 T70,5 T80,0',
    },
    {
      key: 'cr',
      label: 'Conversion Rate',
      labelTh: 'อัตราการแปลง',
      val: data?.cr,
      sub: 'Orders ÷ Sessions · สั่งซื้อ ÷ ผู้เข้าชม',
      trend: 'text-warning',
      line: 'M0,10 Q20,20 40,15 T60,10 T80,15',
    },
    {
      key: 'line',
      label: 'LINE OA',
      labelTh: 'ไลน์ โอเอ',
      val: lineValue === null || lineValue === undefined ? '—' : lineValue,
      sub: lineValue === null || lineValue === undefined
        ? 'ยังไม่มี event ที่มาจาก LINE · no LINE channel data'
        : 'Sessions จากช่องทาง LINE · attribution',
      trend: lineValue === null || lineValue === undefined ? 'text-muted' : 'text-success',
      line: 'M0,25 Q20,15 40,20 T60,10 T80,5',
    },
  ];

  // Revenue reconciliation (#12): storefront orders live in D1 (this dashboard),
  // affiliate-attributed orders live in the CRM worker. They are separate
  // systems, so we show both explicitly instead of implying one number.
  const affiliateOrders = (affiliates || []).reduce((sum, a) => sum + (a.orders || 0), 0);
  const affiliateValue = (affiliates || []).reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  const storeRevenue = data?.revenue_raw ?? null;
  const combinedRevenue = storeRevenue === null ? null : storeRevenue + affiliateValue;

  // AI insight (#11): previously a hard-coded claim ("Meta ROAS 3.2x, move 15%
  // of budget") that did not reflect the account at all — the ROAS column is
  // never populated because ad spend is not integrated. The text is now derived
  // from the data actually on screen, and says so when there is not enough.
  const channels = (data?.attribution || []).filter((a) => (a.pv || 0) > 0);
  const bestChannel = channels.slice().sort((a, b) => (b.purchase_value || 0) - (a.purchase_value || 0))[0];
  const topTraffic = channels.slice().sort((a, b) => (b.pv || 0) - (a.pv || 0))[0];
  const roasAvailable = (data?.attribution || []).some((a) => a.roas && a.roas !== '—');

  const insightText = (() => {
    if (error) return 'โหลดข้อมูลไม่สำเร็จ — ยังสรุปคำแนะนำไม่ได้ / cannot advise without data.';
    if (!data) return 'กำลังวิเคราะห์ข้อมูล…';
    if (!channels.length) return 'ยังไม่มีข้อมูล attribution ในช่วงเวลานี้';
    const withSales = channels.filter((a) => (a.purchase_value || 0) > 0);
    if (!withSales.length) {
      return `ช่วงนี้ยังไม่มียอดขายที่ attribution ได้ — มี traffic ${topTraffic.pv} pageview จากช่องทาง "${topTraffic.ch}" แต่ยังไม่มี purchase`;
    }
    const parts = [
      `ช่องทางที่สร้างยอดขายสูงสุด: "${bestChannel.ch}" (${thb(bestChannel.purchase_value)} จาก ${bestChannel.p} ออเดอร์)`,
      `traffic มากสุด: "${topTraffic.ch}" (${topTraffic.pv} pageview)`,
    ];
    if (!roasAvailable) parts.push('ROAS ยังคำนวณไม่ได้ เพราะยังไม่ได้เชื่อมข้อมูลค่าโฆษณา (ad spend)');
    return parts.join(' · ');
  })();

  const copyInsight = async () => {
    try {
      await navigator.clipboard.writeText(insightText);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } catch {
      setApplied(false);
    }
  };

  return (
    <AdminShell>
      <div ref={containerRef}>
        <AdminHeader
          eyebrow={error ? '⚠️ ข้อมูลไม่พร้อม · API error' : `Live · ${liveActive} Active · ผู้ใช้งานออนไลน์`}
          title="Analytics Overview"
          titleTh="ภาพรวมวิเคราะห์ผลงาน"
          description="Sales attribution & funnel health · Live updates — multi-platform ready: Shopify, LINE OA & any store."
          actions={
            <SegmentedControl
              ariaLabel="Date range"
              value={range}
              onChange={setRange}
              options={[
                { value: 'today', label: 'วันนี้ · TODAY' },
                { value: '7d', label: '7 วัน · 7D' },
                { value: '30d', label: '30 วัน · 30D' },
              ]}
            />
          }
        />

        {/* Explicit API failure state — replaces the old silent mock fallback */}
        {error && (
          <MetalCard className="card mb-6 p-6 border-destructive/40" role="alert">
            <h3 className="font-display text-base font-bold text-destructive">
              โหลดข้อมูลจาก API ไม่สำเร็จ · Could not load dashboard data
            </h3>
            <p className="mt-1 text-sm text-muted">
              {error} — ตัวเลขทั้งหมดถูกซ่อนไว้เพื่อไม่ให้เข้าใจผิดว่าเป็นข้อมูลจริง
              (ระบบเดิมจะแสดงตัวเลขปลอมแทน ซึ่งแก้แล้ว)
            </p>
            <button
              type="button"
              onClick={() => setRange((r) => r)}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-metallic-button px-5 text-[13px] font-bold text-background border border-silver-400/30"
            >
              ลองใหม่ · Retry
            </button>
          </MetalCard>
        )}

        {/* AI Insights — derived from the live attribution data on screen */}
        <MetalCard className="card mb-6 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-metallic-button text-background shadow-apple-sm border border-silver-400/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">
                AI Prescriptive Insights <span className="text-sm font-semibold text-muted">· ข้อเสนอแนะอัจฉริยะ</span>
              </h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed max-w-3xl">{insightText}</p>
              <p className="mt-1 text-[11px] text-muted/80">
                สรุปจากข้อมูล attribution บนหน้านี้ · derived from the data on this page
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyInsight}
                  className="inline-flex h-10 items-center rounded-xl bg-metallic-button hover:bg-metallic-button-hover px-5 text-[13px] font-bold text-background shadow-apple border border-silver-400/30 active-scale transition-all duration-200 cursor-pointer"
                >
                  {applied ? '✓ คัดลอกแล้ว · Copied' : 'Apply Recommendation · คัดลอกข้อเสนอแนะ'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeepDive((v) => !v)}
                  aria-expanded={deepDive}
                  className="inline-flex h-10 items-center rounded-xl bg-glass-light hover:bg-surface-100/90 px-5 text-[13px] font-semibold text-foreground border border-silver-800/80 hover:border-silver-600/80 active-scale transition-all duration-200 cursor-pointer"
                >
                  {deepDive ? 'ซ่อนรายละเอียด · Hide detail' : 'View Deep Dive · ดูรายละเอียด'}
                </button>
              </div>

              {deepDive && (
                <div className="mt-4 rounded-xl border border-silver-900/70 bg-background/60 p-4 text-xs leading-relaxed">
                  <p className="font-semibold text-silver-200 mb-2">ที่มาของตัวเลข · where these numbers come from</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted">
                    <li>ยอดขาย/Oders: ตาราง <span className="font-mono">orders</span> ใน Cloudflare D1 ผ่าน <span className="font-mono">/api/dashboard</span></li>
                    <li>Events/Funnel: ตาราง <span className="font-mono">events</span> (นับ session ที่ไม่ซ้ำในแต่ละขั้น)</li>
                    <li>Affiliate: CRM worker แยกต่างหาก — <span className="font-mono">GET /api/aff/affiliates</span></li>
                    <li>ROAS: {roasAvailable ? 'คำนวณจากค่าโฆษณาที่เชื่อมไว้' : 'ยังไม่มีข้อมูลค่าโฆษณา (ad spend) จึงแสดง —'}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </MetalCard>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {kpis.map((kpi) => (
            <MetalCard key={kpi.key} className="card group p-6 flex flex-col gap-2 hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">
                  {kpi.label} · {kpi.labelTh}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-silver-800/70 bg-surface-500/70 text-silver-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">{KPI_ICONS[kpi.key]}</svg>
                </span>
              </div>
              <span className="font-display text-3xl font-bold tabular-nums text-silver-gradient">
                {error ? '—' : (kpi.val || '…')}
              </span>
              <span className={`text-xs font-medium ${kpi.trend}`}>{kpi.sub}</span>
              <svg className="mt-2 w-full h-12 opacity-15 group-hover:opacity-25 transition-opacity text-silver-300" viewBox="0 0 80 30" preserveAspectRatio="none" aria-hidden="true">
                <path d={kpi.line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <path d={`${kpi.line} L80,30 L0,30 Z`} fill="currentColor" opacity="0.25" />
              </svg>
            </MetalCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <MetalCard className="card p-6">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h3 className="font-display text-lg font-bold text-foreground">
                Funnel Flow <span className="text-sm font-medium text-muted">· เส้นทางการแปลง</span>
              </h3>
              <span className="text-[11px] text-muted font-mono">PV → VC → ATC → C/O → Buy</span>
            </div>
            <div className="flex flex-col gap-6">
              {loading ? (
                <div className="animate-pulse h-32 bg-surface-500/60 rounded-xl" />
              ) : error || !data ? (
                <p className="text-sm text-muted">ไม่มีข้อมูล (API error)</p>
              ) : (
                data.funnel.map((f, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex flex-wrap justify-between items-baseline gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground/80 font-medium">{f.step}</span>
                        <span className="text-muted mx-2">·</span>
                        <span className="text-muted">{f.stepTh}</span>
                      </div>
                      <span className="font-semibold tabular-nums whitespace-nowrap text-foreground">
                        {f.rate === null || f.rate === undefined ? '—' : `${f.rate}%`}{' '}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-md font-bold ${getDropClass(f.drop ?? 0)}`}>
                          {f.note === 'no_data'
                            ? 'ไม่มีข้อมูล'
                            : f.note === 'later_stage_higher'
                              ? 'ขั้นถัดไปมี session มากกว่า'
                              : `drop ${f.drop}%`}
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface-500/70 border border-silver-900/60 rounded-full overflow-hidden">
                      <div ref={addToRefs} data-width={`${f.rate ?? 0}%`} className="h-full rounded-full bg-gradient-to-r from-silver-500 via-silver-200 to-white" />
                    </div>
                    <div className="text-[11px] text-muted tabular-nums">
                      {typeof f.from === 'number' ? f.from.toLocaleString() : '—'} → {typeof f.to === 'number' ? f.to.toLocaleString() : '—'} sessions
                    </div>
                  </div>
                ))
              )}
            </div>
          </MetalCard>

          {/* Attribution Table */}
          <MetalCard className="card p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h3 className="font-display text-lg font-bold text-foreground">
                Sales Attribution <span className="text-sm font-medium text-muted">· ที่มาของยอดขาย</span>
              </h3>
              <span className="text-[11px] text-muted">Value in THB</span>
            </div>
            {loading ? (
              <div className="animate-pulse h-32 bg-surface-500/60 rounded-xl" />
            ) : error || !data ? (
              <p className="text-sm text-muted">ไม่มีข้อมูล (API error)</p>
            ) : (
              <table className="w-full text-left text-sm min-w-[520px]">
                <thead>
                  <tr className="text-muted border-b border-silver-900/70">
                    <th className="pb-3 font-medium">Channel · ช่องทาง</th>
                    <th className="pb-3 font-medium">Session</th>
                    <th className="pb-3 font-medium">PV</th>
                    <th className="pb-3 font-medium">VC</th>
                    <th className="pb-3 font-medium">Buy</th>
                    <th className="pb-3 font-medium">Value ฿</th>
                    <th className="pb-3 font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attribution.map((a, i) => (
                    <tr key={i} className="border-b border-silver-900/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-semibold pr-3 text-foreground">{a.ch}</td>
                      <td className="py-3 tabular-nums text-muted">{a.sessions ?? '—'}</td>
                      <td className="py-3 tabular-nums text-silver-200">{a.pv}</td>
                      <td className="py-3 tabular-nums text-muted">{a.vc ?? '—'}</td>
                      <td className="py-3 tabular-nums text-success font-semibold">{a.p}</td>
                      <td className="py-3 tabular-nums text-foreground">{a.purchase_value != null ? thb(a.purchase_value) : '—'}</td>
                      <td className="py-3 tabular-nums font-bold text-silver-100">{a.roas}</td>
                    </tr>
                  ))}
                  {data.attribution.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-4 text-sm text-muted">ยังไม่มีข้อมูล attribution ในช่วงเวลานี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-[11px] text-muted/80 leading-relaxed">
              Channel มาจาก <span className="font-mono">events.channel</span> ซึ่งบันทึกจาก UTM/click-id ของผู้เข้าชม
              (ค่าเริ่มต้น Organic) — Purchase จะถูกบันทึกตามช่องทาง attribution ไม่ใช่ชื่อหน้า
            </p>
          </MetalCard>
        </div>

        {/* Affiliate Performance — separate data source, shown as such (#12) */}
        <MetalCard className="card mt-6 p-6 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
            <h3 className="font-display text-lg font-bold text-foreground">
              Affiliate Performance <span className="text-sm font-medium text-muted">· ประสิทธิภาพพาร์ทเนอร์</span>
            </h3>
            <span className="text-[11px] text-muted">Commission in THB · ที่มา: CRM worker</span>
          </div>

          {affiliateError && (
            <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
              ⚠️ {affiliateError} — ตัวเลขฝั่ง affiliate อาจไม่ครบถ้วน
            </p>
          )}

          {affiliates === null ? (
            <div className="animate-pulse h-24 bg-surface-500/60 rounded-xl" />
          ) : (
            <>
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead>
                  <tr className="text-muted border-b border-silver-900/70">
                    <th className="pb-3 font-medium">Affiliate · พาร์ทเนอร์</th>
                    <th className="pb-3 font-medium">Channel</th>
                    <th className="pb-3 font-medium">Orders</th>
                    <th className="pb-3 font-medium">Value ฿</th>
                    <th className="pb-3 font-medium">Commission ฿</th>
                    <th className="pb-3 font-medium">Paid ฿</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((a) => (
                    <tr key={a.code} className="border-b border-silver-900/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-semibold pr-3 text-foreground">
                        {a.code}
                        <span className="block text-xs font-normal text-muted">{a.name}</span>
                      </td>
                      <td className="py-3 text-muted">{a.channel}</td>
                      <td className="py-3 tabular-nums text-silver-200">{a.orders ?? 0}</td>
                      <td className="py-3 tabular-nums text-foreground">{thb(a.value)}</td>
                      <td className="py-3 tabular-nums text-success font-semibold">{thb(a.commission)}</td>
                      <td className="py-3 tabular-nums text-muted">{thb(a.paid)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                          a.status === 'active'
                            ? 'bg-success/10 text-success border border-success/20'
                            : 'bg-warning/10 text-warning border border-warning/20'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {affiliates.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-4 text-sm text-muted">ยังไม่มีพาร์ทเนอร์ในระบบ CRM</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-silver-900/70 bg-background/60 p-4 text-xs text-muted leading-relaxed sm:grid-cols-3">
                <p>
                  ยอดร้าน (D1): <span className="font-semibold text-foreground">{storeRevenue === null ? '—' : thb(storeRevenue)}</span>
                </p>
                <p>
                  ยอดจาก Affiliate (CRM): <span className="font-semibold text-foreground">{thb(affiliateValue)}</span>
                  <span className="block text-muted/80">{affiliateOrders} ออเดอร์</span>
                </p>
                <p>
                  รวมทั้งสองระบบ: <span className="font-semibold text-silver-200">{combinedRevenue === null ? '—' : thb(combinedRevenue)}</span>
                </p>
                <p className="sm:col-span-3 text-muted/80">
                  สองตัวเลขนี้มาจากคนละฐานข้อมูล (Cloudflare D1 กับ CRM worker) จึงไม่ถูกบวกเข้าด้วยกันโดยอัตโนมัติ —
                  แสดงแยกเพื่อให้ตรวจสอบได้ แทนการแสดงยอดเดียวที่อาจไม่ตรง
                </p>
              </div>
            </>
          )}
        </MetalCard>

        {/* Data privacy footer */}
        <MetalCard className="mt-6 p-6 text-xs text-muted leading-relaxed">
          <p className="font-semibold text-silver-200 mb-2">Data Compliance &amp; Privacy</p>
          <p>
            PDPA (Thailand) · GDPR · CCPA — Tracking starts only after you connect a channel above; sales data is collected on our own server (Cloudflare).{' '}
            <span className="text-foreground/80">No personal data goes to ad platforms</span> — only order numbers and product totals.
          </p>
        </MetalCard>
      </div>
    </AdminShell>
  );
}
