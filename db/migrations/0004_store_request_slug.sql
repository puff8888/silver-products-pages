-- 0004: store the requested subdomain slug on store requests so a second request
-- for the same name can be rejected before a tenant row is ever created.
ALTER TABLE store_requests ADD COLUMN slug TEXT;
CREATE INDEX IF NOT EXISTS idx_store_requests_slug ON store_requests(slug);
