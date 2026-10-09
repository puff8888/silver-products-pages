# แผนทำ bruno-silver-products ให้เป็น Multi-store

อ้างอิงจากการดูของจริง 2 ลิงก์ (10 ต.ค. 2569):

| ลิงก์ | คืออะไร | หลักฐาน |
|---|---|---|
| `https://pkkoko.store/` | **production instance ของแอป membership** (ร้านเดียว) — หน้าแรกขายแพ็กเกจสมาชิก ฿59/149/… · `/t/cafe`, `/demo`, `/sell` ถูกกันด้วยหน้า **"เข้าสู่ระบบ"** (ไม่เปิดเป็น demo) | title `Membership — Premium Community` · คุกกี้ `mem_csrf` · CSP เดียวกัน |
| `https://membership-community.sv9.store/demo` | **โฮสต์ demo ของแอปเดียวกัน ที่เปิดโหมด multi-store** — มี 4 ร้าน แต่ละร้านมีแบรนด์/แพ็กเกจ/จำนวนสมาชิกของตัวเอง | `/demo` = หน้ารวมร้าน · `/t/cafe` `/t/fitness` `/t/learning` `/t/default` = หน้าร้านย่อย · title `คาเฟ่อบอุ่น — สมาชิก` |

**รูปแบบ multi-store ของระบบนั้น:** แยกร้านด้วย **path `/t/<slug>`** + มี registry กลางใน D1:

```sql
-- membership-d1
tenants(id, name, slug UNIQUE, status, owner_user_id, business_type, created_at, updated_at)
tenant_sites(...)            -- หน้าร้าน/แบรนด์ของแต่ละ tenant
tenant_site_sections(...)    -- section ของหน้าร้าน (เนื้อหา/ธีม)
users(...) / tenant_members(...) / membership_plans(...) / subscriptions / payments
```

## 1. ตอบคำถาม "ร้านนี้เราควรผูกกันไหม"

**คำตอบสั้น: ผูกได้ แต่ "ผูกที่ตัวตนร้าน (tenant registry) + รูปแบบ routing" ไม่ใช่ผูกฐานข้อมูลเข้าด้วยกัน**

เหตุผล:

1. **เป็นคนละโดเมนธุรกิจ** — ฝั่ง membership ขาย *สิทธิ์สมาชิก/แพ็กเกจ/ชุมชน*; ฝั่ง bruno-silver ขาย *สินค้า* (ตะกร้า → checkout → COD/PromptPay → orders/ads analytics) การรวมตารางกันจะกลายเป็นระบบที่แก้ยากทั้งสองฝั่ง
2. **D1 join ข้ามฐานข้อมูลไม่ได้** — `membership-d1` กับ `bruno_storefront` เป็นคนละ database จึง `JOIN` กันตรง ๆ ไม่ได้ ถ้าต้องการ registry เดียวจริง ต้องเลือกทางใดทางหนึ่ง:
   - **(a) registry เดียว**: ให้ Pages Functions ของเราผูก D1 2 ตัว (`DB` + `MEMBERSHIP_DB`) แล้ว *อ่าน* `tenants` จาก membership-d1 (อ่านอย่างเดียว) ส่วนข้อมูลพาณิชย์ของเราเขียนลง `bruno_storefront`
   - **(b) registry API**: ทำ Worker กลาง `/api/tenants-registry` ให้ทั้งสองแอปเรียก
   - **(c) แยกกันแต่ใช้ `slug`/`id` ชุดเดียวกัน** เพื่อ join ได้ในอนาคต (เรียบง่ายสุด)
3. **pkkoko.store ไม่ใช่ Shopify** — ไม่มีร่องรอย Shopify เลย (ไม่มี `cdn.shopify`, ไม่มี header ของ Shopify) หน้าร้านของเรา `/api/products` คาดหวัง Shopify จึง **ผูก pkkoko.store เป็น "แหล่งสินค้า" ไม่ได้** สิ่งที่ผูกได้คือ "เป็นร้านหนึ่งใน registry" และถ้าร้านนั้นมีสินค้าจริง ก็ให้ตั้ง `shopify_domain` ของ tenant นั้น
4. **สิ่งที่ควรคัดลอกมาคือ pattern ไม่ใช่ข้อมูล** — `/t/<slug>`, registry กลาง, `tenant_sites` (แบรนด์ต่อร้าน), `owner_user_id` (เจ้าของร้าน + auth), และหน้า `/sell` (ขายระบบรายเดือน) ซึ่งระบบนั้นทำครบแล้ว

