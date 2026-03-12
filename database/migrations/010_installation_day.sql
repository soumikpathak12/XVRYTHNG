-- XVRYTHNG – Installation Day module
-- Creates: installation_jobs, installation_checklist_items, installation_checklist_responses,
--          installation_photos, installation_signoffs
--
-- Prerequisites: companies, projects, retailer_projects, employees must already exist.
-- Run in phpMyAdmin: select database xvrythng → Import this file.

-- ---------------------------------------------------------------------------
-- 1. installation_jobs
--    One per scheduled installation day, linked to either a project or a
--    retailer_project (one of project_id / retailer_project_id must be set).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_jobs (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id           INT UNSIGNED NOT NULL,
  project_id           BIGINT UNSIGNED DEFAULT NULL,        -- FK → projects.id
  retailer_project_id  BIGINT UNSIGNED DEFAULT NULL,        -- FK → retailer_projects.id
  status               ENUM('scheduled','in_progress','paused','completed') NOT NULL DEFAULT 'scheduled',

  -- denormalised customer snapshot (avoids joins on mobile)
  customer_name        VARCHAR(150) NOT NULL DEFAULT '',
  customer_phone       VARCHAR(50)  DEFAULT NULL,
  customer_email       VARCHAR(255) DEFAULT NULL,
  address              VARCHAR(255) DEFAULT NULL,
  suburb               VARCHAR(150) DEFAULT NULL,

  -- system specs
  system_size_kw       DECIMAL(10,2) DEFAULT NULL,
  system_type          VARCHAR(100)  DEFAULT NULL,
  panel_count          SMALLINT UNSIGNED DEFAULT NULL,
  inverter_model       VARCHAR(150)  DEFAULT NULL,
  battery_included     TINYINT(1)   NOT NULL DEFAULT 0,

  -- scheduling
  scheduled_date       DATE         DEFAULT NULL,
  scheduled_time       TIME         DEFAULT NULL,
  estimated_hours      DECIMAL(4,1) DEFAULT NULL,

  -- lifecycle
  started_at           DATETIME     DEFAULT NULL,
  paused_at            DATETIME     DEFAULT NULL,
  completed_at         DATETIME     DEFAULT NULL,
  notes                TEXT         DEFAULT NULL,

  created_by           INT UNSIGNED DEFAULT NULL,
  updated_by           INT UNSIGNED DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_ij_company   (company_id),
  KEY idx_ij_project   (project_id),
  KEY idx_ij_retailer  (retailer_project_id),
  KEY idx_ij_date      (scheduled_date),
  KEY idx_ij_status    (status),

  CONSTRAINT fk_ij_company          FOREIGN KEY (company_id)          REFERENCES companies(id)          ON DELETE CASCADE,
  CONSTRAINT fk_ij_project          FOREIGN KEY (project_id)          REFERENCES projects(id)           ON DELETE SET NULL,
  CONSTRAINT fk_ij_retailer_project FOREIGN KEY (retailer_project_id) REFERENCES retailer_projects(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. installation_job_assignees
--    Team members assigned to each job.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_job_assignees (
  job_id       BIGINT UNSIGNED NOT NULL,
  employee_id  INT UNSIGNED    NOT NULL,
  company_id   INT UNSIGNED    NOT NULL,
  role         VARCHAR(80)     DEFAULT NULL,  -- e.g. 'lead_installer', 'apprentice'
  assigned_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by  INT UNSIGNED    DEFAULT NULL,

  PRIMARY KEY (job_id, employee_id),
  KEY idx_ija_company  (company_id),
  KEY idx_ija_employee (employee_id),

  CONSTRAINT fk_ija_job      FOREIGN KEY (job_id)      REFERENCES installation_jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_ija_employee FOREIGN KEY (employee_id) REFERENCES employees(id)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. installation_checklist_items
--    Reusable checklist templates (per company or global when company_id NULL).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_checklist_items (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  company_id   INT UNSIGNED    DEFAULT NULL,
  section      VARCHAR(100)    NOT NULL DEFAULT 'general',  -- e.g. 'pre_install','install','post_install'
  label        VARCHAR(255)    NOT NULL,
  sort_order   SMALLINT        NOT NULL DEFAULT 0,
  is_required  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_ici_company (company_id),
  KEY idx_ici_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default checklist items (global)
INSERT IGNORE INTO installation_checklist_items (company_id, section, label, sort_order, is_required) VALUES
-- Pre-install
(NULL, 'pre_install', 'Site arrival & safety briefing',        1,  1),
(NULL, 'pre_install', 'Confirm customer name & address',       2,  1),
(NULL, 'pre_install', 'Confirm system specs with customer',    3,  1),
(NULL, 'pre_install', 'Inspect roof / mounting area',          4,  1),
(NULL, 'pre_install', 'Check switchboard / MSB',               5,  1),
(NULL, 'pre_install', 'PPE checked for all team members',      6,  1),
-- Installation
(NULL, 'install',     'Mount rails / brackets',                1,  1),
(NULL, 'install',     'Install solar panels',                  2,  1),
(NULL, 'install',     'Run DC cabling & conduit',              3,  1),
(NULL, 'install',     'Install & wire inverter',               4,  1),
(NULL, 'install',     'AC connection to switchboard',          5,  1),
(NULL, 'install',     'Battery installation (if applicable)',  6,  0),
-- Post-install
(NULL, 'post_install','Commissioning & system test',           1,  1),
(NULL, 'post_install','Label all equipment',                   2,  1),
(NULL, 'post_install','Clean up worksite',                     3,  1),
(NULL, 'post_install','Brief customer on system operation',    4,  1),
(NULL, 'post_install','Take completion photos',                5,  1),
(NULL, 'post_install','Complete customer sign-off',            6,  1);

-- ---------------------------------------------------------------------------
-- 4. installation_checklist_responses
--    Responses per job per checklist item.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_checklist_responses (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id      BIGINT UNSIGNED NOT NULL,
  item_id     INT UNSIGNED    NOT NULL,
  checked     TINYINT(1)      NOT NULL DEFAULT 0,
  note        TEXT            DEFAULT NULL,
  checked_by  INT UNSIGNED    DEFAULT NULL,
  checked_at  DATETIME        DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_icr_job_item (job_id, item_id),
  KEY idx_icr_job   (job_id),
  KEY idx_icr_item  (item_id),

  CONSTRAINT fk_icr_job  FOREIGN KEY (job_id)  REFERENCES installation_jobs(id)              ON DELETE CASCADE,
  CONSTRAINT fk_icr_item FOREIGN KEY (item_id) REFERENCES installation_checklist_items(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. installation_photos
--    Photos attached to a job, organised by tab (Before / During / After).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_photos (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id       BIGINT UNSIGNED NOT NULL,
  company_id   INT UNSIGNED    NOT NULL,
  section      ENUM('before','during','after','general') NOT NULL DEFAULT 'general',
  storage_url  VARCHAR(512)    NOT NULL,
  filename     VARCHAR(255)    NOT NULL,
  mime_type    VARCHAR(80)     DEFAULT NULL,
  size_bytes   INT UNSIGNED    DEFAULT NULL,
  caption      VARCHAR(255)    DEFAULT NULL,
  lat          DECIMAL(10,7)   DEFAULT NULL,   -- GPS latitude  (T-247)
  lng          DECIMAL(10,7)   DEFAULT NULL,   -- GPS longitude (T-247)
  taken_at     DATETIME        DEFAULT NULL,   -- client-side capture time
  device_info  VARCHAR(255)    DEFAULT NULL,
  uploaded_by  INT UNSIGNED    DEFAULT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_ip_job     (job_id),
  KEY idx_ip_company (company_id),
  KEY idx_ip_section (section),

  CONSTRAINT fk_ip_job FOREIGN KEY (job_id) REFERENCES installation_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5b. Configurable photo requirements per company (T-245)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_photo_requirements (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  company_id  INT UNSIGNED    NOT NULL,
  section     ENUM('before','during','after') NOT NULL,
  min_count   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_required TINYINT(1)       NOT NULL DEFAULT 1,

  PRIMARY KEY (id),
  UNIQUE KEY uk_ipr_company_section (company_id, section),
  CONSTRAINT fk_ipr_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. installation_signoffs
--    Customer digital sign-off per job.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_signoffs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id          BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_name   VARCHAR(150)    NOT NULL,
  signature_url   VARCHAR(512)    DEFAULT NULL, -- base64 data URL or stored file path
  signed_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signed_by_ip    VARCHAR(45)     DEFAULT NULL,
  notes           TEXT            DEFAULT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_is_job (job_id),

  CONSTRAINT fk_is_job FOREIGN KEY (job_id) REFERENCES installation_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. Time records — every start / pause / resume / end event per job
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_time_records (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id       BIGINT UNSIGNED NOT NULL,
  company_id   INT UNSIGNED    NOT NULL,
  event        ENUM('start','pause','resume','end') NOT NULL,
  recorded_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recorded_by  INT UNSIGNED    DEFAULT NULL,
  note         VARCHAR(255)    DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_itr_job     (job_id),
  KEY idx_itr_company (company_id),
  KEY idx_itr_event   (event),

  CONSTRAINT fk_itr_job FOREIGN KEY (job_id) REFERENCES installation_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add elapsed-time accumulator to installation_jobs (idempotent via IF NOT EXISTS / MariaDB 10.4+)
ALTER TABLE installation_jobs
  ADD COLUMN IF NOT EXISTS total_elapsed_seconds INT UNSIGNED DEFAULT 0 AFTER completed_at;

-- ---------------------------------------------------------------------------
-- 8. Register module key (idempotent)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO modules (key_name, display_name) VALUES ('installation', 'Installation Day');

-- Make the module available for all relevant company types
INSERT IGNORE INTO company_type_modules (company_type_id, module_key)
SELECT ct.id, 'installation'
FROM company_types ct
WHERE ct.name IN ('solar_retailer', 'installer', 'enterprise');
