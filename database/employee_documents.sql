CREATE TABLE `employee_documents` (
  `id`            bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id`   int(10) UNSIGNED NOT NULL,
  `company_id`    int(10) UNSIGNED NOT NULL,
  `filename`      varchar(255) NOT NULL,         `storage_url`   text NOT NULL,               
  `mime_type`     varchar(100) DEFAULT NULL,
  `size_bytes`    bigint(20) DEFAULT NULL,
  `label`         varchar(150) DEFAULT NULL,  
  `notes`         text DEFAULT NULL,           
  `uploaded_by`   int(10) UNSIGNED DEFAULT NULL,
  `created_at`    datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_empdoc_employee` (`employee_id`),
  KEY `idx_empdoc_company` (`company_id`),
  CONSTRAINT `fk_empdoc_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_empdoc_company`  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
