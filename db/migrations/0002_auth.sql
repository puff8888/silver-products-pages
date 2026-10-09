-- 0002: admin authentication
--
-- Before this, /api/tenants and /api/dashboard were fully public: anyone could
-- list every store with its revenue and register new stores. Multi-store makes
-- that worse, so admin access is now a real session.
--
-- Model (mirrors the membership platform's `owner_user_id` idea without sharing
-- its data — see docs/multi-store-plan.md):
--   users          = platform admins and store owners
--   tenant_members = which stores a user may open (multi-store per user)
--   sessions       = opaque session tokens, stored hashed

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',        -- 'admin' = platform owner (all stores)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS tenant_members (
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',       -- 'owner' | 'staff'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members (tenant_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                      -- sha256(token) hex, never the raw token
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- Simple brute-force guard: too many failures for one email in a short window
-- locks further attempts for that email.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (email, attempted_at);
