# รายงานตรวจสอบซ้ำ — bruno-silver-products.pages.dev
## ตรวจจาก "ของจริงที่ออนแอร์" (ไม่ใช้ไฟล์ในเครื่อง)

**วันเวลาที่ตรวจ:** 10 ตุลาคม 2569 เวลา 04:20–04:35 (+07)
**เป้าหมาย:** https://bruno-silver-products.pages.dev (ให้ความสำคัญกับ `/dashboard`)
**เหตุผลที่ตรวจซ้ำ:** ไฟล์ในเวิร์กสเปซเครื่องนี้ **เก่ากว่าของที่ deploy จริง** จึงตรวจผ่าน远端เท่านั้น

**วิธีตรวจ:**
1. ดึง HTML + JS chunk ทุกไฟล์ที่ deploy จริงจาก Pages แล้วสแกนซอร์ส (`fetch`, `onClick`, env, channel, สูตรคำนวณ)
2. เปิดด้วย **Chrome จริง (Playwright, headless, ไม่มี extension)** — ดักจับ request/console/pageerror ทุกครั้ง
3. กดปุ่มจริงทุกปุ่ม (Test/Save 10 ปุ่ม, ปุ่มช่วงเวลา, ปุ่ม AI 2 ปุ่ม, ปุ่ม Track) แล้ววัดว่ามี request อะไรเกิดขึ้น
4. บังคับ error ด้วยการ intercept (`/api/dashboard` → 500, `POST /api/tenants` → 500) เพื่อดูพฤติกรรมตอนระบบล่ม
5. ยิง API ตรงด้วย `curl` ทุก endpoint

**สิ่งที่ยังไม่ได้ทำ (ตามที่ตกลง):** ไม่สร้าง tenant ทดสอบ, ไม่สร้างออเดอร์ใหม่ — `GET /api/tenants` ยังมีแค่ **BC Activewear** รายเดียว
**สิ่งที่เขียนจริง 1 รายการ:** event PageView ทดสอบ 1 แถว (`row_id: 182`, session `qa-verify-session`) เพื่อยืนยันว่า `/api/track` ทำงาน — แจ้งเพื่อความโปร่งใส

---

## 0. สรุปผู้บริหาร

| ผล | จำนวน | ความหมาย |
|---|---|---|
| ✅ ยืนยันได้ตามรายงานเดิม | **17 ข้อ** | ตรวจบน live แล้วเป็นอย่างที่รายงานว่า |
| 🔧 **รายงานสรุปผิด ต้องแก้** | **1 ข้อ** | Ads Console ไม่ใช่ hardcode — เป็น build-time env ที่ยังไม่ตั้งค่า |
| 🆕 **ของใหม่ / root cause ที่รายงานไม่พบ** | **7 เรื่อง** | ในนั้น 4 เรื่องเป็นปัญหาใหม่ที่รายงานไม่เคยกล่าวถึง |

**ข่าวดี:** build ที่ออนแอร์ **ตรงกับรายงานเดิมทุก hash** (`Dashboard-BRjqaYHv.js`, `Settings-CpjB8t1L.js`, `AdsConsole-DYLCvYU9.js`, `OrderLookup-Dzj02FSb.js`) → รายงานเดิมตรวจ live จริง ไม่ได้ตรวจไฟล์ในเครื่อง และ **live ยังไม่ได้แก้ไขอะไรเลยนับจากนั้น**

**ข่าวร้าย:** ระหว่างตรวจซ้ำพบว่า dashboard **โชว์ตัวเลขปลอมได้** เมื่อ API ล่ม (ไม่มีใครรู้) และ `/order` ยังเป็นของปลอม 100% ตามเดิม

---

## 1. ตัวตนของ build (สำคัญต่อการอ้างอิง)

| Chunk | รายงานเดิม | ออนแอร์ตอนนี้ | ไฟล์ในเครื่อง (`dist/`) |
|---|---|---|---|
| Dashboard | `Dashboard-BRjqaYHv.js` | **`Dashboard-BRjqaYHv.js`** ✅ ตรง | `Dashboard-E9W3SbNv.js` ❌ |
| Settings | `Settings-CpjB8t1L.js` | **`Settings-CpjB8t1L.js`** ✅ ตรง | `Settings-C43P4Ewh.js` ❌ |
| AdsConsole | `AdsConsole-DYLCvYU9.js` | **`AdsConsole-DYLCvYU9.js`** ✅ ตรง | `AdsConsole-BS_AYXzQ.js` ❌ |
| OrderLookup | `OrderLookup-Dzj02FSb.js` | **`OrderLookup-Dzj02FSb.js`** ✅ ตรง | `OrderLookup-C_AKnhUK.js` ❌ |

