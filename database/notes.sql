CREATE TABLE `lead_notes` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `lead_id` BIGINT(20) UNSIGNED NOT NULL,
  `body` TEXT NOT NULL,
  `follow_up_at` DATETIME DEFAULT NULL,
  `created_by` BIGINT(20) UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_notes_lead` (`lead_id`),
  CONSTRAINT `fk_lead_notes_lead`
    FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;