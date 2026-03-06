-- XVRYTHNG - Add company_id and assigned_user_id to leads for liaison routing (T-340)
-- Run this before 004_support_tickets.sql if your leads table doesn't have these columns.
-- Skip if you get "Duplicate column name" (columns already exist).

ALTER TABLE leads
  ADD COLUMN company_id INT UNSIGNED NULL DEFAULT NULL AFTER id,
  ADD COLUMN assigned_user_id INT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE leads
  ADD INDEX idx_leads_company (company_id),
  ADD INDEX idx_leads_assigned (assigned_user_id);

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_leads_assigned FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;
