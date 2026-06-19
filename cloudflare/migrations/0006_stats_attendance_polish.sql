-- Final phase: typed/queryable attendance statistics polish.
-- Existing attendance_stats rows are preserved; these additive columns support
-- service type and visitor counts without JSON blob storage.
ALTER TABLE attendance_stats ADD COLUMN service_type TEXT NOT NULL DEFAULT 'Sunday Worship';
ALTER TABLE attendance_stats ADD COLUMN visitors_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_stats_org_service_type ON attendance_stats(organization_id, service_type);
CREATE INDEX IF NOT EXISTS idx_stats_org_service_date_type ON attendance_stats(organization_id, service_date, service_type);
