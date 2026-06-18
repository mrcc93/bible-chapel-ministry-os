-- Link Sunday services back to typed sermon planning rows without moving any
-- sensitive collections or introducing JSON blob storage.

ALTER TABLE services ADD COLUMN sermon_id TEXT REFERENCES sermons(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN sermon_title TEXT;
ALTER TABLE services ADD COLUMN series_id TEXT REFERENCES sermon_series(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN series_title TEXT;

CREATE INDEX IF NOT EXISTS idx_services_sermon ON services(sermon_id);
