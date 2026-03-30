-- -----------------------------------------------------------------------------
-- Migration: add `sales_segment` to `leads` (B2C / B2B pipeline)
-- Matches: backend/database/migrationRunner.js → V011__leads_sales_segment
-- Reference schema: database/xvrythng (5).sql (column absent before this migration)
-- -----------------------------------------------------------------------------
-- Run once (e.g. if Node migrations did not apply):
--   mysql -u USER -p DATABASE < database/migrations/032_leads_sales_segment.sql
-- -----------------------------------------------------------------------------

ALTER TABLE `leads`
  ADD COLUMN `sales_segment` VARCHAR(8) NULL DEFAULT NULL
    COMMENT 'b2c | b2b'
  AFTER `marketing_payload_json`;