## 2. ช่องว่างของโปรเจกต์เรา: ทำไมยังไม่ใช่ multi-store

> **สถานะ (อัปเดต):** ระยะ 1 ลงมือแล้ว — subdomain resolution, tenant scoping ของ events/orders/dashboard/products, `tenants.slug` + migration ดูหัวข้อ 3.1

| # | ประเด็น | สถานะปัจจุบัน | ต้องทำ |
|---|---|---|---|
| 1 | **สินค้าต่อร้าน** | `/api/products` อ่าน `SHOPIFY_STORE_URL` จาก **env เดียว = ร้านเดียวทั้ง deployment** | อ่าน `shopify_domain` ของ tenant ที่ resolve ได้ → ต้องมี token/ร้านต่อ tenant |
| 2 | **ข้อมูล analytics/orders ต่อร้าน** | `events`/`orders` มี `client_id` แต่ **hardcode default `'bc-activewear'`** → ทุกร้านจะลงถังเดียวกัน | `track`/`orders`/`dashboard` ต้องใช้ `client_id` จาก tenant ที่ resolve ได้ |
| 3 | **การ resolve ร้าน** | ไม่มี — เปิด `/` ก็ได้ร้านเดียว | เลือก: `/t/<slug>` (เหมือนระบบ membership) หรือ subdomain/โดเมนต่อร้าน (ใช้ `Host` header) |
| 4 | **pixel ต่อร้าน** | `VITE_*` ฝังตอน build = ค่าเดียวทั้งระบบ | `tenants` มี `meta_pixel_id/tiktok_pixel_id/line_tag_id` แล้ว → ต้อง **ฉีดตอน runtime ต่อร้าน** (build-time ทำไม่ได้) |
| 5 | **แบรนด์ต่อร้าน** | ไม่มีคอลัมน์แบรนด์ใน `tenants` | เพิ่ม `slug` (UNIQUE), โลโก้/สี/ข้อความ hero (หรือทำ `tenant_sites`-style) |
| 6 | **Auth ของ admin** | 🔴 **`/api/tenants` และ `/api/dashboard` เปิดสาธารณะ ไม่มี auth** — ใครก็อ่านรายชื่อร้าน+ยอดขายได้ และ `POST /api/tenants` สมัครร้านได้ | ต้องมี auth + role (owner/admin) ก่อนเปิด multi-store จริง |
| 7 | **token Shopify ต่อร้าน** | ไม่มีที่เก็บ | เก็บใน D1 แบบเข้ารหัส (AES key จาก secret) — Cloudflare secret เป็นระดับ Worker ไม่ใช่ต่อ tenant จึงใช้ binding ตรง ๆ ไม่ได้ |

> ข้อ 6 คือเรื่องด่วน: ตอนนี้หน้า `/dashboard`, `/clients`, `/settings` และ API ทั้งสามตัวเปิดให้ใครก็เข้าได้ (ตรวจซ้ำเมื่อกี้: `GET /api/tenants` → 200, `GET /api/dashboard?range=7d` → 200 โดยไม่มี credential ใด ๆ) การเปิด multi-store ก่อนปิดช่องนี้ = เปิดข้อมูลทุกสาขาให้สาธารณะ

## 3. แผนที่เสนอ (เป็นระยะ)

### 3.1 ทำแล้วในรอบนี้ (ระยะ 1)

**การแยกร้าน = subdomain** (`<slug>.<root-domain>`) ตามที่ตัดสินใจ · registry แยกกันแต่ใช้ slug/id ร่วม · ไม่ผูกข้อมูลกับ pkkoko.store

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `db/migrations/0001_tenants_slug.sql` | เพิ่ม `tenants.slug` + unique index + backfill + trigger กัน slug ผิดรูปแบบ (**apply กับ production D1 แล้ว**) |
| `shared/store.js` | `resolveStore()` — หาร้านจาก ①`?store=` ②cookie `dsp_store` ③subdomain ④`DEFAULT_STORE_SLUG` · หาไม่เจอ → ใช้ร้านเริ่มต้นและคืน `resolved:false` |
| `functions/api/store.js` | `GET /api/store` → ข้อมูลร้านที่ไม่เป็นความลับ (slug, name, resolution, pixels, shopify_configured) |
| `functions/api/track.js` | เขียน event พร้อม `client_id` ของร้านที่ resolve ได้ (เดิม hardcode default) |
| `functions/api/orders.js` | POST ผูก `client_id` · **GET ค้นออเดอร์เฉพาะร้านตัวเอง** (ออเดอร์ร้านอื่นค้นไม่เจอ) |
| `functions/api/dashboard.js` | ทุก query ถูก scope ด้วย `client_id` → dashboard เห็นเฉพาะร้านตัวเอง |
| `functions/api/products.js` | ใช้ `tenants.shopify_domain` ของร้านนั้นก่อน `SHOPIFY_STORE_URL` |
| `functions/api/tenants.js` | รับ/ตรวจ `slug` (derive จากชื่อได้) · ซ้ำ → 409 · ผิดรูปแบบ → 400 |
| `src/lib/store.js` + `CatalogContext` | ฝั่ง client รู้ว่ากำลังดูร้านไหน + `?store=` ตั้ง cookie ให้ทดสอบหลายร้านจาก origin เดียว |
| `components/admin.jsx` | sidebar admin แสดง "ร้านที่กำลังดู" + วิธี resolve (default/subdomain/override) |

**ทดสอบแล้วในเครื่อง** (wrangler pages dev + D1 2 ร้าน):

```
/api/store                              -> bc-activewear (default)
/api/store  [Host: cafe.…pages.dev]     -> cafe (subdomain) · name คาเฟ่อบอุ่น
/api/store?store=cafe                   -> cafe (override)
/api/store  [Host: nope.…pages.dev]     -> fallback + resolved:false, subdomain:not_found
/api/dashboard?range=today              -> 1 order ฿2,990 · 51 events · 8 sessions
/api/dashboard?range=today&store=cafe   -> 1 order ฿180   ·  3 events · 1 session
/api/orders?id=SS-777001                -> 404 (ออเดอร์ของ cafe)   | &store=cafe -> 200
/api/orders?id=SS-123456&store=cafe     -> 404 (ออเดอร์ของ bc)
POST /api/track?store=cafe              -> เขียนด้วย client_id = cafe-store
/api/products?store=cafe                -> ใช้ demo-cafe.myshopify.com (ขาดแค่ token)
POST /api/tenants {slug:'cafe'}         -> 409 · {slug:'bad slug!'} -> 400 · ไม่ส่ง slug -> derive 'cafe-two'
```

**ยังไม่ทำในระยะนี้ (โดยตั้งใจ):**
- **Auth ของ admin** — ยังไม่ปิด (`/api/tenants`, `/api/dashboard` เปิดสาธารณะ) ต้องทำก่อนเปิด multi-store จริง
- **token Shopify ต่อร้าน** — ตอนนี้ใช้ token คู่เดียวใน env กับทุกร้าน (ต้องมี encryption design)
- **pixel ต่อร้าน** — คอลัมน์มีแล้ว แต่ยังฉีดจาก build-time env; ต้องฉีดตอน runtime ต่อร้าน
- **แบรนด์ต่อร้าน** (โลโก้/สี) — ยังไม่มีคอลัมน์
- **subdomain จริง** — ต้องตั้ง custom domain ก่อน ตรวจแล้วว่าใช้ `*.bruno-silver-products.pages.dev` เป็น subdomain ต่อร้าน **ไม่ได้** (DNS ของ `*.pages.dev` ชี้เข้า Cloudflare แต่ Host ที่ไม่ใช่ alias ของ deployment จะได้หน้า error ของ Cloudflare ไม่ใช่แอปเรา) และ `*.sv9.store` ยังไม่มี DNS record → ต้องเพิ่ม custom domain ให้ Pages project เช่น `*.sv9.store` (ถ้า Pages รองรับ wildcard) หรือเพิ่มทีละร้าน `cafe.sv9.store`
- การทดสอบบน production จึงใช้ `?store=<slug>` ได้ แต่ subdomain จะทดสอบได้จริงหลังตั้ง domain เท่านั้น

### 3.2 ระยะถัดไป (แผนเดิม)

**ระยะ 0 — ปิดช่องโหว่ ✅ ทำแล้ว**

