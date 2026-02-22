-- Store which customer (lead) referred this lead. Run once.
ALTER TABLE leads
  ADD COLUMN referred_by_lead_id BIGINT(20) UNSIGNED NULL DEFAULT NULL AFTER source,
  ADD KEY idx_leads_referred_by (referred_by_lead_id);
