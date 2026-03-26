-- Flags shown on customer portal (My Project) after staff clicks "Update to customer".
ALTER TABLE leads
  ADD COLUMN customer_portal_pre_approval_announced TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN customer_portal_solar_vic_announced TINYINT(1) NOT NULL DEFAULT 0;
