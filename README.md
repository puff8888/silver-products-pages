# bruno-silver-products — ซอร์สที่สร้างใหม่จาก bundle ที่ deploy จริง + แก้บั๊ก 15 ข้อ

โปรเจกต์นี้คือ **frontend + Pages Functions ที่ reconstruct ขึ้นใหม่ให้ตรงกับเวอร์ชันที่ออนแอร์อยู่**
(`https://bruno-silver-products.pages.dev`) แล้วแก้ปัญหาทั้ง 15 ข้อจากรายงานตรวจสอบ
(`../.qa-live/LIVE-VERIFICATION-REPORT.md`)

- **Build ผ่าน** · `npm run build` → `dist/` (Vite 5.4)
- **Lint ผ่าน** · `npx eslint . --ext js,jsx` ไม่มี error/warning
- **ทดสอบ end-to-end ผ่าน** · รันจริงบน `wrangler pages dev` + D1 ในเครื่อง ด้วย Chrome จริง ผ่าน Playwright
- **ไม่มีการเขียนข้อมูลลง production ระหว่างทดสอบ** (ดูหัวข้อ "การเปิดเผย" ด้านล่าง)

---

## 1. ทำไมต้อง reconstruct

เวิร์กสเปซเดิม (`../`) เป็น **โปรเจกต์เดียวกันจริง** แต่เป็นคนละ revision กับที่ deploy:

| หลักฐาน | ผล |
|---|---|
| `wrangler.toml` เดิม | `name = "bruno-silver-products"` → ตรงกับ Pages project จริง |
| `functions/api/{track,orders,dashboard}.js` เดิม | ข้อความ validate + สูตรคำนวณ ตรงกับ API ที่ live ตอบเป๊ะ |
| `src/pages/OrderLookup.jsx` เดิม | ตรงกับ chunk ที่ live ทุกบรรทัด (รวม `BS-12345` ปลอม) |
| chunk hash ที่ live ใช้ | ตรงกับ hash ในรายงานเดิม 4/4 → รายงานเดิมตรวจ live จริง |

แต่ **ไม่มี** สิ่งเหล่านี้ในเครื่อง (live มี): `/clients`, `/swatchify`, โมดูล `crm`, และไฟล์
`functions/api/tenants.js` → จึงดึงจาก **bundle ที่ deploy จริง** (`.qa-live/assets/*.js`)
มา reconstruct เฉพาะส่วนที่ขาด ส่วนที่เหลือใช้ซอร์สจริงในเครื่องซึ่งตรวจแล้วว่าตรงกับ live

> **ไม่มี source map บน live** (`.js.map` คืน `index.html`) และ **ไม่มี `.git`** ในเวิร์กสเปซ
> ซอร์สของ Git repo ที่ผูกไว้ (`github.com/puff8888/silver-products-pages`) เข้าไม่ได้ด้วยสิทธิ์ที่มี
> และ build จาก Git ล้มเหลว (ดูหัวข้อ 6)

### ความต่างจากซอร์สในเครื่อง (branch delta)

| ไฟล์ | สถานะ | ที่มา |
|---|---|---|
| `src/App.jsx` | แก้ | เพิ่ม route `/swatchify`, `/clients` (จาก live bundle) |
| `src/components/admin.jsx` | แก้ | เมนู sidebar ตรงกับ live (เพิ่ม Clients, "My Page"), `admin-light` |
| `src/lib/crm.js` | **ใหม่** | reconstruct จาก `crm-BEpXSIQr.js` |
| `src/pages/Tenants.jsx` | **ใหม่** | reconstruct จาก `Tenants-DH80RGO9.js` แล้วแก้บั๊ก |
| `src/pages/SwatchifyPage.jsx` | **ใหม่** | reconstruct จาก `SwatchifyPage-DB0ahTXq.js` |
| `src/pages/Checkout.jsx` | แก้ | port การเรียก CRM/affiliate จาก live (ในเครื่องยังไม่มี) |
| `src/pages/Dashboard.jsx` | แก้ | เพิ่มตาราง Affiliate Performance จาก live + แก้บั๊ก |
| `functions/api/tenants.js` | **ใหม่** | reconstruct จากพฤติกรรม API จริง + schema จริงของ D1 |
| `functions/api/dashboard.js` | แก้ | แก้สูตร funnel/CR/LINE |
| `functions/api/orders.js` | แก้ | เพิ่ม `GET` สำหรับติดตามออเดอร์ |
| `functions/api/[[path]].js` | **ใหม่** | catch-all คืน 404 JSON |
| `db/schema.sql` | **ใหม่** | schema + seed สำหรับทดสอบในเครื่อง (อ่านจาก D1 production) |

**สิ่งที่ตั้งใจไม่รวมไว้** (มีในไฟล์ในเครื่อง แต่ **ไม่มี** ในเวอร์ชันที่ deploy):
Cometly pixel + Yahoo lqtag ใน `index.html`, การ์ด Cometly ใน AdsConsole, `VITE_AI_PROXY_URL`/FloatingDock AI
— ถ้าต้องการ ใส่กลับได้ (ดูหัวข้อ 8)