→ **รายงานเดิม = ออนแอร์ = สถานะปัจจุบัน** ส่วนไฟล์ในเครื่องเป็น build คนละรอบ (เก่ากว่า — ดูข้อ 7)

---

## 2. ตารางยืนยันรายข้อ (ตรวจบน live)

| # | ข้อกล่าวอ้างในรายงานเดิม | ผลตรวจ | หลักฐานบน live |
|---|---|---|---|
| 1.1 | ตัวกรองช่วงเวลาทำงานจริง ยิง API จริง | ✅ **จริง** | กด 7D → `GET /api/dashboard?range=7d&view=trends` + `?range=7d` + `GET /api/aff/affiliates`; events TODAY `82` → 7D/30D `162` |
| 1.3 | `/clients` ลงทะเบียนลูกค้าได้จริง | ✅ **จริง** | ซอร์สยิง `POST /api/tenants` จริง + validate ฝั่ง API (`400 {"error":"Invalid name (min 2 chars)"}`) |
| 1.4 | วงจรสั่งซื้อ→dashboard ครบวงจร | ✅ **จริง** | live ตอนนี้: revenue `฿ 2,990`, orders `1`, cr `33.3%` (today) = ออเดอร์ทดสอบ `SS-974360` |
| 1.5 | Swatchify / Cart / Checkout / 404 / PageView | ✅ **จริง** | Swatchify 3 ขั้น + ปุ่ม `Continue · 8 products`; เพิ่มตะกร้า → toast `เพิ่ม "Wireless NC Headphones" ลงตะกร้าแล้ว` + `localStorage.silversurface_cart`; 404 แสดง `404 ไม่พบหน้าที่คุณต้องการ`; `POST /api/track` ยิงทุกหน้า (เห็น 8 ครั้งในการทดสอบ) |
| 1.6 | Backend API ตอบถูกต้อง | ✅ **จริง** | `track` 200/`{"status":"tracked"}` · `dashboard` 200 · `tenants` 200 · validate ทุกตัวคืน `400` + JSON message |
| 2.1 | Settings: ปุ่ม 10 ปุ่มกดแล้วไม่มีอะไรเกิดขึ้น | ✅ **จริง (ร้ายกว่าที่ว่า)** | กรอก 10 ช่อง → กด Test/Save ทั้ง 10 ปุ่ม → **request 0 รายการทุกชนิด** (ไม่ใช่แค่ไม่มี API) ไม่มี toast ข้อความไม่เปลี่ยน และ reload แล้วค่าหายเกลี้ยง (`['','',...]`) · ซอร์ส: `fetch`=0, `onClick`=0, `localStorage`=0 |
| 2.2 | AdsConsole hardcode ขึ้น Active ไม่ได้ | 🔧 **ต้องแก้ไข** | **ไม่ใช่ hardcode** — ดูข้อ 3.1 |
| 2.3 | ปุ่ม AI 2 ปุ่มเป็นปุ่มหลอก | ✅ **จริง** | กดทั้ง 2 ปุ่ม: request `[]`, ข้อความบนหน้าไม่เปลี่ยน, modal 0, toast 0 · dashboard มีปุ่มทั้งหมดแค่ 5 ปุ่ม (3 ช่วงเวลา + 2 หลอก) |
| 2.4 | `/order` ของปลอม 100% | ✅ **จริง** | ใส่ `SS-974360` และ `garbage-xyz-999` → ได้ **`Order #BS-12345` + `Estimated Delivery: Oct 10 - Oct 12` เหมือนกันเป๊ะ**, request 0, ค่าที่พิมพ์ไม่ถูกนำไปใช้เลย |
| 2.5 | การ์ด LINE แสดง 0 ตลอด | ✅ **จริง** | `line: 0` ทุกช่วง + เจอ root cause (ข้อ 4.7) |
| 3.1 | Sales Attribution จัดกลุ่มช่องทางผิด | ✅ **จริง** | แถว `Checkout` ถือยอด `purchase_value: 2990` / แถว `Organic` ได้ `0` · **เจอ root cause ระดับบรรทัดโค้ด** (ข้อ 4.5) |
| 3.2 | Funnel คำนวณผิด อัตราเกิน 100% ได้ | ✅ **จริง** | 7D: `ViewContent→AddToCart` **4 → 6**, `AddToCart→Checkout` **6 → 8** (ปลายทางมากกว่าต้นทาง) และ API **clamp `rate` ที่ 100 / `drop` ที่ 0** → กลบความผิดไว้ |
| 3.3 | Conversion Rate นิยามแปลก | ✅ **จริง** | สูตรจริง = `orders ÷ max(ViewContent, AddToCart)` — 7D: `1 ÷ 6 = 16.7%`, TODAY: `1 ÷ 3 = 33.3%` |
| 3.4 | Revenue กับ Affiliate ไม่ตรงกัน | ✅ **จริง** | Affiliate (worker): `LINE-10` ฿799 + `FERN10` ฿1,090 = **฿1,889** แต่ dashboard revenue **฿2,990** = ออเดอร์ QA เพียงใบเดียว → ยอด affiliate ไม่ถูกรวมเลย |
| 3.5 | `/api/*` ที่ไม่มีจริงคืน 200 + HTML | ✅ **จริง** | `GET /api/settings`, `/api/orders`, `/api/ads`, `/api/does-not-exist` → **200 `text/html`** ทั้งหมด (คืนหน้า SPA) · `POST /api/does-not-exist` → `405` ว่างเปล่า |
| 3.6 | `GET /api/aff/referrals` คืน 501 | ✅ **จริง** | worker คืน `501 {"error":"not_implemented"}` — และ **ทุก path ที่ไม่รู้จักบน worker ก็คืน 501 เหมือนกัน** (ควรเป็น 404/405) · ส่วน `POST` ตัวเดียวกัน validate ถูกต้อง `400 {"error":"Invalid affiliate_code"}` |
| 3.7 | ลงทะเบียนลูกค้าล้มเหลวแต่แจ้งสำเร็จ + ลูกค้าหาย | ✅ **จริง** | intercept ให้ `POST /api/tenants` → 500: ขึ้น **"Registered — awaiting your approval."**, `Pending approvals (1)` และ **BC Activewear หายจากจอ** (`No active clients yet`) · reload แล้ว BC กลับมา, pending เหลือ 0 |
| 3.8 | JS error จาก TikTok pixel ทุกหน้า | ✅ **จริง และร้ายกว่าที่ว่า** | Chrome เปล่าไม่มี extension ยัง error: `Uncaught TypeError: t.push is not a function` ที่ `analytics.tiktok.com/i18n/pixel/sdk.js` — **เจอ root cause แล้ว** (ข้อ 4.2) |