ทำเสร็จในรอบนี้ (ดู README หัวข้อ 10): `users`/`sessions`/`tenant_members`/`login_attempts` + PBKDF2 + cookie session ·
`/api/tenants` และ `/api/dashboard` ตอบ 401 เมื่อไม่มี session · ตรวจสิทธิ์ระดับร้าน (403 ถ้าไม่ใช่สมาชิกของร้านนั้น) ·
`POST /api/tenants` จำกัดเฉพาะ platform admin · UI คลุมด้วย `AdminGate`
— apply migration กับ production D1 และตั้ง `AUTH_PEPPER` (secret) แล้ว · **ยังต้องให้เจ้าของตั้ง `ADMIN_SETUP_TOKEN` เพื่อสร้างผู้ดูแลคนแรก**

**รายละเอียดเดิมของระยะ 0 (เก็บไว้เป็น reference)**
- เพิ่ม auth สำหรับ admin: ใช้ระบบ login จริง (หรือถ้าจะผูกกับ membership → ใช้ `users` + `owner_user_id` ของระบบนั้นเป็น identity กลาง)
- `/api/tenants`, `/api/dashboard`, `/api/orders` (list), `/api/settings` → ต้องมี session + ตรวจว่าเป็นเจ้าของร้านนั้น (tenant scoping)
- `POST /api/tenants` → ต้องมีสิทธิ์ (ตอนนี้ยิง `{"name":"..."}` เฉย ๆ ก็สมัครได้)

**ระยะ 1 — store resolution + tenant scoping**
- เพิ่ม `tenants.slug UNIQUE` และ route `/t/:slug` (คัดลอก pattern ของระบบ membership)
- `events`/`orders` เขียนด้วย `client_id` ของ tenant ที่ resolve ได้ (เลิก default `bc-activewear`)
- `/api/products` รับ tenant → ใช้ `shopify_domain` ของร้านนั้น
- dashboard แสดงข้อมูลเฉพาะร้าน + มีตัวสลับร้านสำหรับ owner

**ระยะ 2 — ตั้งค่าต่อร้าน**
- หน้า admin ต่อร้าน: ตั้ง `shopify_domain` + token (เข้ารหัส) + pixel IDs ต่อร้าน
- runtime pixel injection ต่อร้าน (`/api/store/:slug/config` → ฉีดตอนโหลด) แทน `VITE_*` ที่ฝังตอน build
- แบรนด์ต่อร้าน (โลโก้/สี/ข้อความ) แบบ `tenant_sites`

**ระยะ 3 — ผูกกับระบบ membership (ถ้าต้องการ "บัญชีเดียว หลายร้าน")**
- เพิ่ม D1 binding ตัวที่สอง (`MEMBERSHIP_DB`, read-only) หรือทำ registry Worker
- ให้ tenant id ตรงกันทั้งสองฝั่ง: ฝั่งเราใช้ `tenants.id` = membership `tenants.id` และ `slug` เดียวกัน
- ทางฝั่ง membership เพิ่มลิงก์ "ดูหน้าร้านสินค้า" ชี้มาที่ `/t/<slug>` ของเรา (และกลับกัน)
- ไม่แตะ/ไม่ย้ายตารางของอีกฝั่ง — แลกกันผ่าน id/slug + registry เท่านั้น

## 4. สิ่งที่ต้องตัดสินใจก่อนลงมือ

1. **การแยกร้าน**: `/t/<slug>` (เหมือนระบบที่มีอยู่) หรือ **โดเมน/subdomain ต่อร้าน** (เช่น `cafe.sv9.store`) — แบบหลังต้องตั้ง custom domain ต่อร้านใน Cloudflare
2. **registry**: แยกกันแต่ใช้ `slug`/`id` ชุดเดียวกัน (เริ่มง่าย) · หรืออ่าน `tenants` จาก membership-d1 โดยตรง (บัญชีเดียวจริง แต่ผูกกันแน่นขึ้น) · หรือทำ registry API กลาง
3. **auth**: ใช้ระบบ login ของ membership (`users`) เป็น identity กลาง หรือทำ auth ของโปรเจกต์นี้เอง
4. **pkkoko.store**: ต้องการให้เป็น "ร้านหนึ่ง" ในระบบนี้ (มีหน้าร้านสินค้าแยก) หรือแค่ทำให้ระบบเรารองรับหลายร้านโดยยังไม่ผูกกับร้านนั้น
