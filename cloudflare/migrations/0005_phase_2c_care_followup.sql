-- Phase 2C-C: typed/queryable D1 storage for care and follow-up workflows.
-- Additive only: preserve existing visitor/prayer/absence/contact tables and add
-- relationship fields needed by the API-backed Care UI.

ALTER TABLE visitors ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE visitors ADD COLUMN converted_person_id TEXT REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE prayer_requests ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE prayer_requests ADD COLUMN title TEXT;
ALTER TABLE prayer_requests ADD COLUMN request_date TEXT;

ALTER TABLE pastoral_contacts ADD COLUMN person_id TEXT REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE pastoral_contacts ADD COLUMN visitor_id TEXT REFERENCES visitors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_absences_org_person_date ON volunteer_absences(organization_id, person_id, absence_date);
CREATE INDEX IF NOT EXISTS idx_visitors_org_person ON visitors(organization_id, person_id);
CREATE INDEX IF NOT EXISTS idx_prayers_org_person ON prayer_requests(organization_id, person_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_person_visitor ON pastoral_contacts(organization_id, person_id, visitor_id);
