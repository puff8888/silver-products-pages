-- 0003: per-store secrets (encrypted), branding, and store requests
--
-- 1) tenant_credentials — API tokens per store. Cloudflare secrets are scoped to
--    a Worker, not to a tenant, so per-store tokens must live in the database.
--    They are never stored in plaintext: AES-GCM with a 256-bit key derived from
--    the CREDENTIALS_KEY secret (see shared/credentials.js).
-- 2) tenants branding columns — used by the store directory and the per-store
--    storefront.
-- 3) store_requests — what the /sell page submits, so the sales page is not a
--    fake form (the audit flagged exactly that pattern).

CREATE TABLE IF NOT EXISTS tenant_credentials (
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,                    -- 'shopify_admin_token' | 'shopify_storefront_token' | ...
  ciphertext TEXT NOT NULL,                  -- base64 AES-GCM output
  iv TEXT NOT NULL,                          -- base64 12-byte nonce
  key_version INTEGER NOT NULL DEFAULT 1,
  hint TEXT,                                 -- display-only, e.g. '…a1b2'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, provider)
);

ALTER TABLE tenants ADD COLUMN tagline TEXT;
ALTER TABLE tenants ADD COLUMN brand_color TEXT;
ALTER TABLE tenants ADD COLUMN logo_url TEXT;
ALTER TABLE tenants ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'starter';

CREATE TABLE IF NOT EXISTS store_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  contact TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests (status, created_at);
