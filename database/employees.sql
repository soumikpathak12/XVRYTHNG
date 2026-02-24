-- =====================================================================
-- XVRYTHNG - Master Schema (DDL)
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1) Core / Companies, Types, Modules
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS company_types (
  id              TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  description     VARCHAR(255) DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_company_type_name (name),
  KEY idx_company_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  status          ENUM('active','suspended','trial') NOT NULL DEFAULT 'active',
  abn             VARCHAR(20) DEFAULT NULL,
  contact_email   VARCHAR(255) DEFAULT NULL,
  contact_phone   VARCHAR(50)  DEFAULT NULL,
  address_line1   VARCHAR(255) DEFAULT NULL,
  address_line2   VARCHAR(255) DEFAULT NULL,
  city            VARCHAR(100) DEFAULT NULL,
  state           VARCHAR(100) DEFAULT NULL,
  postcode        VARCHAR(20)  DEFAULT NULL,
  country         VARCHAR(100) DEFAULT 'Australia',
  company_type_id TINYINT UNSIGNED DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_companies_slug (slug),
  KEY idx_companies_slug (slug),
  KEY idx_companies_status (status),
  KEY fk_companies_type (company_type_id),
  CONSTRAINT fk_companies_type
    FOREIGN KEY (company_type_id) REFERENCES company_types(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
  key_name        VARCHAR(80)  NOT NULL,
  display_name    VARCHAR(150) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_type_modules (
  company_type_id TINYINT UNSIGNED NOT NULL,
  module_key      VARCHAR(80)  NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_type_id, module_key),
  KEY idx_ctm_module (module_key),
  CONSTRAINT company_type_modules_ibfk_1
    FOREIGN KEY (company_type_id) REFERENCES company_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2) RBAC / Roles, Permissions, Role-Permissions
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  resource    VARCHAR(80)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_permission (resource, action),
  KEY idx_perm_resource (resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TINYINT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY fk_rp_permission (permission_id),
  CONSTRAINT role_permissions_ibfk_1
    FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  CONSTRAINT role_permissions_ibfk_2
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3) Users & Auth
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id          INT UNSIGNED DEFAULT NULL,
  role_id             TINYINT UNSIGNED NOT NULL,
  custom_role_id      INT UNSIGNED DEFAULT NULL,
  email               VARCHAR(255) NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  phone               VARCHAR(32)  DEFAULT NULL,
  abn                 VARCHAR(32)  DEFAULT NULL,
  image_url           VARCHAR(255) DEFAULT NULL,
  status              ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
  last_login_at       TIMESTAMP NULL DEFAULT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  failed_attempts     INT NOT NULL DEFAULT 0,
  lock_until          DATETIME DEFAULT NULL,
  password_changed_at DATETIME DEFAULT NULL,
  department          VARCHAR(100) DEFAULT NULL,
  notify_email        TINYINT(1) NOT NULL DEFAULT 1,
  notify_sms          TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email_company (email, company_id),
  KEY idx_users_email (email),
  KEY idx_users_company_role (company_id, role_id),
  KEY idx_users_status (status),
  KEY fk_users_custom_role (custom_role_id),
  CONSTRAINT users_ibfk_1 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT users_ibfk_2 FOREIGN KEY (role_id)    REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_rt_user (user_id),
  KEY idx_rt_token (token_hash),
  KEY idx_rt_exp (expires_at),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)  NOT NULL,
  expires_at  DATETIME  NOT NULL,
  used_at     DATETIME  DEFAULT NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_ip  VARCHAR(45) DEFAULT NULL,
  user_agent  VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_prt_user  (user_id),
  KEY idx_prt_token (token_hash),
  KEY idx_prt_exp   (expires_at),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4) Company-level structures: Departments, Job roles, Employment types
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(50)  DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dept_company_name (company_id, name),
  CONSTRAINT fk_dept_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employment_types (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_employment_type_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_roles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  INT UNSIGNED NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_jobrole_company_code (company_id, code),
  CONSTRAINT fk_jobrole_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_role_modules (
  job_role_id INT UNSIGNED NOT NULL,
  module_key  VARCHAR(80)  NOT NULL,
  PRIMARY KEY (job_role_id, module_key),
  KEY fk_jrm_module (module_key),
  CONSTRAINT fk_jrm_role   FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_jrm_module FOREIGN KEY (module_key)  REFERENCES modules(key_name) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5) Employees & related
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id         INT UNSIGNED NOT NULL,
  user_id            INT UNSIGNED DEFAULT NULL,
  employee_code      VARCHAR(50)  DEFAULT NULL,
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  date_of_birth      DATE DEFAULT NULL,
  gender             VARCHAR(20)  DEFAULT NULL,
  email              VARCHAR(150) NOT NULL,
  phone              VARCHAR(50)  DEFAULT NULL,
  address_line1      VARCHAR(200) DEFAULT NULL,
  address_line2      VARCHAR(200) DEFAULT NULL,
  city               VARCHAR(100) DEFAULT NULL,
  state              VARCHAR(100) DEFAULT NULL,
  postal_code        VARCHAR(30)  DEFAULT NULL,
  country            VARCHAR(100) DEFAULT NULL,
  department_id      INT UNSIGNED DEFAULT NULL,
  job_role_id        INT UNSIGNED DEFAULT NULL,
  employment_type_id TINYINT UNSIGNED DEFAULT NULL,
  start_date         DATE DEFAULT NULL,
  end_date           DATE DEFAULT NULL,
  rate_type          ENUM('hourly','daily','monthly','annual') DEFAULT 'monthly',
  rate_amount        DECIMAL(12,2) DEFAULT 0.00,
  status             ENUM('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active',
  avatar_url         VARCHAR(255) DEFAULT NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_emp_company (company_id),
  KEY idx_emp_dept    (department_id),
  KEY idx_emp_jobrole (job_role_id),
  KEY idx_emp_status  (status),
  KEY fk_emp_user     (user_id),
  KEY fk_emp_emptype  (employment_type_id),
  CONSTRAINT fk_emp_company  FOREIGN KEY (company_id)         REFERENCES companies(id)          ON DELETE CASCADE,
  CONSTRAINT fk_emp_user     FOREIGN KEY (user_id)            REFERENCES users(id)              ON DELETE SET NULL,
  CONSTRAINT fk_emp_dept     FOREIGN KEY (department_id)      REFERENCES departments(id)        ON DELETE SET NULL,
  CONSTRAINT fk_emp_jobrole  FOREIGN KEY (job_role_id)        REFERENCES job_roles(id)          ON DELETE SET NULL,
  CONSTRAINT fk_emp_emptype  FOREIGN KEY (employment_type_id) REFERENCES employment_types(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee_qualifications (
  employee_id      INT UNSIGNED NOT NULL,
  qualification_id INT UNSIGNED NOT NULL,
  obtained_date    DATE DEFAULT NULL,
  expires_date     DATE DEFAULT NULL,
  PRIMARY KEY (employee_id, qualification_id),
  KEY fk_eq_qual (qualification_id),
  CONSTRAINT fk_eq_emp  FOREIGN KEY (employee_id)      REFERENCES employees(id)       ON DELETE CASCADE,
  CONSTRAINT fk_eq_qual FOREIGN KEY (qualification_id) REFERENCES qualifications(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id   INT UNSIGNED NOT NULL,
  contact_name  VARCHAR(150) NOT NULL,
  relationship  VARCHAR(100) DEFAULT NULL,
  phone         VARCHAR(50)  NOT NULL,
  email         VARCHAR(150) DEFAULT NULL,
  address       VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY fk_emg_emp (employee_id),
  CONSTRAINT fk_emg_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6) Qualifications (catalogue)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS qualifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  authority   VARCHAR(150) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_qual_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7) Leads / Sales (rút gọn theo dump của bạn)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  stage                   ENUM('new','contacted','qualified','inspection_booked','inspection_completed','proposal_sent','negotiation','closed_won','closed_lost') NOT NULL,
  customer_name           VARCHAR(150) NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  phone                   VARCHAR(50)  NOT NULL,
  suburb                  VARCHAR(150) DEFAULT NULL,
  system_size_kw          DECIMAL(10,2) DEFAULT NULL,
  value_amount            DECIMAL(14,2) DEFAULT NULL,
  source                  VARCHAR(100) DEFAULT NULL,
  is_closed               TINYINT(1) NOT NULL DEFAULT 0,
  is_won                  TINYINT(1) NOT NULL DEFAULT 0,
  won_lost_at             DATETIME DEFAULT NULL,
  last_activity_at        DATETIME DEFAULT NULL,
  site_inspection_date    DATETIME DEFAULT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  system_type             VARCHAR(100) DEFAULT NULL,
  house_storey            VARCHAR(50)  DEFAULT NULL,
  roof_type               VARCHAR(100) DEFAULT NULL,
  meter_phase             VARCHAR(20)  DEFAULT NULL,
  access_to_second_storey TINYINT(1) DEFAULT NULL,
  access_to_inverter      TINYINT(1) DEFAULT NULL,
  pre_approval_reference_no VARCHAR(100) DEFAULT NULL,
  energy_retailer         VARCHAR(120) DEFAULT NULL,
  energy_distributor      VARCHAR(120) DEFAULT NULL,
  solar_vic_eligibility   TINYINT(1) DEFAULT NULL,
  nmi_number              VARCHAR(50) DEFAULT NULL,
  meter_number            VARCHAR(50) DEFAULT NULL,
  contacted_at            DATETIME DEFAULT NULL,
  last_inbound_email_at   DATETIME DEFAULT NULL,
  last_outbound_email_at  DATETIME DEFAULT NULL,
  followup_first_sent_at  DATETIME DEFAULT NULL,
  followup_second_sent_at DATETIME DEFAULT NULL,
  flagged_for_review_at   DATETIME DEFAULT NULL,
  auto_close_nonresponsive TINYINT(1) NOT NULL DEFAULT 0,
  lost_reason             VARCHAR(120) DEFAULT NULL,
  owner_doc_last_sent_at  DATETIME DEFAULT NULL,
  owner_doc_reminders_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_leads_board (stage, updated_at),
  KEY idx_leads_stage_count (stage),
  KEY idx_leads_value (value_amount),
  KEY idx_leads_text (customer_name),
  KEY idx_leads_suburb (suburb),
  KEY idx_leads_site_inspection_date (site_inspection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_communications (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id           BIGINT UNSIGNED NOT NULL,
  direction         ENUM('outbound','inbound') NOT NULL,
  channel           ENUM('email','sms','call') NOT NULL DEFAULT 'email',
  subject           VARCHAR(255) DEFAULT NULL,
  body              MEDIUMTEXT DEFAULT NULL,
  automated         TINYINT(1) NOT NULL DEFAULT 0,
  provider_message_id VARCHAR(255) DEFAULT NULL,
  related_message_id  VARCHAR(255) DEFAULT NULL,
  sent_at           DATETIME DEFAULT NULL,
  delivered_at      DATETIME DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead (lead_id),
  CONSTRAINT fk_comm_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_documents (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id      BIGINT UNSIGNED NOT NULL,
  status       ENUM('requested','received') NOT NULL DEFAULT 'requested',
  filename     VARCHAR(255) DEFAULT NULL,
  storage_url  TEXT DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead (lead_id),
  CONSTRAINT fk_lead_documents_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_site_inspections (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lead_id            BIGINT UNSIGNED NOT NULL,
  status             ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  inspected_at       DATETIME DEFAULT NULL,
  inspector_name     VARCHAR(120) DEFAULT NULL,
  roof_type          VARCHAR(60)  DEFAULT NULL,
  roof_pitch_deg     DECIMAL(5,2) DEFAULT NULL,
  house_storey       ENUM('single','double','triple') DEFAULT NULL,
  meter_phase        ENUM('single','three') DEFAULT NULL,
  inverter_location  VARCHAR(255) DEFAULT NULL,
  msb_condition      TEXT DEFAULT NULL,
  shading            ENUM('none','light','moderate','heavy') DEFAULT NULL,
  additional_notes   TEXT DEFAULT NULL,
  template_key       VARCHAR(64)  DEFAULT NULL,
  template_version   INT DEFAULT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_lead (lead_id),
  KEY idx_lead (lead_id),
  CONSTRAINT fk_siteinsp_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8) Conversations / Messages (DM/Group)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  INT UNSIGNED DEFAULT NULL,
  type        ENUM('dm','group') NOT NULL DEFAULT 'dm',
  name        VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_company (company_id),
  CONSTRAINT conversations_ibfk_1 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id  INT UNSIGNED NOT NULL,
  user_id          INT UNSIGNED NOT NULL,
  last_read_at     TIMESTAMP NULL DEFAULT NULL,
  joined_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_conv_participant (conversation_id, user_id),
  KEY idx_conv_participants_user (user_id),
  CONSTRAINT conversation_participants_ibfk_1
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_participants_ibfk_2
    FOREIGN KEY (user_id)        REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id  INT UNSIGNED NOT NULL,
  sender_id        INT UNSIGNED NOT NULL,
  body             TEXT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id),
  KEY idx_messages_created (conversation_id, created_at),
  KEY idx_messages_sender (sender_id),
  CONSTRAINT messages_ibfk_1 FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_ibfk_2 FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9) Inspection Templates (JSON columns)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inspection_templates (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  company_id    BIGINT NOT NULL,
  `key`         VARCHAR(64) NOT NULL,
  name          VARCHAR(128) NOT NULL,
  version       INT NOT NULL DEFAULT 1,
  status        ENUM('draft','published') NOT NULL DEFAULT 'draft',
  applies_to    LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`applies_to`)),
  steps         LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`steps`)),
  validation    LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`validation`)),
  meta          LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  published_at  DATETIME DEFAULT NULL,
  deleted_at    DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_template_version (company_id, `key`, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------
-- 10) Referrals
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referral_lead_id BIGINT UNSIGNED NOT NULL,
  bonus_amount     DECIMAL(10,2) NOT NULL,
  bonus_paid_at    DATETIME DEFAULT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_referral_lead_id (referral_lead_id),
  KEY idx_bonus_paid_at (bonus_paid_at),
  CONSTRAINT referral_bonuses_ibfk_1 FOREIGN KEY (referral_lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11) Custom Roles (per company) + permissions mapping
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS custom_roles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(80) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_custom_role_company_name (company_id, name),
  KEY idx_custom_roles_company (company_id),
  CONSTRAINT custom_roles_ibfk_1 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_role_permissions (
  custom_role_id INT UNSIGNED NOT NULL,
  permission_id  INT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (custom_role_id, permission_id),
  KEY fk_crp_permission (permission_id),
  CONSTRAINT custom_role_permissions_ibfk_1 FOREIGN KEY (custom_role_id) REFERENCES custom_roles(id) ON DELETE CASCADE,
  CONSTRAINT custom_role_permissions_ibfk_2 FOREIGN KEY (permission_id)  REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12) View: v_role_access_preview
-- ---------------------------------------------------------------------

DROP VIEW IF EXISTS v_role_access_preview;

CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW v_role_access_preview AS
SELECT
  c.id       AS company_id,
  jr.id      AS job_role_id,
  jr.code    AS job_role_code,
  m.key_name AS module_key,
  m.display_name AS display_name
FROM companies c
JOIN job_roles jr           ON jr.company_id = c.id
JOIN job_role_modules jrm   ON jrm.job_role_id = jr.id
JOIN modules m              ON m.key_name    = jrm.module_key
JOIN company_type_modules ctm
                            ON ctm.company_type_id = c.company_type_id
                           AND ctm.module_key      = jrm.module_key;

SET FOREIGN_KEY_CHECKS = 1;