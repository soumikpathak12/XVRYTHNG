-- XVRYTHNG - Phase 1: Auth & User Management
-- MySQL schema for RBAC (roles: super_admin, company_admin, manager, field_agent)
-- Designed for multi-tenant: 1000+ companies, 10k–30k users

-- ---------------------------------------------------------------------------
-- Companies (tenants). Super Admin is not tied to a company.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('active', 'suspended', 'trial') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_companies_slug (slug),
  INDEX idx_companies_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Roles: stored as enum for simplicity; extend via permissions table later.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Platform-wide admin'),
  ('company_admin', 'Company-level admin'),
  ('manager', 'Team/region manager'),
  ('field_agent', 'Field operations')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ---------------------------------------------------------------------------
-- Users: email unique per tenant (company_id); super_admin has company_id NULL.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED DEFAULT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_users_email_company (email, company_id),
  INDEX idx_users_email (email),
  INDEX idx_users_company_role (company_id, role_id),
  INDEX idx_users_status (status),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Optional: permissions table for future fine-grained RBAC (Phase 2+)
-- ---------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS permissions (
--   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   role_id TINYINT UNSIGNED NOT NULL,
--   resource VARCHAR(100) NOT NULL,
--   action VARCHAR(50) NOT NULL,
--   UNIQUE KEY uk_role_resource_action (role_id, resource, action),
--   FOREIGN KEY (role_id) REFERENCES roles(id)
-- ) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Internal messaging: conversations (DM + group), participants, messages.
-- company_id = tenant-scoped (same company only); company_id NULL = platform (cross-company) DM.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id INT UNSIGNED DEFAULT NULL,
  type ENUM('dm', 'group') NOT NULL DEFAULT 'dm',
  name VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_conversations_company (company_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table already existed with NOT NULL, run: ALTER TABLE conversations MODIFY company_id INT UNSIGNED DEFAULT NULL;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  last_read_at TIMESTAMP NULL DEFAULT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_conv_participant (conversation_id, user_id),
  INDEX idx_conv_participants_user (user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_conversation (conversation_id),
  INDEX idx_messages_created (conversation_id, created_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed: run backend/database/seed.js to create Super Admin user.
-- ---------------------------------------------------------------------------
