-- XVRYTHNG - Add category and category_other to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN category ENUM('installation', 'referral', 'others') NOT NULL DEFAULT 'installation' AFTER subject,
  ADD COLUMN category_other VARCHAR(255) NULL DEFAULT NULL AFTER category;