---

## 2. ตารางการแก้ทั้ง 15 ข้อ

| # | ปัญหาเดิม | แก้อย่างไร | ไฟล์ | หลักฐานหลังแก้ |
|---|---|---|---|---|
| 1 | Dashboard แสดง **ตัวเลขปลอม** (revenue ฿7,459, events 1,248, funnel/attribution ปลอม) เมื่อ API ล่ม โดยยังขึ้นป้าย "Live" | ลบ mock fallback ทั้งหมด → แสดงแบนเนอร์ error + KPI เป็น `—` + เปลี่ยนป้ายเป็น "⚠️ ข้อมูลไม่พร้อม" | `src/pages/Dashboard.jsx` | บังคับ `/api/dashboard` → 500: แบนเนอร์ขึ้น, ไม่มีเลขปลอม (`1,248/7,459/32,150` หายหมด) |
| 2 | `/order` เป็นของปลอม — ใส่เลขอะไรก็ได้ `Order #BS-12345` | เพิ่ม `GET /api/orders?id=SS-######` (อ่าน D1 จริง, mask PII) + หน้าเว็บยิง API จริง, แสดง 404/400 ตามจริง | `functions/api/orders.js`, `src/pages/OrderLookup.jsx` | `SS-123456` → `Order #SS-123456` / `Pending` / `So••••••` · `SS-999999` → "ไม่พบคำสั่งซื้อ" · `garbage-xyz-999` → แจ้งรูปแบบผิด · ไม่มี `BS-12345`/`Estimated Delivery` อีก |
| 3 | `channel` ถูก hardcode เป็นชื่อหน้า (`'PDP'`, `'Checkout'`) ทำให้ยอดขาย ฿2,990 ไปอยู่ช่องทาง "Checkout" | ลบ override ทั้งหมด → ใช้ `getAttributionChannel()` (UTM/click-id) และมี `page_path` แยกอยู่แล้ว | `src/lib/analytics.js` | Purchase ถูก attribute ที่ `Organic` (ช่องทางจริง) ไม่ใช่ `Checkout` |
| 4 | `/clients` POST ล้มเหลว 500 แต่ขึ้น "Registered — awaiting your approval." และลูกค้าจริง (BC Activewear) หายจากจอ | เช็ค `res.ok` ก่อนแจ้งสำเร็จ · แยก state live กับ demo (ไม่ทับกัน) · demo mode เข้าได้เฉพาะเมื่อ API ต่อไม่ได้ และติดป้ายชัดเจน | `src/pages/Tenants.jsx` | บังคับ POST → 500: ขึ้น "บันทึกไม่สำเร็จ (forced_500 (HTTP 500))", **BC Activewear ยังอยู่**, `Pending approvals (0)` (ไม่ขึ้น pending ปลอม), ไม่มีข้อความสำเร็จ |
| 5 | TikTok SDK ถูกโหลดทุกหน้าแม้ไม่มี pixel → `TypeError: t.push is not a function` ทุกหน้า | ย้ายการโหลด SDK (`ttq.load`) เข้าไปใน guard เดียวกับ init + ใช้ snippet มาตรฐานของ TikTok · Meta ก็ย้าย `fbevents.js` เข้า guard | `index.html` | โหลดทุกหน้าใหม่: **ไม่มี request ไป `analytics.tiktok.com` / `connect.facebook.net` เลย** และ **ไม่มี pageerror** |
| 6 | Pixel ID ทั้งหมดเป็น placeholder เพราะ build ไม่ได้ตั้ง env | ระบุสาเหตุชัด (production `env_vars = {}`) + เอกสารวิธีตั้ง + หน้า Settings บอกว่าค่ามาจาก build-time env + `wrangler.toml` ใช้ D1 binding จริง | `index.html`, `src/pages/Settings.jsx`, `wrangler.toml` | `/ads` ขึ้น "0/4 เปิดใช้งาน" พร้อมเหตุผล "ยังเป็นค่าตัวอย่าง (placeholder)" |
| 7 | Settings: 10 ช่องกรอก + 10 ปุ่ม (Test/Save) ที่กดแล้วไม่มีอะไรเกิดขึ้น + ข้อความชวนวาง token ลับโดยสัญญาว่าเก็บฝั่งเซิร์ฟเวอร์ | เอา input/ปุ่มออกทั้งหมด → เป็นหน้าอ้างอิง read-only ที่บอกสถานะจริงของแต่ละคีย์ + วิธีตั้งค่าที่ถูกต้อง | `src/pages/Settings.jsx` | `input=0`, ปุ่ม Test/Save `=0`, มี "Reference only", "วิธีตั้งค่า", ตรวจ placeholder ได้, คำสัญญาเท็จหายไป |
| 8 | CR = `orders ÷ max(ViewContent, AddToCart)` (ตัวหารต่ำ ทำให้ดูสูงเกินจริง) + ป้ายบนจอไม่ตรงสูตร | เปลี่ยนเป็น `orders ÷ distinct sessions` และคืน `cr_basis` มาด้วย + แก้ป้ายเป็น "Orders ÷ Sessions" | `functions/api/dashboard.js`, `src/pages/Dashboard.jsx` | `cr = 1/4 = 25.0%` พร้อม `cr_basis: "orders / distinct sessions"` |
| 9 | `/api/*` ที่ไม่มีจริงคืน **200 + HTML** (ทำให้ `res.json()` พังและ `if (!res.ok)` ไม่ทำงาน) | เพิ่ม catch-all `functions/api/[[path]].js` → 404 JSON | `functions/api/[[path]].js` | `GET/POST /api/does-not-exist`, `/api/settings` → `404 application/json {"error":"not_found",...}` |
| 10 | AdsConsole: แสดง placeholder เป็น ID จริง + อ้าง "no double-counting across Meta/TikTok/LINE/Google" โดยไม่มีอะไรรองรับ | แสดงเหตุผลของสถานะแทนการโชว์ค่าปลอม · อธิบายว่าเป็น build-time env · เอาคำอ้างที่ไม่มีจริงออก | `src/pages/AdsConsole.jsx` | `Pixel ID: 123456789012345` หายไป, มีคำอธิบาย build-time, "0/4 เปิดใช้งาน" |
| 11 | ปุ่ม "Apply Recommendation"/"View Deep Dive" ไม่มี handler + ข้อความ insight อ้าง ROAS 3.2x/5.5x ที่ไม่มีจริง | คำนวณ insight จากข้อมูล attribution จริงบนจอ (และบอกเมื่อข้อมูลไม่พอ/ยังไม่มี ROAS) · Apply = คัดลอกลง clipboard · Deep Dive = เปิด panel ที่มาของตัวเลข | `src/pages/Dashboard.jsx` | กด Apply → "✓ คัดลอกแล้ว · Copied" และ clipboard มีข้อความ insight จริง · กด Deep Dive → panel "ที่มาของตัวเลข" เปิด · ไม่มี `3.2x`/`5.5x` บนจอ |
| 12 | Revenue (D1) กับ Affiliate (worker) ไม่ตรงกัน แต่ไม่บอกผู้ใช้ | แสดงทั้งสองระบบแยกกันชัดเจน + ยอดรวม + ระบุว่าเป็นคนละฐานข้อมูล พร้อมแบนเนอร์เมื่อดึง affiliate ไม่ได้ | `src/pages/Dashboard.jsx`, `src/lib/crm.js` | ตาราง affiliate ขึ้น + แถว "ยอดร้าน (D1) / ยอดจาก Affiliate (CRM) / รวมทั้งสองระบบ" |
| 13 | การ์ด "LINE Friends" = 0 ตลอดกาล พร้อมข้อความ "Live Sync" | API คืน `null` เมื่อไม่มีช่องทาง LINE จริง → จอแสดง `—` + "ยังไม่มี event ที่มาจาก LINE" และเปลี่ยนชื่อเป็นการ์ด LINE OA | `functions/api/dashboard.js`, `src/pages/Dashboard.jsx` | `line: null` → จอขึ้น `—` + ข้อความ "no LINE channel data" |
| 14 | worker `bruno-crm-aff` คืน **501** ทุก path ที่ไม่รู้จัก (ควรเป็น 404/405) | **แก้ในรีโปนี้ไม่ได้** — worker อยู่คนละรีโป (ดู snippet ในหัวข้อ 7) | — | ระบุวิธีแก้ให้พร้อมใช้ |
| 15 | Funnel แสดง "-100%" ที่ไม่มีความหมาย (ต่อท้าย `drop` ด้วย `-`) | API คืน `rate/drop = null` + `note` เมื่อไม่มีข้อมูลหรือขั้นถัดไปมากกว่า → จอแสดง `—` + คำอธิบาย ไม่มีเครื่องหมายลบนำหน้า | `functions/api/dashboard.js`, `src/pages/Dashboard.jsx` | funnel: `5 → 2 sessions 40% drop 60%` (ไม่มี `-100%` แล้ว) |

**เพิ่มเติมระหว่างทาง (นอกเหนือ 15 ข้อ)**

- **Funnel นับ event ซ้ำ** (ข้อ 7 ในรายงาน = ข้อ 15+8 ที่รวมไว้): เปลี่ยนเป็น `count(DISTINCT session_id)` ต่อขั้น → ไม่มีขั้นที่ปลายทางมากกว่าต้นทางอีก
- `functions/api/tenants.js` **ไม่มีอยู่ในรีโปเดิมเลย** — ถ้า deploy จากรีโปเดิม `/clients` จะพังทั้งหน้า → เขียนใหม่ให้ตรง contract ที่ตรวจได้จริง (`201 registered`, `404 Tenant not found`, `400 Invalid name (min 2 chars)`) และ seed 2 เทมเพลตตอน approve
- `wrangler.toml` เดิมชี้ D1 ผิด (`bruno_crm_db` + id ปลอม) → แก้เป็น `bruno_storefront` + id จริง
- `.env` เดิมไม่มี `VITE_CRM_API_URL` → CRM/affiliate จะไม่ทำงาน → เพิ่มให้แล้ว

---

## 3. วิธีทดสอบที่ใช้ (รันซ้ำได้)

```bash
cd app
npm install
npm run build
# ทดสอบในเครื่อง: Pages Functions + D1 จำลอง (ไม่แตะ production)
export CLOUDFLARE_ACCOUNT_ID=b31b09bae0f6757a9aa03cfd03308ff5
export WRANGLER_HOME="$PWD/.wr-home" HOME="$PWD/.wr-home"   # ให้ wrangler เขียน log ในโปรเจกต์
wrangler d1 execute bruno_storefront --local --file=db/schema.sql
wrangler pages dev dist --port 8788 --ip 127.0.0.1
```

