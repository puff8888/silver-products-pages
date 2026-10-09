-- 0001: per-store slug for subdomain routing
--
-- Multi-store plan (docs/multi-store-plan.md): each store is addressed as
-- <slug>.<root-domain>, mirroring the /t/<slug> convention used by the
-- membership platform so the same store keeps the same identifier in both
-- systems (separate databases, shared slug/id — no data coupling).
--
-- Additive and safe to re-run: the column is nullable, then backfilled from the
-- existing id, then made unique.

ALTER TABLE tenants ADD COLUMN slug TEXT;

UPDATE tenants SET slug = lower(replace(id, ' ', '-')) WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

-- Legal subdomain labels only (a-z, 0-9, hyphen)
CREATE TRIGGER IF NOT EXISTS tenants_slug_guard
BEFORE INSERT ON tenants
FOR EACH ROW WHEN NEW.slug IS NOT NULL AND NEW.slug NOT GLOB '[a-z0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'invalid slug');
END;