**สรุป: 17 ข้อจาก 18 ข้อในรายงานเดิม ยืนยันได้บน live — มี 1 ข้อที่สรุปผิด (2.2)**

---

## 3. ข้อที่ต้องแก้ไขจากรายงานเดิม

### 3.1 🔧 Ads Console **ไม่ใช่ hardcode** — เป็น build-time env ที่ยังไม่ได้ตั้งค่า

รายงานเดิมยกโค้ดนี้มาแล้วสรุปว่า *"ค่าทั้งหมดเป็น string ตายตัวในโค้ด ไม่ได้มาจาก env จริง … ไม่มีทางใดในระบบที่ทำให้ Ads Console ขึ้น Active ได้"* — **ข้อสรุปนี้ไม่ถูกต้อง**

หลักฐานจาก `index-CURKdPs_.js` ที่ deploy จริง:
```js
const ut = {
  BASE_URL:"/", DEV:!1, MODE:"production", PROD:!0, SSR:!1,
  VITE_CRM_API_URL: "https://bruno-crm-aff.pkkokola.workers.dev",
  VITE_GA4_MEASUREMENT_ID: "G-XXXXXXXXXX",
  VITE_LINE_TAG_ID: "LNT-XXXXXXXXXX",
  VITE_META_PIXEL_ID: "123456789012345",
  VITE_TIKTOK_PIXEL_ID: "C123456789012345678"
}
```
`ut` คือ **`import.meta.env` ของ Vite ที่ถูก inline ลง bundle ตอน build** และ `g` ใน AdsConsole chunk คือ object เดียวกันแบบถูก tree-shake เหลือ 4 คีย์ที่ใช้จริง

**ความหมายที่ถูกต้อง:**
- กลไกเป็นมาตรฐาน Vite: **ค่ามาจาก env ตอน build** ไม่ใช่ runtime (จึงไม่ต้องมี `fetch`/`localStorage` ในหน้านี้ — การที่รายงานพบ 0 จึงไม่ใช่หลักฐานว่าเป็นของปลอม)
- ค่าที่เห็นเป็น **placeholder เพราะดีพลอยนี้ build โดยไม่มี env ตั้งไว้** → สถานะ "Not Configured" ที่แสดงจึง **ตรงกับความจริง** (ยังไม่ได้ตั้ง pixel จริง)
- **ถ้าตั้ง env แล้ว build ใหม่ สถานะจะกลายเป็น "Active" ได้** — ไม่ใช่ทางตันอย่างที่รายงานสรุป
- อย่างไรก็ตาม วิธี **ตัดสินสถานะด้วยการ sniff คำในสตริง** (`ห้ามมี "1234567890"` / `"XXXXXXXX"`) ยังเป็นดีไซน์ที่เปราะ ควรเปลี่ยนไปอ่านสถานะจาก API