สคริปต์ทดสอบ (อยู่ที่ `../.qa-live/`):

| ไฟล์ | ตรวจอะไร |
|---|---|
| `fixed_audit.py` | end-to-end ด้วย Chrome จริง: dashboard (ปกติ + API 500), ปุ่ม AI, order lookup 3 กรณี, settings, ads, clients (บังคับ 500), และตรวจว่า **ไม่มี** third-party pixel request / pageerror |
| `fixed_audit.json` | ผลดิบทั้งหมด |
| `live_audit*.py` + `*.json` | การตรวจ **ก่อนแก้** บน live (ใช้เป็น before/after) |
| `fixed_*.png` | ภาพหน้าจอหลังแก้ |

**สรุปผลรันจริง (หลังแก้)**

```
dashboard_api_500 : error_banner=true | fabricated_numbers_gone=true | badge_not_live=true
order             : SS-123456 พบจริง (So••••••, Pending) | SS-999999 ไม่พบ | garbage = รูปแบบผิด
settings          : input_count=0 | test_buttons=0 | save_buttons=0 | reference_only=true
ads               : configured=4 | raw_placeholder_id_shown=false | build_time_explained=true
clients (500)     : false_success_gone=true | error_shown=true | BC_still_visible=true
pixels            : third_party_requests=[] | pageerrors=[] | t_push_error=false
API: /api/does-not-exist → 404 JSON | funnel 3→2→2→1 (distinct sessions) | cr_basis=orders/distinct sessions
```

---

## 4. วิธี deploy

```bash
cd app
npm run build
wrangler pages deploy dist --project-name bruno-silver-products
```

⚠️ **ก่อน deploy ควรตั้ง env ให้ครบ** (ดูหัวข้อ 5) เพราะค่า pixel ถูกฝังตอน build

**สถานะ Git repo — ซ่อมแล้ว ✅**

Pages project ผูกกับ `github.com/puff8888/silver-products-pages` (branch `main`) และ auto-deploy on push

| | ก่อน | หลัง |
|---|---|---|
| เนื้อหา repo | **ว่างเปล่า** (0 ไฟล์ — มีแค่ commit สร้าง/ลบ `.gitignore`) | ซอร์สครบ 56 ไฟล์ (`package.json`, `src/`, `functions/`, `wrangler.toml`) |
| ผล build | `No Wrangler configuration file found` → `No build command specified` → `No functions dir at /functions` → `Error: Output directory "dist" not found` → **Failed** | `queued:success + initialize:success + clone_repo:success + build:success + deploy:success` |
| commit | `7a8a330` (Delete .gitignore) — ล้มเหลว | `36f87af` — สำเร็จ และ production เสิร์ฟเวอร์ชันนี้แล้ว |

รายละเอียด: repo เดิมมี `main` ที่ commit `7a8a330` โดย **tree ว่างเปล่า** จึงไม่มีอะไรให้ทับ
ผม merge ประวัติเดิมไว้ (`git merge origin/main --allow-unrelated-histories`) แล้ว push ขึ้นไป
การ push ครั้งนี้ trigger auto-deploy ทันที → `https://bruno-silver-products.pages.dev` จึงเป็นเวอร์ชันที่แก้แล้ว

**ยืนยันบน production หลัง deploy**

```
chunk: /assets/index-Cskkncgp.js (build ใหม่ — env ว่างเหมือน production)
/api/does-not-exist        -> 404 application/json
/api/orders?id=SS-974360   -> 200 {"order_id":"SS-974360","customer_name_masked":"QA••••••",...}
/api/dashboard?range=7d    -> sessions 54 | cr 1.9% | cr_basis "orders / distinct sessions" | line null
                              funnel: ViewContent → AddToCart 2->6  rate=null note=later_stage_higher (ไม่ clamp เป็น 100% แล้ว)
dashboard (เบราว์เซอร์)     -> revenue ฿2,990 จริง | LINE "—" | ไม่มีเลขปลอม | มีส่วน Affiliate แยกแหล่งข้อมูล
/order SS-974360          -> Order #SS-974360 (Pending) · garbage -> แจ้งรูปแบบผิด · ไม่มี BS-12345
/settings                 -> input 0, button 0, "Reference only" + วิธีตั้งค่า
/ads                      -> 4 การ์ด "ปิดอยู่ · Not configured" (ไม่โชว์ placeholder เป็น ID จริง)
third-party pixel requests -> []        page errors -> []        "t.push is not a function" -> ไม่พบ
```

