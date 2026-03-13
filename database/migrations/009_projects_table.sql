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
  `expected_completion_date` date DEFAULT NULL,
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


CREATE TABLE `retailer_projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `code` varchar(20) NOT NULL,
  `job_type` enum('site_inspection','stage_one','stage_two','full_system') DEFAULT NULL,
  `stage` enum('new','site_inspection','stage_one','stage_two','full_system','cancelled','scheduled','to_be_rescheduled','installation_in_progress','installation_completed','ces_certificate_applied','ces_certificate_received','ces_certificate_submitted','done') NOT NULL DEFAULT 'new',
  `customer_name` varchar(150) NOT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_contact` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `location_url` varchar(1024) DEFAULT NULL,
  `client_type` varchar(100) DEFAULT NULL,
  `client_name` varchar(150) DEFAULT NULL,
  `system_type` varchar(100) DEFAULT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `house_storey` varchar(50) DEFAULT NULL,
  `roof_type` varchar(80) DEFAULT NULL,
  `meter_phase` varchar(40) DEFAULT NULL,
  `access_to_two_storey` varchar(20) DEFAULT NULL,
  `access_to_inverter` varchar(20) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `expected_completion_date` date DEFAULT NULL,
  `lead_id` bigint(20) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_retailer_projects_code` (`code`),
  KEY `idx_retailer_projects_company` (`company_id`),
  KEY `idx_retailer_projects_stage` (`stage`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

CREATE TABLE `retailer_project_assignees` (
  `project_id` bigint(20) unsigned NOT NULL,
  `employee_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`project_id`,`employee_id`,`company_id`),
  KEY `idx_rpa_company` (`company_id`),
  KEY `idx_rpa_employee` (`employee_id`),
  CONSTRAINT `fk_rpa_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rpa_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `retailer_project_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned NOT NULL,
  `project_id` bigint(20) unsigned NOT NULL,
  `job_type` enum('site_inspection','stage_one','stage_two','full_system') NOT NULL,
  `scheduled_date` date NOT NULL,
  `scheduled_time` time DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_retailer_project_schedule_project` (`company_id`,`project_id`),
  KEY `idx_retailer_project_schedule_company` (`company_id`),
  KEY `idx_retailer_project_schedule_date` (`scheduled_date`),
  KEY `fk_rps_project` (`project_id`),
  CONSTRAINT `fk_rps_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci