-- XVRYTHNG - Support tickets for customer portal (T-335, T-340)
-- Customers submit tickets; routed to liaison based on project (lead).
-- Run 005_leads_company_liaison.sql first if leads lacks company_id/assigned_user_id for liaison routing.

-- support_tickets: one per customer submission
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NULL DEFAULT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  assigned_user_id INT UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_tickets_lead (lead_id),
  INDEX idx_support_tickets_company (company_id),
  INDEX idx_support_tickets_assigned (assigned_user_id),
  INDEX idx_support_tickets_status (status),
  INDEX idx_support_tickets_created (created_at),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- support_ticket_replies: thread-style messages
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  author_type ENUM('customer', 'staff') NOT NULL,
  author_lead_id BIGINT UNSIGNED NULL DEFAULT NULL,
  author_user_id INT UNSIGNED NULL DEFAULT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_replies_ticket (ticket_id),
  INDEX idx_replies_created (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (author_lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
