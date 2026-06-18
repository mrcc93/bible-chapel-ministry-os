-- Phase 2B: typed/queryable D1 structures for non-sensitive planning data.
-- Sensitive ministry data (attendance/giving, people, absences, visitors,
-- prayer requests, and pastoral contacts) remains intentionally unmigrated.
-- This migration is additive and does not modify the Phase 1 migration.

ALTER TABLE sermon_series ADD COLUMN scripture TEXT;
ALTER TABLE sermon_series ADD COLUMN theme TEXT;

CREATE TABLE IF NOT EXISTS sermons (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES sermon_series(id) ON DELETE CASCADE,
  sermon_date TEXT,
  title TEXT NOT NULL,
  passage TEXT,
  big_idea TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_songs (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  song_key TEXT,
  ccli TEXT,
  author TEXT,
  include_slide INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_slides (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slide_type TEXT,
  title TEXT,
  body TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sermons_series_date ON sermons(series_id, sermon_date);
CREATE INDEX IF NOT EXISTS idx_service_songs_service_sort ON service_songs(service_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_service_slides_service_sort ON service_slides(service_id, sort_order);
