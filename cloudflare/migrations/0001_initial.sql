-- Optional production migration for Cloudflare D1.
-- This prototype currently uses browser localStorage.
-- Move sensitive pastoral data here before using the app for real ministry records.

CREATE TABLE IF NOT EXISTS app_records (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_records_collection ON app_records(collection);