> **ข้อควรแก้ในรายงาน:** เปลี่ยนจาก "hardcode ทั้งหน้า / ขึ้น Active ไม่ได้เลย" → "สถานะมาจาก build-time env ที่ดีพลอยนี้ยังไม่ตั้งค่า; ต้อง build ใหม่จึงจะ Active; และควรเปลี่ยนวิธีตรวจสถานะเป็น API"

### 3.2 ⚠️ Settings — ความจริงร้ายกว่าที่รายงานเขียน

รายงานเดิมบอกว่า "เป็นการ์ดอ้างอิง ENV … badge ENV สื่อความหมายถูกต้องแล้ว" แต่ข้อความจริงบน live **ชวนให้ผู้ใช้กรอกและสัญญาว่าจะเก็บให้**:

> "**Paste your store and ad-platform IDs below.** Private tokens stay on our server — they never appear in the pages your customers see."
> "Private tokens (ad-platform secrets) are stored on our server only"

ทั้งที่ `fetch` = 0, `onClick` = 0, `localStorage` = 0 → **ไม่มีที่ไหนรับค่าไปเก็บเลย** และช่องที่เป็น `serverOnly` (เช่น `SHOPIFY_ADMIN_API_TOKEN`, `META_CAPI_TOKEN`) ยิ่งอันตราย เพราะผู้ใช้อาจ **วาง token ลับจริงลงไป** ในหน้าที่ไม่ทำอะไรกับมัน

---

## 4. 🆕 ของใหม่ที่รายงานเดิมไม่พบ (เรียงตามความรุนแรง)

### 4.1 🔴 Dashboard **แสดงตัวเลขปลอมได้** เมื่อ API ล่ม — และไม่บอกผู้ใช้

`Dashboard-BRjqaYHv.js` มี mock fallback ฝังในโค้ด:
```js
} catch { console.warn("Backend API not reachable, using mock fallback.") }
return new Promise(l => { setTimeout(() => { const a = A(); l({
  events: s === "today" ? "1,248" : s === "7d" ? "9,840" : "42,100",
  revenue: `฿ ${a.net.toLocaleString()} (demo)`,
  cr: ..., line: ..., funnel: [...hardcoded...], attribution: [...hardcoded...]
}) }, 400) })
```

**ทดสอบจริง** (intercept `/api/dashboard` → 500 แล้ว reload):

| KPI บนจอ | ค่าที่แสดง |
|---|---|
| Total Events | **1,248** |
| Purchases · Revenue | **฿ 7,459 (demo)** |
| Conversion Rate | **2.4%** |
| Sales Attribution | Meta (IG/FB) ฿32,150 · TikTok ฿5,400 · LINE OA ฿7,650 · Organic ฿0 |
| Funnel Flow | 4 ขั้นครบ (จากข้อมูลปลอม) |

- มีคำว่า `(demo)` **แค่ช่อง Revenue ช่องเดียว** — Events / CR / Funnel / Attribution / Affiliate **ไม่มีป้ายบอกเลย**
- header ยังเขียนว่า **"Live · N Active · ผู้ใช้งานออนไลน์"** ขณะแสดงข้อมูลปลอม
- ข้อความเตือนมีแค่ `console.warn` ที่ผู้ใช้ทั่วไปไม่มีทางเห็น

→ **อันตรายกว่า `/order` ปลอม เพราะเป็นตัวเลขธุรกิจที่เจ้าของร้านใช้ตัดสินใจ** อาการ backend สะดุด 1 ครั้ง = ขึ้นยอดขายปลอม ฿7,459 โดยไม่มีสัญญาณเตือน

### 4.2 🔴 Root cause ของ TikTok error — `index.html` โหลด SDK **นอก guard**

รายงานเดิมเห็น error แต่ไม่ได้สาเหตุ แท้จริงอยู่ใน **inline script ของ HTML ที่ deploy** (ไม่ใช่ใน JS bundle — จึงหาไม่เจอถ้า grep แค่ `assets/*.js`):

```js
i.load = function(e,n){ /* ...สร้าง <script src="analytics.tiktok.com/i18n/pixel/sdk.js">... */ };
i.load();                       // ← เรียก "นอก" guard = โหลด SDK เสมอ
}(window, document, 'ttq');
(function(){ var PID="C123456789012345678";
  if(PID && PID.indexOf('1234567890')===-1){ ttq.load(PID); ttq.page(); }   // ← guard อยู่แค่ init
})();
```

- `i.load()` ถูกเรียก **โดยไม่มีเงื่อนไข** → SDK ถูกโหลด+รันทุกหน้า แม้ไม่มี pixel ID จริง
- `ttq.load(PID)` ถูกกันไว้ถูกต้อง (ไม่ init ด้วย ID ปลอม) → SDK รันโดยไม่มี pixel → **crash `t.push is not a function` ทุกหน้า**
- Meta ก็โหลด `fbevents.js` แบบไม่มีเงื่อนไขเช่นกัน (`connect.facebook.net` ยิงทุกหน้า) แต่ `fbq('init')` ถูกกันไว้ จึงไม่ crash
- GA4 ทำถูกแล้ว (โหลดเฉพาะเมื่อ ID ไม่ใช่ placeholder) — เป็นแบบอย่างที่ TikTok/Meta ควรทำตาม

**แก้:** ย้าย `i.load()` (และ loader ของ `fbevents.js`) **เข้าไปใน guard เดียวกับ `ttq.load()`**

### 4.3 🟠 ดีพลอยนี้ build โดยไม่ได้ตั้ง env เลย → ID ปลอมถูกโชว์เป็นของจริง

`/ads` แสดงค่าต่อไปนี้ให้ผู้ใช้เห็นตรง ๆ ว่าเป็น ID ของระบบ:
```
Pixel ID: 123456789012345
Measurement ID: G-XXXXXXXXXX
LINE Tag ID: LNT-XXXXXXXXXX
Pixel ID: C123456789012345678
```
- ทั้ง 4 ค่าเป็น **placeholder ที่หลุดมาจากการ build ไม่ตั้ง env** (ตรงกับ `ut` ใน bundle และ inline script ใน HTML)
- หน้าเดียวกันยังมีข้อความรับประกันว่า *"No double-counting: each order is matched across Meta, TikTok, LINE & Google"* / *"Tracked steps: Visit → View product → Add to cart → Checkout → Purchase"* — **การรับประกันที่ยังไม่มีอะไรสนับสนุน** เพราะยังไม่มี pixel ใดถูกตั้งค่า และ SDK ที่โหลดมาก็ crash

### 4.4 🟠 `/clients` มี "ชั้น demo" ที่ซ่อนอยู่ (localStorage) — ไม่ใช่แค่บั๊ก UI

`Tenants-DH80RGO9.js` ไม่ได้พลาด error handling แต่ **จงใจ fallback ไปโหมด demo** แล้ว **ยังขึ้นข้อความสำเร็จ**:

```js
fetch("/api/tenants", {method:"POST", ...})
  .then(a => a.ok ? a.json() : Promise.reject(new Error(`HTTP ${a.status}`)))
  .then(() => { d(x); c() })                    // สำเร็จ → แจ้งข้อความ x
  .catch(() => {                                 // ล้มเหลว → เขียน localStorage แทน
     const a = v();                              // v() = อ่าน localStorage 'ss_tenants_mock'
     const n = [{ id:`tnt-...`, ...p, status:"pending" }, ...a];
     localStorage.setItem('ss_tenants_mock', JSON.stringify(n));
     o(n);                                       // ← เอาลิสต์ localStorage มาทับ state ที่โหลดจาก API
     l({name:"",shopify_domain:"",contact_email:""}); d(x)     // ← ยังแจ้ง "สำเร็จ"
  })
```
ผลจากการทดสอบจริง (บังคับ 500):
- ขึ้น **"Registered — awaiting your approval."** ✅ ตรงตามรายงาน
- `Pending approvals (1)` และ **BC Activewear หายจากจอ** + `No active clients yet` ✅ ตรงตามรายงาน
- 🆕 **ข้อมูลไม่ได้หายจริง** — ถูกเขียนลง `localStorage.ss_tenants_mock` และ **reload แล้วหายไป** เพราะ GET สำเร็จและทับด้วยข้อมูลจริง (BC กลับมา, pending = 0)
- 🆕 **หัวหน้ายังเขียน "Live · Connected"** ทั้งที่กำลังแสดงข้อมูล demo → ผู้ใช้ไม่มีทางรู้ว่ากำลังดูข้อมูลปลอม
  (จริง ๆ โค้ดมีข้อความ `"Preview · Demo data (not saved yet)"` อยู่แล้ว แต่จะขึ้นเฉพาะตอน **GET** ล้มเหลว ไม่ขึ้นตอน **POST** ล้มเหลว)

**รากของปัญหา:** บรรทัด `o(n)` เอาลิสต์ localStorage (ที่มีแต่รายการในเครื่อง) **ไปแทน** ลิสต์ที่โหลดมาจาก API → ลูกค้าจริงหายจากจอชั่วคราว

### 4.5 🟠 Root cause ที่แท้จริงของ Sales Attribution — `channel` ถูก hardcode เป็น "ชื่อหน้า"

