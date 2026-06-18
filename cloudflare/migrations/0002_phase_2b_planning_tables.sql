-- Phase 2B: API-backed, non-sensitive planning collections only.
-- Sensitive ministry data (attendance/giving, people, absences, visitors,
-- prayer requests, and pastoral contacts) remains intentionally unmigrated.

CREATE TABLE IF NOT EXISTS planning_collection_records (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL CHECK (collection IN ('rhythm','tasks','events','annualPlan','roadmap','goals','series','services','bulletin')),
  data_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planning_collection_records_collection_sort
  ON planning_collection_records(collection, sort_order, updated_at);
