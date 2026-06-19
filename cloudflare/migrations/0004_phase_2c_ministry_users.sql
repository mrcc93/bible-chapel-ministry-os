-- Phase 2C-Prep: app-managed ministry users and role foundation.
-- Cloudflare Access remains the authentication provider; this table stores only
-- approved app users, roles, active status, and timestamps.

CREATE TABLE IF NOT EXISTS ministry_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'pastor_leader', 'volunteer_view_only')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ministry_users_email_active ON ministry_users(email, active);
CREATE INDEX IF NOT EXISTS idx_ministry_users_role ON ministry_users(role);
