CREATE TABLE `resource_library_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `company_id` int(10) unsigned DEFAULT NULL,
  `created_by` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'sticker',
  `section_name` varchar(120) NOT NULL DEFAULT 'General',
  `resource_type` varchar(20) NOT NULL DEFAULT 'photo',
  `image_url` varchar(1000) DEFAULT NULL,
  `link_url` varchar(1000) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_resource_company` (`company_id`),
  KEY `idx_resource_category` (`category`),
  KEY `idx_resource_created_by` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
