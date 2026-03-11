CREATE TABLE `projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint(20) unsigned NOT NULL,
  `stage` enum('new','pre_approval','state_rebate','design_engineering','procurement','scheduled','installation_in_progress','installation_completed','compliance_check','inspection_grid_connection','rebate_stc_claims','project_completed') NOT NULL DEFAULT 'new',
  `customer_name` varchar(150) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_projects_lead_id` (`lead_id`),
  KEY `idx_projects_stage` (`stage`),
  CONSTRAINT `fk_projects_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

CREATE TABLE `project_assignees` (
  `project_id` bigint(20) unsigned NOT NULL,
  `employee_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`project_id`,`employee_id`),
  KEY `idx_company` (`company_id`),
  KEY `fk_pa_employee` (`employee_id`),
  CONSTRAINT `fk_pa_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci



CREATE TABLE `project_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint(20) unsigned NOT NULL,
  `project_id` bigint(20) unsigned NOT NULL,
  `status` enum('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
  `scheduled_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_project` (`project_id`),
  KEY `idx_company_project` (`company_id`,`project_id`),
  CONSTRAINT `fk_ps_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