---

## 5. สิ่งที่ต้องตั้งที่ Cloudflare (ถึงจะครบ)

ตรวจผ่าน API แล้ว: Pages project นี้มี **`env_vars = {}`** (ว่างเปล่า) จึงอธิบายได้ว่าทำไม pixel ทุกตัวเป็น placeholder

ตั้งที่ Cloudflare Pages → **Settings → Environment variables (Production)** แล้ว deploy ใหม่:

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `VITE_META_PIXEL_ID` | Meta Pixel (ถ้าไม่ตั้ง = ไม่โหลด SDK) |
| `VITE_GA4_MEASUREMENT_ID` | GA4 |
| `VITE_TIKTOK_PIXEL_ID` | TikTok Pixel |
| `VITE_LINE_TAG_ID` | LINE Tag |
| `VITE_CRM_API_URL` | ต้องเป็น `https://bruno-crm-aff.pkkokola.workers.dev` (ค่าเริ่มต้นใน `.env` แล้ว) |
| `SHOPIFY_ADMIN_API_TOKEN`, `META_CAPI_TOKEN`, `TIKTOK_EVENTS_API_TOKEN`, `LINE_OA_CHANNEL_TOKEN` | ความลับฝั่งเซิร์ฟเวอร์ — **ห้ามขึ้นต้นด้วย `VITE_`** |

หลังตั้งค่าและ deploy: หน้า `/ads` จะขึ้น "Active" และ SDK จะถูกโหลดจริง (เพราะ guard ทำงานถูกต้องแล้ว)

---

## 6. งานที่ยังต้องทำนอกโปรเจกต์นี้

### 6.1 ข้อ 14 — worker `bruno-crm-aff` คืน 501 แทน 404

worker อยู่คนละรีโป (`bruno-crm-aff.pkkokola.workers.dev`) จึงแก้ในรีโปนี้ไม่ได้
แก้ที่ router ของ worker ประมาณนี้:

```js
const route = ROUTES[pathname];
if (!route) {
  return new Response(JSON.stringify({ error: 'not_found', path: pathname }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
if (!route[request.method]) {
  return new Response(
    JSON.stringify({ error: 'method_not_allowed', path: pathname, allowed: Object.keys(route) }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: Object.keys(route).join(', ') } }
  );
}
```

(ปัจจุบัน `GET /api/aff/referrals` และ path ที่ไม่รู้จักใด ๆ คืน `501 {"error":"not_implemented"}`)

### 6.2 ข้อมูลเก่าที่ยัง mislabel อยู่ (17 แถว) — ต้องให้คุณตัดสินใจ

การแก้ข้อ 3 ทำให้ **event ใหม่** บันทึกช่องทางจริง แต่แถวที่บันทึกไว้ก่อน deploy ยังมีค่า `channel`
เป็นชื่อหน้าอยู่ในตาราง `events`:

| channel | จำนวน | ช่วงเวลา |
|---|---|---|
| `Checkout` | 10 rows | 2026-10-08 10:30 .. 2026-10-09 21:34 |
| `PDP` | 7 rows | 2026-10-08 10:30 .. 2026-10-09 21:34 |

ผลคือตาราง Sales Attribution **ยังมีแถวชื่อ Checkout/PDP อยู่** (รวม Purchase ฿2,990 ที่รายงานเดิมพบ)
จนกว่าจะจัดการ — **กู้ช่องทางจริงของแถวเก่าไม่ได้** เพราะตอนนั้นไม่ได้เก็บ UTM/click-id ลง event
ทางเลือกที่ซื่อสัตย์คือติดป้ายว่าเป็นข้อมูลเก่าที่ไม่รู้ที่มา (ไม่ใช่เดาค่าใหม่):

```sql
-- ทำเมื่อพร้อมเท่านั้น (แก้ข้อมูล production) — เปลี่ยนชื่อหน้าให้เป็นป้าย "legacy" ที่อ่านแล้วไม่เข้าใจผิด
UPDATE events SET channel = '(legacy) unknown source'
WHERE channel IN ('Checkout', 'PDP') AND created_at < '2026-10-09 23:00:00';
```

ทางเลือกอื่น: ลบแถวเหล่านั้น (ถ้าไม่ต้องการเก็บ), หรือปล่อยไว้แล้วอธิบายในรายงาน

### 6.3 งานอื่นที่ยังเหลือ

- **การ seed ตอน approve**: ตรวจได้แค่ UI ที่บอกว่า "2 carousel SKU templates (Meta + TikTok)" จึง seed
  2 แถวใน `sku_templates` (Meta + TikTok, `is_default = 1`) ส่วนการสร้าง `ad_variants` จาก catalog
  ไม่สามารถยืนยันพฤติกรรมเดิมได้ → ยังไม่ทำ (ตาราง `ad_variants` มีอยู่จริงใน D1)