ใน `index-CURKdPs_.js` ที่ deploy:
```js
W("AddToCart", {..., channel: "PDP"})        // hardcode
At = (t,r) => W("Checkout", {..., channel: "Checkout"})   // hardcode
Pt = (t,r,a) => W("Purchase", {value:t, channel: "Checkout", order_id:r, ...})  // ← Purchase ถูกตีเป็น "Checkout"!
```
- ฟิลด์ `channel` ควรเป็น **ที่มาโฆษณา** (มาจาก `getAttributionChannel()` ซึ่งอ่าน `fbclid`/`ttclid`/`gbraid`/`utm_*` และคืน `"Organic"` เป็นค่า default)
- แต่ event ระดับล่าง (`AddToCart`/`Checkout`/**`Purchase`**) **เขียนทับด้วยชื่อหน้า** → API จึง GROUP BY ได้แถวชื่อ `Checkout`, `PDP`
- **นี่คือเหตุผลที่ออเดอร์ ฿2,990 ไปอยู่แถว "Checkout" และแถว "Organic" ได้ ฿0** — ไม่ใช่แค่ "จัดกลุ่มผิด" แต่ค่าถูก hardcode ผิดตั้งแต่ตอนยิง event
- **ผลที่ตามมา:** ROAS / ที่มาของยอดขายทั้งหมดเชื่อถือไม่ได้ (และในโค้ด API ยัง hardcode `spend = 0` → คอลัมน์ ROAS เป็น `—` ตลอดกาลอยู่แล้ว — *"placeholder — ad spend integration required for real ROAS"*)

**แก้:** ส่ง `channel: getAttributionChannel()` ทุก event (หรือแยกเป็น 2 ฟิลด์: `source` = ที่มาโฆษณา, `page` = หน้าที่เกิด event)

### 4.6 🟡 ป้าย Conversion Rate โกหก

จอบอก: `"Orders ÷ Product views · สั่งซื้อ ÷ ดูสินค้า"`
สูตรจริงในโค้ด API: `crBase = Math.max(ViewContent, AddToCart)` → **`Orders ÷ max(ดูสินค้า, ใส่ตะกร้า)`**
เช่น 7D: `1 ÷ max(4,6) = 1 ÷ 6 = 16.7%` (ไม่ใช่ ÷ 4) และ TODAY: `1 ÷ max(3,3) = 33.3%`
→ ตัวหารยิ่งต่ำ ยิ่งทำให้ CR ดูสูงเกินจริง (33% ทั้งที่ยอดขาย 1 ใบจากผู้เข้าชม 82 event / 13 session)

**หมายเหตุเพิ่มเรื่อง Funnel:** รายงานเดิมระบุ *"ขั้นที่เป็น 0 → 0 แสดง -100%"* — ตรวจแล้ว **ใช่** แต่สาเหตุคือ UI พิมพ์ `["-", drop, "%"]` ตรง ๆ (API clamp `drop` ให้ ≥ 0 แล้ว) จึงกลายเป็น "-100%" ที่อ่านเหมือนค่าติดลบ ซึ่งไม่มีความหมายจริง — เป็นบั๊กการแสดงผล

### 4.7 🟡 Root cause ของการ์ด LINE

- API: `lineValue = (attribution.find(a => /LINE/i.test(a.ch)) || {}).pv || sessions || 0`
- ในข้อมูลจริง**ไม่มี event ใดมี channel ที่มีคำว่า LINE** → หาไม่เจอ → คืน `0` ตลอดกาล
- หน้าจอตั้งชื่อการ์ดว่า **"LINE Friends"** (เป็นชื่อแบรนด์ LINE FRIENDS) ทั้งที่ค่าที่ดึงมาคือ LINE OA — และมีข้อความ **"Live Sync · ซิงค์เรียลไทม์"** กำกับทั้งที่ค่าเป็น 0
- **หมายเหตุ:** ค่านี้ไม่เกี่ยวกับจำนวนผู้ติดตาม LINE OA จริงเลย แม้ต่อ LINE OA จริงก็ยังเป็น 0 (เพราะผูกกับ attribution channel ไม่ใช่ LINE API) → ต้องต่อ LINE Messaging API แยกต่างหาก

---

## 5. สิ่งที่ทำงานได้จริง (ยืนยันบน live — ไม่ใช่ของปลอม)

| ระบบ | หลักฐาน |
|---|---|
| PageView tracking | `POST /api/track` ยิงทุกหน้า (เห็น 8 ครั้ง) → events ใน dashboard เพิ่มจริง |
| Dashboard + ตัวกรองช่วงเวลา | กด TODAY/7D/30D → ยิง API จริง ตัวเลขเปลี่ยนจริง (82 → 162) |
| Affiliate Performance | ดึงจาก worker จริง (`GET /api/aff/affiliates` → `LINE-10` ฿799, `FERN10` ฿1,090) |
| วงจรสั่งซื้อ | revenue ฿2,990 / orders 1 ปรากฏบน dashboard จากออเดอร์ `SS-974360` |
| ตะกร้า → Checkout | เพิ่มสินค้าได้ toast + `localStorage.silversurface_cart`; หน้าตะกร้า/Checkout ฟอร์มครบ |
| Swatchify | 3 ขั้นทำงาน (Vibe → Product → Review) |
| 404 | แสดง `404 ไม่พบหน้าที่คุณต้องการ` + ปุ่มกลับหน้าแรก |
| API validation | `dashboard?range=bogus` → 400 · `orders {}` → 400 `Invalid customer_name` · `tenants name:"x"` → 400 · `track {}` → 400 พร้อมลิสต์ event ที่อนุญาต |

---

## 6. ลำดับการแก้ที่แนะนำ (อัปเดตจากรายงานเดิม)

| # | เรื่อง | ระดับ | วิธีแก้ |
|---|---|---|---|
| 1 | **Dashboard โชว์ตัวเลขปลอมเมื่อ API ล่ม** 🆕 | 🔴 วิกฤต | ลบ mock fallback หรือถ้าจะเก็บ demo ต้องติดป้าย "DEMO" ทุกช่อง + เปลี่ยน eyebrow จาก "Live" เป็น "Demo" |
| 2 | **`/order` ของปลอม** — ลูกค้าตามออเดอร์จริงไม่ได้ | 🔴 วิกฤต | เพิ่ม `GET /api/orders?id=` แล้ว render จริง; ไม่พบ = แสดง "ไม่พบคำสั่งซื้อ" (อย่าแสดง BS-12345) |
| 3 | **`channel` hardcode ทำให้ยอดขายผิดที่มา** | 🔴 วิกฤต | ส่ง `getAttributionChannel()` ทุก event / แยก `source` กับ `page` |
| 4 | **`/clients` 500 แต่แจ้งสำเร็จ + ลูกค้าหายจากจอ** | 🔴 วิกฤต | เช็ค `res.ok` ก่อนแจ้งสำเร็จ; **ลบ `o(n)` ที่เอาลิสต์ localStorage ไปทับลิสต์จาก API**; ขึ้นแบนเนอร์ Demo ให้ชัด |
| 5 | **TikTok SDK โหลดนอก guard → crash ทุกหน้า** 🆕 | 🟠 สูง | ย้าย `i.load()` เข้าใน guard เดียวกับ `ttq.load()` (และทำกับ fbevents.js ด้วย) |
| 6 | **ดีพลอยไม่ได้ตั้ง env → pixel ID เป็น placeholder** | 🟠 สูง | ตั้ง env ตอน build จริง (หรือถ้ายังไม่ใช้ pixel ให้หยุดโหลด SDK ทั้งหมด) |
| 7 | **Settings: ปุ่มไม่ทำงานแต่ชวนให้กรอก + สัญญาว่าเก็บให้** | 🟠 สูง | ลบปุ่ม Test/Save หรือใส่ logic จริง; **แก้ข้อความที่สัญญาว่า "stored on our server"** ทันที (ตอนนี้ทำให้ผู้ใช้วาง token ลับฟรี ๆ) |
| 8 | **Funnel นับ event ไม่ใช่ session + CR เกินจริง** | 🟠 สูง | นับ `count(DISTINCT session_id)` ต่อขั้น + บังคับลำดับขั้นไม่ให้เพิ่ม; แก้ป้าย CR ให้ตรงสูตร (หรือเปลี่ยนเป็น ÷ sessions) |
| 9 | **`/api/*` ที่ไม่มีจริงคืน 200 HTML** | 🟠 สูง | เพิ่ม catch-all `functions/api/[[path]].js` → `404 {"error":"not_found"}` |
| 10 | **AdsConsole ตัดสินสถานะด้วยการ sniff สตริง** | 🟡 กลาง | เปลี่ยนไปอ่านสถานะจาก API (`/api/ads/status`) — อย่าเดาจากคำในสตริง |
| 11 | ปุ่ม Apply Recommendation / View Deep Dive ไม่ทำงาน | 🟡 กลาง | ใส่ handler หรือเอาออก |
| 12 | Revenue กับ Affiliate ไม่ตรงกัน (คนละฐานข้อมูล) | 🟡 กลาง | รวม affiliate referral เข้า revenue เดียว (source of truth เดียว) |
| 13 | การ์ด LINE Friends ไม่มีความหมาย | 🟡 กลาง | ต่อ LINE Messaging API จริง หรือเอาออก |
| 14 | worker คืน 501 ทุก path ที่ไม่รู้จัก | 🟢 ต่ำ | เปลี่ยนเป็น 404/405 ให้ถูกความหมาย |
| 15 | UI พิมพ์ "-100%" | 🟢 ต่ำ | ตัดเครื่องหมาย `-` ออกจาก `drop` และจัดการจาก = 0 ไม่ให้แสดง |

---

## 7. ไฟล์ในเครื่องกับออนแอร์ต่างกันอย่างไร (ตอบคำถามที่ว่า "ไฟล์ยังไม่อัปเดต")

ยืนยัน: **เวิร์กสเปซในเครื่องเก่ากว่าของที่ออนแอร์** และต่างกัน **ทั้งสองทาง**

| ประเด็น | ไฟล์ในเครื่อง | ออนแอร์ |
|---|---|---|
| Route `/clients` | ❌ **ไม่มี** (ไม่มีใน `src/App.jsx` และไม่มีไฟล์ `Tenants.jsx`) | ✅ มี (`Tenants-DH80RGO9.js`) |
| Route `/swatchify` | ❌ **ไม่มี** | ✅ มี (`SwatchifyPage-DB0ahTXq.js`) |
| โมดูล CRM/Affiliate | ❌ ไม่มี (ยังใช้ `round-frost-db21.sv9.workers.dev` ใน `FloatingDock.jsx`) | ✅ มี `crm-BEpXSIQr.js` → `bruno-crm-aff.pkkokola.workers.dev` |
| AdsConsole การ์ด | มี 5 การ์ด (รวม Cometly `VITE_COMETLY_WORKSPACE_ID`) | มี 4 การ์ด (ไม่มี Cometly) |
| Settings ข้อความ | ไม่มีข้อความ "Paste your store and ad-platform IDs below." | ✅ มี |
| Build (`dist/`) | chunk hash คนละชุด | chunk hash ที่ deploy จริง |
| โฟลเดอร์ `.qa/` ที่รายงานภาคผนวกอ้างถึง | ❌ **ไม่มีในเครื่องนี้** | — (สคริปต์ของรายงานเดิมไม่ได้อยู่ในเวิร์กสเปซนี้) |

> **ข้อเสนอแนะ:** ก่อนแก้โค้ดควรดึง source ที่ตรงกับที่ deploy จริงกลับมาก่อน (หรือยืนยันว่า branch ใดคือของจริง) — ถ้าแก้จากไฟล์ในเครื่องนี้จะไม่ได้แก้สิ่งที่ผู้ใช้เห็นอยู่

หมายเหตุ: `channel: 'PDP'` / `'Checkout'` **ตรงกันทั้งสองฝั่ง** (`src/lib/analytics.js` บรรทัด 253/261/269) → บั๊กข้อ 4.5 มีอยู่จริงในซอร์สในเครื่องด้วย

---

## 8. ภาคผนวก — ไฟล์หลักฐาน (รันซ้ำได้ทั้งหมด)

| ไฟล์ | หน้าที่ |
|---|---|
| `.qa-live/live_audit.py` | ตรวจ dashboard (ตัวกรอง/AI 2 ปุ่ม), settings (10 ปุ่ม), ads, order, clients — ดัก request + screenshot |
| `.qa-live/live_audit2.py` | บังคับ `/api/dashboard` → 500 (พิสูจน์ข้อมูลปลอม), บังคับ `POST /api/tenants` → 500 (พิสูจน์ false success + ลูกค้าหาย), เก็บ stack ของ pageerror |
| `.qa-live/live_audit3.py` | ตรวจ 404, swatchify, cart, checkout, PageView |
| `.qa-live/live_audit.json` / `live_audit2.json` / `live_audit3.json` | ผลดิบทั้งหมด (request/console/pageerror/ข้อความบนจอ) |
| `.qa-live/live_index.html` | HTML ที่ deploy จริง (มี inline pixel script 6 บล็อก — หลักฐานข้อ 4.2/4.3) |
| `.qa-live/assets/*.js` | JS chunk ที่ deploy จริง (16 ไฟล์) |
| `.qa-live/pretty/*.js` | chunk เดียวกันแบบจัดรูปแบบอ่านได้ (ใช้วิเคราะห์สูตรคำนวณ) |
| `.qa-live/live_dashboard*.png` | หลักฐาน dashboard ปกติ / หลังกด Apply Recommendation / View Deep Dive / ตอน API 500 |
| `.qa-live/live_settings_filled.png`, `live_settings_after_reload.png` | Settings กรอกแล้วไม่บันทึก |
| `.qa-live/live_order_SS_974360.png`, `live_order_garbage_xyz_999.png` | หลักฐานว่าผลลัพธ์เหมือนกันเป๊ะ |
| `.qa-live/live_clients_before.png`, `live_clients_after_500.png`, `live_clients_reload.png` | หลักฐาน false success + ลูกค้าหาย + กลับมาหลัง reload |
| `.qa-live/live_ads.png`, `live_404.png`, `live_cart.png`, `live_checkout.png`, `live_swatchify.png` | หลักฐานหน้าอื่น |
