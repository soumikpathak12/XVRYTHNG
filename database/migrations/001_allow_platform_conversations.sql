-- Allow cross-company (platform) DMs: company_id NULL.
-- Run this if conversations was created with company_id NOT NULL.

ALTER TABLE conversations MODIFY company_id INT UNSIGNED DEFAULT NULL;