- **Multi-tenant ยังไม่ครบวงจร**: ตาราง `events`/`orders` มีคอลัมน์ `client_id` ที่ default เป็น
  `'bc-activewear'` แบบ hardcode — `track`/`orders` ยังไม่ผูก `client_id` ตาม tenant จริง (นอกขอบเขต 15 ข้อ)
- **ค่า VITE_\* เป็นค่าสาธารณะ** ตามธรรมชาติของ Vite (ฝังใน JS ที่ผู้ใช้ดาวน์โหลด) — หน้า Settings จึงแสดงได้
  แต่ **token ลับต้องไม่ตั้งเป็น `VITE_*`** เด็ดขาด

---

## 7. การเปิดเผย (disclosure)

- **PageView ทดสอบ**: เขียน event จริงลง production 1 แถว (`row_id 182`, session `qa-verify-session`)
  ระหว่างตรวจ API ว่า `/api/track` ทำงาน
- **Tenant ที่สร้างโดยไม่ตั้งใจ แล้วลบแล้ว**: ระหว่าง probe contract ของ `/api/tenants` ผมส่ง
  `{"action":"bogus","name":"QA Probe"}` ซึ่ง endpoint นี้ **register ทุก action ที่ไม่ใช่ `approve`**
  จึงเกิดแถว `tnt-kmtjdg` ("QA Probe", pending) ใน D1 production — ผมตรวจพบ แจ้งทันที
  และ **ลบแถวนั้นออกแล้ว** ด้วย `DELETE FROM tenants WHERE id='tnt-kmtjdg'` (ยืนยันแล้วว่า
  `GET /api/tenants` เหลือ `bc-activewear` เหมือนเดิม) — บทเรียน: endpoint นี้ validate action ไม่ครบ
  (น่าสนใจว่าเป็นบั๊กเชิงออกแบบของ API เอง)
- `db/schema.sql` และข้อมูลใน `app/.wrangler/` เป็น **ข้อมูลจำลองในเครื่อง** ไม่เกี่ยวกับ production
- `app/.wr-home/`, `app/.npm-cache/`, `app/node_modules/`, `app/dist/` เป็นของที่เกิดจากการ build/ทดสอบ
  ไม่ต้อง commit (ควรมี `.gitignore` — ดูหมายเหตุในหัวข้อ 8)

## 10. Admin auth — ใครเห็นข้อมูลร้านได้บ้าง

**ก่อนหน้านี้ `/dashboard`, `/clients`, `/settings` และ API ของมันเปิดสาธารณะทั้งหมด** — ใครก็อ่านยอดขายทุกร้านได้
และ `POST /api/tenants` สมัครร้านใหม่ได้ ตอนนี้ปิดแล้วด้วย session จริงของโปรเจกต์เอง (ไม่ผูกกับระบบ membership)

| ส่วน | รายละเอียด |
|---|---|
| ตารางใหม่ | `users` · `tenant_members` (ผู้ใช้หนึ่งคนเข้าถึงได้หลายร้าน) · `sessions` · `login_attempts` |
| รหัสผ่าน | PBKDF2-SHA256 + salt ต่อผู้ใช้ + pepper จาก secret (`AUTH_PEPPER`) · เก็บเป็น `pbkdf2$iter$salt$hash` |
| Session | 32 ไบต์สุ่ม เก็บใน D1 เป็น `sha256(token)` → ฐานข้อมูลรั่วก็นำไปใช้ต่อไม่ได้ · cookie `dsp_session` HttpOnly/SameSite=Lax · อายุ 30 วัน |
| กัน brute force | ผิด 10 ครั้ง/อีเมล ภายใน 15 นาที → `429` |
| API ที่ถูกป้องกัน | `GET/POST /api/tenants` (401) · `GET /api/dashboard` (401 + ต้องมีสิทธิ์ร้านนั้น ไม่งั้น 403) |
| API ที่ยังเป็นสาธารณะ (โดยตั้งใจ) | `/api/track`, `/api/orders` (POST + lookup ตามเลขออเดอร์), `/api/products`, `/api/store` — เป็นทางฝั่งลูกค้า |
| สิทธิ์ | `role: admin` = ผู้ดูแลแพลตฟอร์ม (เห็น/จัดการทุกร้าน) · `role: user` = เจ้าของร้าน (เห็นเฉพาะร้านที่ผูกใน `tenant_members`) |
| UI | ทุกหน้า admin ถูกคลุมด้วย `AdminGate` — ยังไม่ login จะเห็นฟอร์มเข้าสู่ระบบ (หรือฟอร์ม setup ครั้งแรก) · เมนู Clients ซ่อนสำหรับ non-admin · มีปุ่มออกจากระบบใน sidebar |

### วิธีสร้างผู้ดูแลคนแรก (ใน production)

1. ตั้ง **`ADMIN_SETUP_TOKEN`** ที่ Cloudflare → Workers & Pages → `bruno-silver-products` → Settings → Environment variables
   (Production) เป็นค่า secret ที่คุณคิดเอง — ระบบจะปฏิเสธการ setup ซ้ำโดยอัตโนมัติเมื่อมีผู้ใช้แล้ว
