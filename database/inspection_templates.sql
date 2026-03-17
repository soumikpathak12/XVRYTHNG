-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 23, 2026 at 02:52 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `xvrythng`
--

-- --------------------------------------------------------

--
-- Table structure for table `inspection_templates`
--

CREATE TABLE `inspection_templates` (
  `id` bigint(20) NOT NULL,
  `company_id` bigint(20) NOT NULL,
  `key` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `applies_to` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`applies_to`)),
  `steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`steps`)),
  `validation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`validation`)),
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `published_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inspection_templates`
--

INSERT INTO `inspection_templates` (`id`, `company_id`, `key`, `name`, `version`, `status`, `applies_to`, `steps`, `validation`, `meta`, `published_at`, `deleted_at`, `created_at`, `updated_at`) VALUES
(5, 1, 'PV', 'PV', 1, 'published', '[]', '[]', '{\"requiredFields\":[\"inspected_at\",\"inspector_name\",\"meter_phase\",\"inverter_location\",\"msb_condition\"]}', '{\"enabledSections\":[\"core\",\"job\",\"subBoard\",\"monitor\",\"mudmap\"]}', '2026-02-23 02:14:52', NULL, '2026-02-23 02:14:51', '2026-02-23 02:14:52'),
(6, 1, 'default', 'Default (Full)', 1, 'published', '[\"*\"]', '[]', '{\"requiredFields\":[\"inspected_at\",\"inspector_name\",\"roof_type\",\"meter_phase\",\"inverter_location\",\"msb_condition\"]}', '{\"enabledSections\":[\"core\",\"job\",\"switchboard\",\"subBoard\",\"inverter\",\"monitor\",\"roof\",\"mudmap\",\"final\"],\"stepGuards\":[{\"stepId\":\"job\",\"fields\":[\"jobDetails.licenseSelfie\"]}]}', NULL, NULL, '2026-02-23 02:24:34', '2026-02-23 02:24:34');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `inspection_templates`
--
ALTER TABLE `inspection_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_template_version` (`company_id`,`key`,`version`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `inspection_templates`
--
ALTER TABLE `inspection_templates`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
