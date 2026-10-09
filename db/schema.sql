-- Local test schema + seed for the reconstructed bruno-silver-products app.
-- Mirrors the live D1 database `bruno_storefront` (read from production, schema only).

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'Organic',
  value REAL NOT NULL DEFAULT 0,
  content_ids TEXT,
  currency TEXT NOT NULL DEFAULT 'THB',
  order_id TEXT,
  product_count INTEGER,
  page_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  client_id TEXT NOT NULL DEFAULT 'bc-activewear'
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  client_id TEXT NOT NULL DEFAULT 'bc-activewear'
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shopify_domain TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  meta_pixel_id TEXT,
  tiktok_pixel_id TEXT,
  line_tag_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS sku_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',
  card_layout TEXT NOT NULL DEFAULT 'sku-per-card',
  sku_field_map TEXT NOT NULL DEFAULT '{"image":"image","title":"title","price":"price"}',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, name)
);

CREATE TABLE IF NOT EXISTS ad_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  template_id INTEGER,
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES sku_templates (id)
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_channel ON events (channel);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);

-- ── seed: one active tenant (same as production) ──
INSERT OR IGNORE INTO tenants (id, name, status, created_at) VALUES ('bc-activewear', 'BC Activewear', 'active', datetime('now'));

-- ── seed: a real order so /order lookup can be exercised ──
INSERT OR IGNORE INTO orders (order_id, customer_name, customer_phone, total_amount, payment_method, status, created_at)
VALUES ('SS-123456', 'Somchai Testorder', '0812345678', 2990, 'cod', 'Pending', datetime('now'));

-- ── seed: events crafted so the OLD event-counting funnel would break ──
-- session s1 repeats PageView/AddToCart; with per-event counting the later stage
-- exceeded the earlier one (the production bug), with DISTINCT sessions it cannot.
INSERT INTO events (session_id, event_name, channel, value, currency, page_path, created_at) VALUES
  ('s1', 'PageView',   'Organic', 0,    'THB', '/',              datetime('now')),
  ('s1', 'PageView',   'Organic', 0,    'THB', '/product',       datetime('now')),
  ('s1', 'ViewContent','Organic', 2990, 'THB', '/product/1',     datetime('now')),
  ('s1', 'AddToCart',  'Organic', 2990, 'THB', '/product/1',     datetime('now')),
  ('s1', 'AddToCart',  'Organic', 2990, 'THB', '/product/1',     datetime('now')),
  ('s1', 'Checkout',   'Organic', 2990, 'THB', '/checkout',      datetime('now')),
  ('s1', 'Purchase',   'Organic', 2990, 'THB', '/order/confirmation', datetime('now')),
  ('s2', 'PageView',   'Meta (IG/FB)', 0,    'THB', '/',         datetime('now')),
  ('s2', 'ViewContent','Meta (IG/FB)', 1990, 'THB', '/product/2', datetime('now')),
  ('s2', 'AddToCart',  'Meta (IG/FB)', 1990, 'THB', '/product/2', datetime('now')),
  ('s3', 'PageView',   'Organic', 0,    'THB', '/',              datetime('now'));