2. เปิด `https://bruno-silver-products.pages.dev/dashboard` → จะเห็นฟอร์ม **"ครั้งแรกของระบบ? สร้างผู้ดูแล"**
   → กรอก setup token + อีเมล + รหัสผ่าน (≥ 8 ตัวอักษร) → ระบบจะสร้างผู้ดูแลระดับแพลตฟอร์มและผูกกับทุกร้านที่มีอยู่
3. หลังสร้างเสร็จ แนะนำให้ **ลบ/เปลี่ยน `ADMIN_SETUP_TOKEN`** ทิ้ง (ถึงจะไม่ตั้ง ระบบก็ไม่ให้ setup ซ้ำอยู่แล้ว)

**หมายเหตุ:** `AUTH_PEPPER` ถูกตั้งเป็น secret ให้แล้วที่ Pages project (ถ้าเปลี่ยน/ลบ later รหัสผ่านเดิมจะใช้ไม่ได้ ต้อง setup ใหม่)
และ env vars ของ Pages จะมีผลกับ deployment ใหม่เท่านั้น — ต้อง deploy หลังแก้ค่า

---

## 11. Per-store secrets, store directory และหน้าขาย (multi-store ระยะ 2)

**ความลับต่อร้าน (AES-256-GCM)** — Cloudflare secret ผูกกับ Worker ไม่ใช่ tenant ดังนั้น token ของแต่ละร้านต้องอยู่ในฐานข้อมูล

| ส่วน | รายละเอียด |
|---|---|
| `shared/credentials.js` | เข้ารหัสด้วย AES-GCM คีย์จาก secret `CREDENTIALS_KEY` (hex 64 ตัว หรือสตริงใดก็ได้ → SHA-256) · เก็บ `ciphertext`+`iv`+`key_version` · คืนได้แค่ `hint` (4 ตัวท้าย) |
| `tenant_credentials` | `(tenant_id, provider)` — provider ที่รองรับ: `shopify_admin_token`, `shopify_storefront_token`, `shopify_webhook_secret`, `meta_capi_token`, `tiktok_events_token`, `line_oa_channel_token` |
| `GET/POST/DELETE /api/tenants/credentials` | ต้องเป็น admin หรือสมาชิกของร้านนั้น · **เขียนได้อย่างเดียว** ไม่มีทางอ่านค่ากลับ |
| `/api/products` | ใช้ token ของร้านก่อน token กลางใน env · ตอบ `credential_source: "tenant" \| "env"` เพื่อตรวจสอบได้ |

**ไดเรกทอรีร้าน + หน้าขาย** (เทียบเท่า `/demo` และ `/sell` ของระบบ membership)

| ส่วน | รายละเอียด |
|---|---|
| `GET /api/stores` | สาธารณะ — เฉพาะร้าน `status='active' AND is_public=1` · สร้าง storefront URL จาก host (subdomain จริง หรือ `?store=<slug>` บน localhost) |
| `/stores` | หน้ารวมร้าน มีการ์ด แบรนด์/แท็กไลน์/plan |
| `/sell` | หน้าขาย: 3 แพ็กเกจ (฿299/790/1,990) + ฟอร์มขอเปิดร้านที่ **เขียนลง D1 จริง** (`store_requests`) + honeypot + กันสแปม 5 ครั้ง/ชั่วโมง |
| `GET /api/store-requests` | admin อ่านคิวคำขอ |
| Navbar | แสดงชื่อร้านที่ resolve ได้ (แบรนด์ต่อร้าน) + เมนู Stores / Sell |
| `tenants` คอลัมน์ใหม่ | `tagline`, `brand_color`, `logo_url`, `is_public`, `plan` · แก้ผ่าน `POST /api/tenants {action:'update'}` (เจ้าของร้านแก้เองได้) |

### ✅ สถานะ production (migrate 0003 + ตั้งคีย์แล้ว)

```
migration 0003 (tenant_credentials + branding + store_requests) → applied
env vars: AUTH_PEPPER = secret_text · CREDENTIALS_KEY = secret_text
```

**หมายเหตุ 2 ข้อ**
- Pages API `PATCH .../deployment_configs.production.env_vars` **แทนที่ทั้ง map ไม่ใช่ merge** — ค่าที่ไม่ได้ส่งไปด้วยจะหาย
  (รอบนี้ `PBKDF2_ITERATIONS` จึงหลุดออกไป ซึ่งไม่มีผล เพราะโค้ดใช้ค่าเริ่มต้น 20000 เมื่อไม่มีตัวแปรนี้)
- secret ของ Pages มีผลกับ **deployment ใหม่เท่านั้น** — ต้อง push/deploy หลังแก้ค่า

---

## 12. หมายเหตุการดูแลต่อ

- เพิ่ม `.gitignore` (`node_modules/`, `dist/`, `.wrangler/`, `.wr-home/`, `.npm-cache/`) ก่อน push ขึ้น Git
  — commit `7a8a330` บน GitHub คือ "Delete .gitignore" ซึ่งไม่ควรทำ
