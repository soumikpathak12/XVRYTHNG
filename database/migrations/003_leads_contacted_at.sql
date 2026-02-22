-- Add contacted_at to leads if missing (used when lead moves to 'contacted' stage and by follow-up worker).
-- Run once: mysql -u your_user -p xvrythng < database/migrations/003_leads_contacted_at.sql

ALTER TABLE leads ADD COLUMN contacted_at DATETIME DEFAULT NULL;
