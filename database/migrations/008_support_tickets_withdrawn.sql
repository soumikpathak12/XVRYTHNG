-- XVRYTHNG - Add 'withdrawn' status for customer-initiated ticket withdrawal
ALTER TABLE support_tickets
  MODIFY COLUMN status ENUM('open', 'in_progress', 'resolved', 'closed', 'withdrawn') NOT NULL DEFAULT 'open';