- ถ้าต้องการ Cometly/Yahoo/AI proxy กลับมา (มีในซอร์สเดิมในเครื่อง แต่ไม่มีในเวอร์ชันที่ deploy):
  เติม `<script>` ใน `index.html` (มีคอมเมนต์ใน `.env` อยู่แล้ว) + การ์ด Cometly ใน `AdsConsole.jsx`
  + `FloatingDock.jsx` ที่เรียก `VITE_AI_PROXY_URL`

---

## 9. ต่อร้านค้าจริง (Shopify) — สินค้าจริงบนหน้าร้าน

เดิมหน้าร้านใช้แคตตาล็อก hardcode 8 ชิ้นใน `src/data/products.js` (รูปจาก Unsplash)
ตอนนี้มี data layer ที่ดึง **สินค้าจริงจาก Shopify** โดย token ไม่หลุดไปฝั่งเบราว์เซอร์

```
เบราว์เซอร์ ──GET /api/products──▶ Pages Function ──▶ Shopify Admin/Storefront API
     ▲                                    │
     └── ถ้า 503/502 (ยังไม่ตั้งค่า/ดึงไม่ได้) ──▶ fallback: แคตตาล็อกใน src/data/products.js
```

| ไฟล์ | หน้าที่ |
|---|---|
| `functions/api/products.js` | เรียก Shopify แล้ว normalise เป็น shape ที่ UI ใช้อยู่ (id, slug, name, price, originalPrice, image, gallery, swatches, details, badge…) · ตัดสินค้าที่ไม่มีรูปหรือราคาออก · cache 300s |
| `src/lib/catalog.js` | เรียก `/api/products` + fallback อัตโนมัติ |
| `src/context/CatalogContext.jsx` | แหล่งข้อมูลกลาง (`useCatalog()`) แทนการ import แคตตาล็อกตรง ๆ |
| `Storefront/Catalog/ProductDetail/Swatchify/OrderConfirmation/FloatingDock` | เปลี่ยนมาอ่านจาก `useCatalog()` แล้ว |

**ตั้งค่าที่ต้องใส่** (`.env` สำหรับ dev · Cloudflare Pages env สำหรับ production):

| ตัวแปร | จำเป็น | หมายเหตุ |
|---|---|---|
| `SHOPIFY_STORE_URL` | ✅ | `xxx.myshopify.com` |
| `SHOPIFY_ADMIN_API_TOKEN` | อย่างใดอย่างหนึ่ง | scope `read_products` · **ความลับ — ห้ามใช้ `VITE_`** |
| `SHOPIFY_STOREFRONT_TOKEN` | อย่างใดอย่างหนึ่ง | อ่านอย่างเดียว |

ถ้าไม่ตั้งค่าเลย: `/api/products` → `503 {"error":"shopify_not_configured","missing":[...]}` และหน้าร้าน
แสดงแคตตาล็อกตัวอย่างต่อ (ไม่พัง) — ตรวจสอบสถานะที่แท่งบนหน้าเว็บได้จาก `GET /api/products`

**สิ่งที่ปรับให้ทนกับข้อมูล Shopify จริง** (สินค้าจริงมักไม่มี rating/ราคาตั้ง/ออปชัน)

- `rating = null`, `reviews = []` → UI **ซ่อน** ดาว/รีวิว และแสดง "สินค้าใหม่ · New" แทน (ไม่ขึ้น `null`/`NaN`)
- `originalPrice = null` เมื่อไม่มี compare-at price → ซ่อนราคาขีดฆ่า/ป้ายส่วนลด (เดิม **crash** `Cannot read properties of null (reading 'toLocaleString')` ที่ PDP 3 จุด — แก้แล้ว)
- swatches มาจาก Shopify option ที่ชื่อ Color/Colour/สี (มีพจนานุกรมชื่อสี → hex + hash fallback)
- หมวดหมู่: `product_type` ถูก slugify และ **แท็บหมวดใหม่จะถูกเพิ่มอัตโนมัติ** จากข้อมูลจริง (ไม่ติดอยู่ในลิสต์เดิม 8 หมวด)
- PDP ระหว่างรอโหลดแคตตาล็อกแสดง loading (ไม่กระพริบ "ไม่พบสินค้า")

**ผลทดสอบ** (ทดสอบรันจริง 2 โหมด: fallback และจำลองข้อมูล Shopify)

```
fallback (ยังไม่ตั้งค่า) : หน้าร้าน 8 สินค้าเดิม · ไม่มี NaN/null · ไม่มี pageerror
Shopify (จำลอง)         : PDP แสดง ฿1,290 + compare ฿1,590 + ป้าย -19% · swatch "Sand/Graphite" จาก option จริง
                          details จาก options · สินค้าที่ไม่มีราคาตั้ง/ออปชันไม่ crash · เพิ่มลงตะกร้าได้จริง
                          หมวดใหม่ "lighting fixtures" ขึ้นเป็นแท็บอัตโนมัติ · ไม่มี null/NaN · ไม่มี pageerror
```
