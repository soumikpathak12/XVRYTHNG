-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 15, 2026 at 09:47 AM
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
-- Table structure for table `attendance_edit_requests`
--

CREATE TABLE `attendance_edit_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `attendance_id` int(10) UNSIGNED NOT NULL,
  `orig_check_in` datetime DEFAULT NULL,
  `orig_check_out` datetime DEFAULT NULL,
  `orig_hours` decimal(5,2) DEFAULT NULL,
  `req_check_in` datetime NOT NULL,
  `req_check_out` datetime NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `status` enum('active','suspended','trial') NOT NULL DEFAULT 'active',
  `abn` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Australia',
  `company_type_id` tinyint(3) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `slug`, `status`, `abn`, `contact_email`, `contact_phone`, `address_line1`, `address_line2`, `city`, `state`, `postcode`, `country`, `company_type_id`, `created_at`, `updated_at`) VALUES
(1, 'xTechs', 'xtechs', 'active', '111222333', 'xtech@gmail.com', '+61433193725', 'test', 'test', 'test', 'test', '1111', 'Australia', 1, '2026-02-08 23:29:33', '2026-02-08 23:29:33'),
(2, 'Message Testing', 'message-testing', 'active', '11111111', 'message@gmail.com', '+61433193725', '40shalimar', NULL, 'Mel', 'VIC', '3175', 'Australia', 1, '2026-03-06 00:39:40', '2026-03-06 00:39:40');

-- --------------------------------------------------------

--
-- Table structure for table `company_types`
--

CREATE TABLE `company_types` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company_types`
--

INSERT INTO `company_types` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'solar_retailer', 'Solar retailer – full CRM, projects, field', '2026-02-08 23:02:47'),
(2, 'installer', 'Installer – projects and field only', '2026-02-08 23:02:47'),
(3, 'enterprise', 'Enterprise – all modules', '2026-02-08 23:02:47');

-- --------------------------------------------------------

--
-- Table structure for table `company_type_modules`
--

CREATE TABLE `company_type_modules` (
  `company_type_id` tinyint(3) UNSIGNED NOT NULL,
  `module_key` varchar(80) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company_type_modules`
--

INSERT INTO `company_type_modules` (`company_type_id`, `module_key`, `created_at`) VALUES
(1, 'attendance', '2026-02-08 23:02:47'),
(1, 'leads', '2026-02-08 23:02:47'),
(1, 'messages', '2026-02-08 23:02:47'),
(1, 'on_field', '2026-02-08 23:02:47'),
(1, 'operations', '2026-02-08 23:02:47'),
(1, 'projects', '2026-02-08 23:02:47'),
(1, 'referrals', '2026-02-08 23:02:47'),
(2, 'on_field', '2026-02-08 23:02:47'),
(2, 'operations', '2026-02-08 23:02:47'),
(2, 'projects', '2026-02-08 23:02:47'),
(3, 'attendance', '2026-02-08 23:02:47'),
(3, 'leads', '2026-02-08 23:02:47'),
(3, 'messages', '2026-02-08 23:02:47'),
(3, 'on_field', '2026-02-08 23:02:47'),
(3, 'operations', '2026-02-08 23:02:47'),
(3, 'projects', '2026-02-08 23:02:47'),
(3, 'referrals', '2026-02-08 23:02:47');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `type` enum('dm','group') NOT NULL DEFAULT 'dm',
  `name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `company_id`, `type`, `name`, `created_at`, `updated_at`) VALUES
(1, 1, 'dm', NULL, '2026-03-03 22:42:11', '2026-03-03 22:42:11'),
(2, NULL, 'dm', NULL, '2026-03-06 00:35:49', '2026-03-06 00:35:49'),
(3, 1, 'dm', NULL, '2026-03-06 04:05:09', '2026-03-06 04:05:09'),
(4, 1, 'group', 'Group Chat', '2026-03-06 04:05:18', '2026-03-06 04:05:18'),
(5, 1, 'group', 'Group Chat', '2026-03-06 04:05:26', '2026-03-06 04:05:26'),
(6, 1, 'group', 'Testing groupchat', '2026-03-09 23:23:21', '2026-03-09 23:23:21');

-- --------------------------------------------------------

--
-- Table structure for table `conversation_participants`
--

CREATE TABLE `conversation_participants` (
  `id` int(10) UNSIGNED NOT NULL,
  `conversation_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `last_read_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `conversation_participants`
--

INSERT INTO `conversation_participants` (`id`, `conversation_id`, `user_id`, `last_read_at`, `joined_at`) VALUES
(1, 1, 1, '2026-03-13 06:39:49', '2026-03-03 22:42:11'),
(2, 1, 7, NULL, '2026-03-03 22:42:11'),
(3, 2, 1, '2026-03-13 06:42:35', '2026-03-06 00:35:49'),
(4, 2, 5, '2026-03-09 23:23:26', '2026-03-06 00:35:49'),
(5, 3, 5, '2026-03-06 04:05:09', '2026-03-06 04:05:09'),
(6, 3, 7, NULL, '2026-03-06 04:05:09'),
(7, 4, 5, '2026-03-06 04:05:18', '2026-03-06 04:05:18'),
(8, 4, 7, NULL, '2026-03-06 04:05:18'),
(9, 4, 6, NULL, '2026-03-06 04:05:18'),
(10, 4, 3, NULL, '2026-03-06 04:05:18'),
(11, 5, 5, '2026-03-06 04:05:26', '2026-03-06 04:05:26'),
(12, 5, 1, '2026-03-06 04:05:30', '2026-03-06 04:05:26'),
(13, 6, 5, '2026-03-09 23:23:21', '2026-03-09 23:23:21'),
(14, 6, 7, NULL, '2026-03-09 23:23:21'),
(15, 6, 6, NULL, '2026-03-09 23:23:21'),
(16, 6, 1, NULL, '2026-03-09 23:23:21');

-- --------------------------------------------------------

--
-- Table structure for table `custom_roles`
--

CREATE TABLE `custom_roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_role_permissions`
--

CREATE TABLE `custom_role_permissions` (
  `custom_role_id` int(10) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `company_id`, `name`, `code`, `created_at`) VALUES
(1, 1, 'Electrical', 'ELE', '2026-02-24 01:48:59'),
(2, 1, 'Sales', 'SAL', '2026-02-24 01:48:59'),
(3, 1, 'Operations', 'OPS', '2026-02-24 01:48:59'),
(4, 1, 'Projects', 'PRJ', '2026-02-24 01:48:59'),
(5, 1, 'Executive', 'EXE', '2026-02-24 01:48:59');

-- --------------------------------------------------------

--
-- Table structure for table `emergency_contacts`
--

CREATE TABLE `emergency_contacts` (
  `id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `contact_name` varchar(150) NOT NULL,
  `relationship` varchar(100) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `address_line2` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `job_role_id` int(10) UNSIGNED DEFAULT NULL,
  `employment_type_id` tinyint(3) UNSIGNED DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `rate_type` enum('hourly','daily','monthly','annual') DEFAULT 'monthly',
  `rate_amount` decimal(12,2) DEFAULT 0.00,
  `status` enum('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active',
  `avatar_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `company_id`, `user_id`, `employee_code`, `first_name`, `last_name`, `date_of_birth`, `gender`, `email`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `department_id`, `job_role_id`, `employment_type_id`, `start_date`, `end_date`, `rate_type`, `rate_amount`, `status`, `avatar_url`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, '', 'Lê', 'Minh', '0000-00-00', '', 'lenguyennhutminh4@gmail.com', '123456789', '', NULL, '', NULL, NULL, '', 1, 2, 1, '2026-05-07', NULL, 'monthly', 0.00, 'active', '', '2026-02-24 03:14:31', '2026-02-24 03:14:31'),
(2, 1, 4, '', 'testing', 'testing', '0000-00-00', '', 'lenguyennhutminh44@gmail.com', '61433193725', '', '', '', '', '', '', 1, 1, 1, '2025-09-09', NULL, 'hourly', 250.00, 'active', '', '2026-02-25 00:41:49', '2026-02-25 00:41:49'),
(3, 1, 5, 'XTR-DIR-001', 'Ashley', 'Bronson', '0000-00-00', 'Male', 'ashley@xtechsrenewable.com', '123456789', '', '', '', '', '', '', 3, 7, 1, NULL, NULL, 'monthly', 0.00, 'active', '', '2026-02-27 23:52:51', '2026-02-27 23:52:51'),
(4, 1, 6, 'XTR-DIR-002', 'Liam', 'Jackman', '0000-00-00', 'Male', 'liam@xtechsrenewable.com', '', '', '', '', '', '', '', 3, 7, NULL, NULL, NULL, 'monthly', 0.00, 'active', '', '2026-02-27 23:59:10', '2026-02-27 23:59:10'),
(5, 1, 7, 'XTR-ELELEAD-001', 'Clarke', 'Dean', '0000-00-00', 'Male', 'clarke.dean123@gmail.com', '', '', '', '', '', '', '', 1, 1, 1, NULL, NULL, 'monthly', 0.00, 'active', '', '2026-02-28 00:00:48', '2026-02-28 00:01:24'),
(6, 1, 8, 'XTR-DIR-003', 'testing', 'testing', '0000-00-00', 'Male', 'lenguyennhutminh4@gmail.com', '123456789', '', '', '', '', '', '', 1, 7, 1, NULL, NULL, 'monthly', 0.00, 'active', '', '2026-02-28 16:05:42', '2026-03-01 22:49:47');

-- --------------------------------------------------------

--
-- Table structure for table `employee_attendance`
--

CREATE TABLE `employee_attendance` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `check_in_time` datetime NOT NULL,
  `check_in_lat` decimal(10,8) DEFAULT NULL,
  `check_in_lng` decimal(11,8) DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `check_out_lat` decimal(10,8) DEFAULT NULL,
  `check_out_lng` decimal(11,8) DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employee_attendance`
--

INSERT INTO `employee_attendance` (`id`, `company_id`, `employee_id`, `check_in_time`, `check_in_lat`, `check_in_lng`, `check_out_time`, `check_out_lat`, `check_out_lng`, `hours_worked`, `date`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '2026-03-13 17:02:30', -37.95678180, 145.21286424, '2026-03-13 17:02:35', -37.95678180, 145.21286424, 0.00, '2026-03-13', '2026-03-13 06:02:30', '2026-03-13 06:02:35');

-- --------------------------------------------------------

--
-- Table structure for table `employee_documents`
--

CREATE TABLE `employee_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(255) NOT NULL,
  `storage_url` text NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` bigint(20) DEFAULT NULL,
  `label` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employee_documents`
--

INSERT INTO `employee_documents` (`id`, `employee_id`, `company_id`, `filename`, `storage_url`, `mime_type`, `size_bytes`, `label`, `notes`, `uploaded_by`, `created_at`) VALUES
(1, 6, 1, 'site-inspection-1 (11) (1).pdf', '/uploads/employee-6/documents/2026/02/1772294850576-hmtlp0-site-inspection-1_(11)_(1).pdf', 'application/pdf', 22649, NULL, NULL, 1, '2026-02-28 23:07:30');

-- --------------------------------------------------------

--
-- Table structure for table `employee_qualifications`
--

CREATE TABLE `employee_qualifications` (
  `employee_id` int(10) UNSIGNED NOT NULL,
  `qualification_id` int(10) UNSIGNED NOT NULL,
  `obtained_date` date DEFAULT NULL,
  `expires_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employment_types`
--

CREATE TABLE `employment_types` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employment_types`
--

INSERT INTO `employment_types` (`id`, `name`, `created_at`) VALUES
(1, 'Full-time', '2026-02-24 01:48:59'),
(2, 'Part-time', '2026-02-24 01:48:59'),
(3, 'Contractor', '2026-02-24 01:48:59'),
(4, 'Intern', '2026-02-24 01:48:59');

-- --------------------------------------------------------

--
-- Table structure for table `expense_claims`
--

CREATE TABLE `expense_claims` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `category` enum('travel','materials','equipment','other') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `expense_date` date NOT NULL,
  `description` text NOT NULL,
  `receipt_path` varchar(500) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(6, 1, 'default', 'Default (Full)', 1, 'published', '[\"*\"]', '[]', '{\"requiredFields\":[\"inspected_at\",\"inspector_name\",\"roof_type\",\"meter_phase\",\"inverter_location\",\"msb_condition\"]}', '{\"enabledSections\":[\"core\",\"job\",\"switchboard\",\"subBoard\",\"inverter\",\"monitor\",\"roof\",\"mudmap\",\"final\"],\"stepGuards\":[{\"stepId\":\"job\",\"fields\":[\"jobDetails.licenseSelfie\"]}]}', NULL, NULL, '2026-02-23 02:24:34', '2026-02-23 02:24:34'),
(7, 1, 'Test', 'Test', 1, 'published', '[]', '[{\"id\":\"core\",\"label\":\"Core Details\",\"sections\":[{\"id\":\"core-details\",\"label\":\"Core Details\",\"fields\":[{\"key\":\"inspected_at\",\"label\":\"Inspected At\",\"type\":\"datetime\",\"required\":true},{\"key\":\"inspector_name\",\"label\":\"Inspector Name\",\"type\":\"text\",\"required\":true},{\"key\":\"roof_type\",\"label\":\"Roof Type\",\"type\":\"text\",\"placeholder\":\"Tile / Tin / Flat / ...\",\"required\":true},{\"key\":\"meter_phase\",\"label\":\"Meter Phase\",\"type\":\"select\",\"options\":[\"single\",\"three\"],\"required\":true},{\"key\":\"shading\",\"label\":\"Shading (legacy note)\",\"type\":\"text\",\"required\":false}]}]},{\"id\":\"inverter\",\"label\":\"Inverter Location\",\"sections\":[{\"id\":\"inverter-location\",\"label\":\"Inverter Location\",\"fields\":[{\"key\":\"inverterLocation.locationPhoto\",\"label\":\"Inverter location photoố\",\"type\":\"photo\",\"accept\":\"image/*,application/pdf\",\"required\":false},{\"key\":\"inverterLocation.requireACIsolator\",\"label\":\"Require AC Isolator?\",\"type\":\"select\",\"options\":[\"Yes\",\"No\"],\"required\":false},{\"key\":\"inverterLocation.mountingMethod\",\"label\":\"Mounting Method\",\"type\":\"text\",\"placeholder\":\"Wall mounted / structure / other\",\"required\":false},{\"key\":\"inverterLocation.ventilationOK\",\"label\":\"Ventilation OK?\",\"type\":\"select\",\"options\":[\"Yes\",\"No\"],\"required\":false}]}]}]', '{\"requiredFields\":[\"inspected_at\",\"inspector_name\",\"roof_type\",\"meter_phase\"]}', '{\"enabledSections\":[\"core\",\"inverter\"],\"stepGuards\":[]}', '2026-03-04 11:43:28', NULL, '2026-03-04 11:43:27', '2026-03-04 11:43:28');

-- --------------------------------------------------------

--
-- Table structure for table `job_roles`
--

CREATE TABLE `job_roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_roles`
--

INSERT INTO `job_roles` (`id`, `company_id`, `code`, `name`, `description`, `created_at`) VALUES
(1, 1, 'ELE-LEAD', 'Lead Electrician', NULL, '2026-02-24 01:48:59'),
(2, 1, 'APP', 'Apprentice', NULL, '2026-02-24 01:48:59'),
(3, 1, 'SAL-MGR', 'Sales Manager', NULL, '2026-02-24 01:48:59'),
(4, 1, 'SAL-EXE', 'Sales Executive', NULL, '2026-02-24 01:48:59'),
(5, 1, 'OPS-MGR', 'Operations Manager', NULL, '2026-02-24 01:48:59'),
(6, 1, 'PM-MGR', 'Project Manager', NULL, '2026-02-24 01:48:59'),
(7, 1, 'DIR', 'Director', NULL, '2026-02-24 01:48:59');

-- --------------------------------------------------------

--
-- Table structure for table `job_role_modules`
--

CREATE TABLE `job_role_modules` (
  `job_role_id` int(10) UNSIGNED NOT NULL,
  `module_key` varchar(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_role_modules`
--

INSERT INTO `job_role_modules` (`job_role_id`, `module_key`) VALUES
(1, 'leads'),
(1, 'on_field'),
(1, 'projects'),
(2, 'on_field'),
(2, 'projects'),
(3, 'leads'),
(3, 'messages'),
(3, 'referrals'),
(4, 'leads'),
(4, 'messages'),
(5, 'attendance'),
(5, 'on_field'),
(5, 'operations'),
(5, 'projects'),
(6, 'attendance'),
(6, 'operations'),
(6, 'projects'),
(7, 'attendance'),
(7, 'leads'),
(7, 'messages'),
(7, 'on_field'),
(7, 'operations'),
(7, 'projects'),
(7, 'referrals');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `stage` enum('new','contacted','qualified','inspection_booked','inspection_completed','proposal_sent','negotiation','closed_won','closed_lost') NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `referred_by_lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `is_won` tinyint(1) NOT NULL DEFAULT 0,
  `won_lost_at` datetime DEFAULT NULL,
  `last_activity_at` datetime DEFAULT NULL,
  `site_inspection_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `system_type` varchar(100) DEFAULT NULL,
  `house_storey` varchar(50) DEFAULT NULL,
  `roof_type` varchar(100) DEFAULT NULL,
  `meter_phase` varchar(20) DEFAULT NULL,
  `access_to_second_storey` tinyint(1) DEFAULT NULL,
  `access_to_inverter` tinyint(1) DEFAULT NULL,
  `pre_approval_reference_no` varchar(100) DEFAULT NULL,
  `energy_retailer` varchar(120) DEFAULT NULL,
  `energy_distributor` varchar(120) DEFAULT NULL,
  `solar_vic_eligibility` tinyint(1) DEFAULT NULL,
  `nmi_number` varchar(50) DEFAULT NULL,
  `meter_number` varchar(50) DEFAULT NULL,
  `contacted_at` datetime DEFAULT NULL,
  `last_inbound_email_at` datetime DEFAULT NULL,
  `last_outbound_email_at` datetime DEFAULT NULL,
  `followup_first_sent_at` datetime DEFAULT NULL,
  `followup_second_sent_at` datetime DEFAULT NULL,
  `flagged_for_review_at` datetime DEFAULT NULL,
  `auto_close_nonresponsive` tinyint(1) NOT NULL DEFAULT 0,
  `lost_reason` varchar(120) DEFAULT NULL,
  `owner_doc_last_sent_at` datetime DEFAULT NULL,
  `owner_doc_reminders_count` int(11) NOT NULL DEFAULT 0,
  `external_id` varchar(255) DEFAULT NULL,
  `marketing_payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`marketing_payload_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `last_inbound_email_at`, `last_outbound_email_at`, `followup_first_sent_at`, `followup_second_sent_at`, `flagged_for_review_at`, `auto_close_nonresponsive`, `lost_reason`, `owner_doc_last_sent_at`, `owner_doc_reminders_count`, `external_id`, `marketing_payload_json`) VALUES
(1, 'inspection_completed', 'MInwerwe', '', '', 'test', 1000.00, 550.00, 'Website', NULL, 1, 1, '2026-03-11 11:35:07', '2026-03-13 16:51:48', '2026-03-02 09:15:00', '2026-02-11 01:52:35', '2026-03-13 05:51:48', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-25 09:27:48', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-02-28 22:40:15', 23, NULL, NULL),
(24, 'new', 'Kylie Blyth', 'kylie@pcts.net.au', '0400 308 745', 'Lysterfield', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1028767', '{\"id\":1028767,\"idLeadSupplier\":2301059,\"name\":\"Kylie\",\"lastName\":\"Blyth\",\"phone\":\"0400 308 745\",\"email\":\"kylie@pcts.net.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"over $2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 10:26:00\",\"companyName\":\"\",\"address\":\"4 Regency Terrace Lysterfield\",\"latitude\":-37.9218652,\"longitude\":145.2729148,\"installationAddressLineOne\":\"4 Regency Terrace\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lysterfield\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"We have recently install a pool that has increased our most recent electricity bill quite a lot.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutKylie has verified this phone number\",\"importantNotesSplit\":\"We have recently install a pool that has increased our most recent electricity bill quite a lot.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Kylie has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: We have recently install a pool that has increased our most recent electricity bill quite a lot.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutKylie has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 2\\n\\nAddress: 4 Regency Terrace Lysterfield, Lysterfield, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.657Z\"}'),
(25, 'new', 'Stephen Patan', 'reflex.games@outlook.com', '0414 660 069', 'Wheelers Hill', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1028722', '{\"id\":1028722,\"idLeadSupplier\":2300958,\"name\":\"Stephen\",\"lastName\":\"Patan\",\"phone\":\"0414 660 069\",\"email\":\"reflex.games@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 08:50:24\",\"companyName\":\"\",\"address\":\"20 Garnett Rd Wheelers Hill\",\"latitude\":-37.9116209,\"longitude\":145.1971984,\"installationAddressLineOne\":\"20 Garnett Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wheelers Hill\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5 KW 1PH DNS-30Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutStephen has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe 5 KW 1PH DNS-30:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Stephen has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5 KW 1PH DNS-30Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutStephen has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 20 Garnett Rd Wheelers Hill, Wheelers Hill, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.674Z\"}'),
(26, 'new', 'BENJAMIN BOWEN', 'bbowen1987@gmail.com', '0449 586 684', 'Williamstown', 3.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1028626', '{\"id\":1028626,\"idLeadSupplier\":2300639,\"name\":\"BENJAMIN\",\"lastName\":\"BOWEN\",\"phone\":\"0449 586 684\",\"email\":\"bbowen1987@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"3 to 5 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-10 22:25:25\",\"companyName\":\"\",\"address\":\"123 Aitken St Williamstown\",\"latitude\":-37.8623621,\"longitude\":144.9012708,\"installationAddressLineOne\":\"123 Aitken St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Williamstown\",\"installationState\":\"VIC\",\"installationPostcode\":3016,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Small roof area, need high generation panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & backups up 3-phase appliancesBENJAMIN has verified this phone number\",\"importantNotesSplit\":\"Small roof area, need high generation panels:::This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & backups up 3-phase appliances:BENJAMIN has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Small roof area, need high generation panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & backups up 3-phase appliancesBENJAMIN has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 123 Aitken St Williamstown, Williamstown, VIC, 3016\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-11T01:00:00.678Z\"}'),
(27, 'new', 'Garry Yin', 'garry0228@gmail.com', '0434 500 238', 'Glen Waverley', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1027121', '{\"id\":1027121,\"idLeadSupplier\":2297981,\"name\":\"Garry\",\"lastName\":\"Yin\",\"phone\":\"0434 500 238\",\"email\":\"garry0228@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 18:10:24\",\"companyName\":\"\",\"address\":\"7 Joyce Ave Glen Waverley\",\"latitude\":-37.8905006,\"longitude\":145.1688366,\"installationAddressLineOne\":\"7 Joyce Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest billsGarry has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills:Garry has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Thursday 2pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest billsGarry has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 7 Joyce Ave Glen Waverley, Glen Waverley, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.682Z\"}'),
(28, 'new', 'Amanda Smith', 'ajsmith33@gmail.com', '0408 537 326', 'Heatherton', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1027114', '{\"id\":1027114,\"idLeadSupplier\":2297963,\"name\":\"Amanda\",\"lastName\":\"Smith\",\"phone\":\"0408 537 326\",\"email\":\"ajsmith33@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 17:15:08\",\"companyName\":\"\",\"address\":\"30 St Andrews Dr Heatherton\",\"latitude\":-37.9588706,\"longitude\":145.0819048,\"installationAddressLineOne\":\"30 St Andrews Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Heatherton\",\"installationState\":\"VIC\",\"installationPostcode\":3202,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primo 3.5-1 (1)Required for: Lowest billsAmanda has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius primo 3.5-1 (1):Required for: Lowest bills:Amanda has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primo 3.5-1 (1)Required for: Lowest billsAmanda has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 30 St Andrews Dr Heatherton, Heatherton, VIC, 3202\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.686Z\"}'),
(29, 'new', 'LAURENCE WALSH', 'lmwalsh8@gmail.com', '0404 098 591', 'Croydon Hills', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026990', '{\"id\":1026990,\"idLeadSupplier\":2297776,\"name\":\"LAURENCE\",\"lastName\":\"WALSH\",\"phone\":\"0404 098 591\",\"email\":\"lmwalsh8@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-07 12:15:08\",\"companyName\":\"\",\"address\":\"74 Bemboka Rd Croydon Hills\",\"latitude\":-37.7744051,\"longitude\":145.2579883,\"installationAddressLineOne\":\"74 Bemboka Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Croydon Hills\",\"installationState\":\"VIC\",\"installationPostcode\":3136,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Small to medium size battery Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableLAURENCE has verified this phone number\",\"importantNotesSplit\":\"Small to medium size battery :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:LAURENCE has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Small to medium size battery Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableLAURENCE has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 74 Bemboka Rd Croydon Hills, Croydon Hills, VIC, 3136\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.689Z\"}'),
(30, 'new', 'Hamid Rezatofighi', 'hamid.rt63@gmail.com', '0404 518 200', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026978', '{\"id\":1026978,\"idLeadSupplier\":2297756,\"name\":\"Hamid\",\"lastName\":\"Rezatofighi\",\"phone\":\"0404 518 200\",\"email\":\"hamid.rt63@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 11:45:17\",\"companyName\":\"\",\"address\":\"31 Reservoir Cres Rowville\",\"latitude\":-37.9430964,\"longitude\":145.2500245,\"installationAddressLineOne\":\"31 Reservoir Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutThis is an ORIGIN lead.Hamid has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & almost instant changeover in a blackout:This is an ORIGIN lead.:Hamid has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutThis is an ORIGIN lead.Hamid has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 31 Reservoir Cres Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.692Z\"}'),
(31, 'new', 'John Forshaw', 'lj_forshaw@hotmail.com', '0438 103 929', 'Langwarrin', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026935', '{\"id\":1026935,\"idLeadSupplier\":2297699,\"name\":\"John\",\"lastName\":\"Forshaw\",\"phone\":\"0438 103 929\",\"email\":\"lj_forshaw@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-07 10:35:08\",\"companyName\":\"\",\"address\":\"44 Lyppards Rd Langwarrin\",\"latitude\":-38.1320792,\"longitude\":145.2225177,\"installationAddressLineOne\":\"44 Lyppards Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Langwarrin\",\"installationState\":\"VIC\",\"installationPostcode\":3910,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Home back upSingle battery stack Possible to add more panels in the futureAble to handle 15kwh max draw This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutJohn has verified this phone number\",\"importantNotesSplit\":\"Home back up::Single battery stack ::Possible to add more panels in the future::Able to handle 15kwh max draw :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe:Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackout:John has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Home back upSingle battery stack Possible to add more panels in the futureAble to handle 15kwh max draw This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutJohn has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 44 Lyppards Rd Langwarrin, Langwarrin, VIC, 3910\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.696Z\"}'),
(32, 'new', 'Faye Phillips', 'fmp1257@gmail.com', '0429 964 075', 'Junction Village', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026696', '{\"id\":1026696,\"idLeadSupplier\":2297270,\"name\":\"Faye\",\"lastName\":\"Phillips\",\"phone\":\"0429 964 075\",\"email\":\"fmp1257@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Increase size of existing solar system\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-06 15:05:58\",\"companyName\":\"\",\"address\":\"7 Sherwood Rd Junction Village\",\"latitude\":-38.1366266,\"longitude\":145.2933876,\"installationAddressLineOne\":\"7 Sherwood Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Junction Village\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashFaye has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Faye has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Friday 2 in the afternoon.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"Yes\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashFaye has verified this phone number\\n\\nFeatures: Increase size of existing solar system\\n\\nHave Battery: Yes\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 7 Sherwood Rd Junction Village, Junction Village, VIC, 3977\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.702Z\"}'),
(33, 'new', 'Matthew Spears', 'matthew@spearsconstructions.com', '0417 889 008', 'Belgrave South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026692', '{\"id\":1026692,\"idLeadSupplier\":2297260,\"name\":\"Matthew\",\"lastName\":\"Spears\",\"phone\":\"0417 889 008\",\"email\":\"matthew@spearsconstructions.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 15:05:31\",\"companyName\":\"\",\"address\":\"95 Blumm Rd Belgrave South\",\"latitude\":-37.9417008,\"longitude\":145.3753348,\"installationAddressLineOne\":\"95 Blumm Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Belgrave South\",\"installationState\":\"VIC\",\"installationPostcode\":3160,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: l have X2 Fronius Primo 5.5 units So that means l have X2 MPPTRequired for: Blackout Protection, charge from solar in blackout & easily expandableMatthew has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: l have X2 Fronius Primo 5.5 units ::So that means l have X2 MPPT:::Required for: Blackout Protection, charge from solar in blackout & easily expandable:Matthew has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: l have X2 Fronius Primo 5.5 units So that means l have X2 MPPTRequired for: Blackout Protection, charge from solar in blackout & easily expandableMatthew has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 95 Blumm Rd Belgrave South, Belgrave South, VIC, 3160\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.705Z\"}'),
(34, 'new', 'Shourya Ghosh', 'ghosh.shourjyo@gmail.com', '0404 689 098', 'Narre Warren', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026567', '{\"id\":1026567,\"idLeadSupplier\":2297001,\"name\":\"Shourya\",\"lastName\":\"Ghosh\",\"phone\":\"0404 689 098\",\"email\":\"ghosh.shourjyo@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 11:25:28\",\"companyName\":\"\",\"address\":\"7-9 Denise Ct Narre Warren\",\"latitude\":-38.0081524,\"longitude\":145.3108267,\"installationAddressLineOne\":\"7-9 Denise Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & easily expandableShourya has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & easily expandable:Shourya has verified this phone number\",\"requestedQuotes\":3,\"note\":\"needs a site inspection on monday, after 12 so need to plan accordingly&#13;\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & easily expandableShourya has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 7-9 Denise Ct Narre Warren, Narre Warren, VIC, 3805\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.707Z\"}'),
(35, 'new', 'Too Choong', 'toochoong@hotmail.com', '0407 685 070', 'Lysterfield South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026509', '{\"id\":1026509,\"idLeadSupplier\":2296888,\"name\":\"Too\",\"lastName\":\"Choong\",\"phone\":\"0407 685 070\",\"email\":\"toochoong@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 09:35:14\",\"companyName\":\"\",\"address\":\"12 Forrest Hill Grove Lysterfield South\",\"latitude\":-37.9542008,\"longitude\":145.2732978,\"installationAddressLineOne\":\"12 Forrest Hill Grove\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lysterfield South\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: SMARequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutToo has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: SMA:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Too has verified this phone number\",\"requestedQuotes\":3,\"note\":\"monday, Needs in the morning\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: SMARequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutToo has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 12 Forrest Hill Grove Lysterfield South, Lysterfield South, VIC, 3156\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.709Z\"}'),
(36, 'new', 'Anthony Wong', 'anthonyandtammy1229@gmail.com', '0420 428 886', 'Doncaster East', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026431', '{\"id\":1026431,\"idLeadSupplier\":2296758,\"name\":\"Anthony\",\"lastName\":\"Wong\",\"phone\":\"0420 428 886\",\"email\":\"anthonyandtammy1229@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 01:36:01\",\"companyName\":\"\",\"address\":\"9 Rosamond Cres Doncaster East\",\"latitude\":-37.7864458,\"longitude\":145.1639926,\"installationAddressLineOne\":\"9 Rosamond Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Doncaster East\",\"installationState\":\"VIC\",\"installationPostcode\":3109,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: sofar solarRequired for: Lowest bills & charge from solar in blackoutAnthony  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: sofar solar:Required for: Lowest bills & charge from solar in blackout:Anthony  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: sofar solarRequired for: Lowest bills & charge from solar in blackoutAnthony  has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 9 Rosamond Cres Doncaster East, Doncaster East, VIC, 3109\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.713Z\"}'),
(37, 'new', 'Nenad Knezevic', 'gimmealatte@hotmail.com', '0403 216 706', 'Mooroolbark', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026390', '{\"id\":1026390,\"idLeadSupplier\":2296750,\"name\":\"Nenad\",\"lastName\":\"Knezevic\",\"phone\":\"0403 216 706\",\"email\":\"gimmealatte@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 01:35:39\",\"companyName\":\"\",\"address\":\"15 Greenbank Dr Mooroolbark\",\"latitude\":-37.7617506,\"longitude\":145.3203574,\"installationAddressLineOne\":\"15 Greenbank Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mooroolbark\",\"installationState\":\"VIC\",\"installationPostcode\":3138,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Nenad has verified this phone number\",\"importantNotesSplit\":\"There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. :This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & easily expandable:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Nenad has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Nenad has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 15 Greenbank Dr Mooroolbark, Mooroolbark, VIC, 3138\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.716Z\"}');
INSERT INTO `leads` (`id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `last_inbound_email_at`, `last_outbound_email_at`, `followup_first_sent_at`, `followup_second_sent_at`, `flagged_for_review_at`, `auto_close_nonresponsive`, `lost_reason`, `owner_doc_last_sent_at`, `owner_doc_reminders_count`, `external_id`, `marketing_payload_json`) VALUES
(38, 'new', 'Mich Eeves', 'wecanpluck@duck.com', '0430 108 325', 'Ferntree Gully', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026269', '{\"id\":1026269,\"idLeadSupplier\":2296701,\"name\":\"Mich\",\"lastName\":\"Eeves\",\"phone\":\"0430 108 325\",\"email\":\"wecanpluck@duck.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 01:20:09\",\"companyName\":\"\",\"address\":\"25 Austin St Ferntree Gully\",\"latitude\":-37.8837646,\"longitude\":145.2855883,\"installationAddressLineOne\":\"25 Austin St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ferntree Gully\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,sTaa.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & easily expandableMich has verified this phone number\",\"importantNotesSplit\":\"More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,s::Taa.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Blackout Protection & easily expandable:Mich has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Have sent him my email will share the details over the email then site inspection\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,sTaa.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & easily expandableMich has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 25 Austin St Ferntree Gully, Ferntree Gully, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.719Z\"}'),
(39, 'new', 'Jill  Tim DSouza', 'jill_krelle@yahoo.com.au', '0402 431 939', 'Heathmont', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026418', '{\"id\":1026418,\"idLeadSupplier\":2296674,\"name\":\"Jill  Tim\",\"lastName\":\"DSouza\",\"phone\":\"0402 431 939\",\"email\":\"jill_krelle@yahoo.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-05 22:20:07\",\"companyName\":\"\",\"address\":\"17-23 Marlborough Rd Heathmont\",\"latitude\":-37.8355778,\"longitude\":145.2321258,\"installationAddressLineOne\":\"17-23 Marlborough Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Heathmont\",\"installationState\":\"VIC\",\"installationPostcode\":3135,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutJill  Tim  has verified this phone number\",\"importantNotesSplit\":\"Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. :This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:Jill  Tim  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"monday, need to give a time\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutJill  Tim  has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 17-23 Marlborough Rd Heathmont, Heathmont, VIC, 3135\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T01:00:00.721Z\"}'),
(40, 'new', 'Anand Shanmugam', 'ananthsua@gmail.com', '0468 468 476', 'Berwick', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1026392', '{\"id\":1026392,\"idLeadSupplier\":2296659,\"name\":\"Anand\",\"lastName\":\"Shanmugam\",\"phone\":\"0468 468 476\",\"email\":\"ananthsua@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-05 21:15:06\",\"companyName\":\"\",\"address\":\"17 Colson Wy Berwick\",\"latitude\":-38.0483117,\"longitude\":145.324672,\"installationAddressLineOne\":\"17 Colson Wy\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Berwick\",\"installationState\":\"VIC\",\"installationPostcode\":3806,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back upsThis lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025Existing inverter type: Solax Power Network TechModel - X1-Boost-5K-G4Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Anand has verified this phone number\",\"importantNotesSplit\":\"I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back ups:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025:Existing inverter type: Solax Power Network Tech::Model - X1-Boost-5K-G4:Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Anand has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back upsThis lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025Existing inverter type: Solax Power Network TechModel - X1-Boost-5K-G4Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Anand has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 17 Colson Wy Berwick, Berwick, VIC, 3806\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.725Z\"}'),
(41, 'new', 'Jie Sun', 'dasj206@gmail.com', '0430 015 359', 'Narre Warren South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1025886', '{\"id\":1025886,\"idLeadSupplier\":2295779,\"name\":\"Jie\",\"lastName\":\"Sun\",\"phone\":\"0430 015 359\",\"email\":\"dasj206@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 18:05:24\",\"companyName\":\"\",\"address\":\"12 Fabriano Pl Narre Warren South\",\"latitude\":-38.0564402,\"longitude\":145.3194198,\"installationAddressLineOne\":\"12 Fabriano Pl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren South\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Jie has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:This is an ORIGIN lead.:Jie has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Jie has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 12 Fabriano Pl Narre Warren South, Narre Warren South, VIC, 3805\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.728Z\"}'),
(42, 'new', 'Alfredo Roldan', 'roldan.acchristian@gmail.com', '0481 242 765', 'Junction Village', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1025756', '{\"id\":1025756,\"idLeadSupplier\":2295511,\"name\":\"Alfredo\",\"lastName\":\"Roldan\",\"phone\":\"0481 242 765\",\"email\":\"roldan.acchristian@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 13:45:29\",\"companyName\":\"\",\"address\":\"49 Contata Grv Junction Village\",\"latitude\":-38.1324441,\"longitude\":145.289868,\"installationAddressLineOne\":\"49 Contata Grv\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Junction Village\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SAJ R5 series (R5-8k-S2-15)Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutAlfredo  has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: SAJ R5 series (R5-8k-S2-15):Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Alfredo  has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"sold\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SAJ R5 series (R5-8k-S2-15)Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutAlfredo  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 49 Contata Grv Junction Village, Junction Village, VIC, 3977\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.731Z\"}'),
(43, 'new', 'Jagjeet Jawalekar', 'jagjeet28@yahoo.com', '0412 480 754', 'Aspendale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1025616', '{\"id\":1025616,\"idLeadSupplier\":2295298,\"name\":\"Jagjeet\",\"lastName\":\"Jawalekar\",\"phone\":\"0412 480 754\",\"email\":\"jagjeet28@yahoo.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 10:25:13\",\"companyName\":\"\",\"address\":\"3 Carinya Ave Aspendale\",\"latitude\":-38.0196785,\"longitude\":145.1031351,\"installationAddressLineOne\":\"3 Carinya Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Aspendale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primoRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Jagjeet has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Fronius primo::Required for: Quickest payback time & almost instant changeover in a blackout::This is an ORIGIN lead.::Jagjeet has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primoRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Jagjeet has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 3 Carinya Ave Aspendale, Aspendale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.733Z\"}'),
(44, 'new', 'Edwin Yapp', 'edwin.yapp@outlook.com', '0400 150 118', 'Mont Albert North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-11 12:00:00', NULL, '2026-03-11 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1025405', '{\"id\":1025405,\"idLeadSupplier\":2295113,\"name\":\"Edwin\",\"lastName\":\"Yapp\",\"phone\":\"0400 150 118\",\"email\":\"edwin.yapp@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 01:26:00\",\"companyName\":\"\",\"address\":\"71 Box Hill Cres Mont Albert North\",\"latitude\":-37.8021916,\"longitude\":145.1152093,\"installationAddressLineOne\":\"71 Box Hill Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mont Albert North\",\"installationState\":\"VIC\",\"installationPostcode\":3129,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate)Existing inverter type: Sungrow SH5.0RSRequired for: Lowest bills & easily expandableEdwin has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate):Existing inverter type: Sungrow SH5.0RS:Required for: Lowest bills & easily expandable:Edwin has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate)Existing inverter type: Sungrow SH5.0RSRequired for: Lowest bills & easily expandableEdwin has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 71 Box Hill Cres Mont Albert North, Mont Albert North, VIC, 3129\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T01:00:00.737Z\"}'),
(45, 'new', 'Mike Tsakmakis', 'Mike.tsakmakis@gmail.com', '0430 102 602', 'Bulleen', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 11:00:00', NULL, '2026-03-12 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029258', '{\"id\":1029258,\"idLeadSupplier\":2301752,\"name\":\"Mike\",\"lastName\":\"Tsakmakis\",\"phone\":\"0430 102 602\",\"email\":\"Mike.tsakmakis@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 23:10:09\",\"companyName\":\"\",\"address\":\"4 Eama Ct Bulleen\",\"latitude\":-37.7739755,\"longitude\":145.0989954,\"installationAddressLineOne\":\"4 Eama Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bulleen\",\"installationState\":\"VIC\",\"installationPostcode\":3105,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Email only please. I won\'t be able to receive calls.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandableThis is an ORIGIN lead.Mike has verified this phone number\",\"importantNotesSplit\":\"Email only please. I won\'t be able to receive calls.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandable:This is an ORIGIN lead.:Mike has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Email only please. I won\'t be able to receive calls.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandableThis is an ORIGIN lead.Mike has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 4 Eama Ct Bulleen, Bulleen, VIC, 3105\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T00:00:00.789Z\"}'),
(46, 'new', 'Michael Lazzarini', 'lazzarinim@hotmail.com', '0414 813 111', 'Box Hill South', 15.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 11:00:00', NULL, '2026-03-12 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029095', '{\"id\":1029095,\"idLeadSupplier\":2301618,\"name\":\"Michael\",\"lastName\":\"Lazzarini\",\"phone\":\"0414 813 111\",\"email\":\"lazzarinim@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"15 to 20 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 18:25:25\",\"companyName\":\"\",\"address\":\"24 Penrose St Box Hill South\",\"latitude\":-37.8415208,\"longitude\":145.130412,\"installationAddressLineOne\":\"24 Penrose St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Box Hill South\",\"installationState\":\"VIC\",\"installationPostcode\":3128,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I have an existing 1 kw system more than 16 years.Happy to replace or whatever you recommendLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection & almost instant changeover in a blackoutMichael has verified this phone number\",\"importantNotesSplit\":\"I have an existing 1 kw system more than 16 years.::Happy to replace or whatever you recommend:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection & almost instant changeover in a blackout:Michael has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have an existing 1 kw system more than 16 years.Happy to replace or whatever you recommendLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection & almost instant changeover in a blackoutMichael has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 24 Penrose St Box Hill South, Box Hill South, VIC, 3128\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T00:00:00.817Z\"}'),
(47, 'new', 'Gloria Beggs', 'beggs72@gmail.com', '0400 685 889', 'Seaford', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 11:00:00', NULL, '2026-03-12 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029086', '{\"id\":1029086,\"idLeadSupplier\":2301603,\"name\":\"Gloria\",\"lastName\":\"Beggs\",\"phone\":\"0400 685 889\",\"email\":\"beggs72@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 18:05:06\",\"companyName\":\"\",\"address\":\"6 Mitchell St Seaford\",\"latitude\":-38.1053121,\"longitude\":145.1305864,\"installationAddressLineOne\":\"6 Mitchell St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Seaford\",\"installationState\":\"VIC\",\"installationPostcode\":3198,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Please call to talk through.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Gloria  has verified this phone number\",\"importantNotesSplit\":\"Please call to talk through.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:Gloria  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Please call to talk through.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Gloria  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 6 Mitchell St Seaford, Seaford, VIC, 3198\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-12T00:00:00.836Z\"}'),
(48, 'new', 'Gabriel Szalma', 'gabriel@acgabe.com.au', '0401 754 885', 'Emerald', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 11:00:00', NULL, '2026-03-12 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1028901', '{\"id\":1028901,\"idLeadSupplier\":2301324,\"name\":\"Gabriel\",\"lastName\":\"Szalma\",\"phone\":\"0401 754 885\",\"email\":\"gabriel@acgabe.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 13:20:16\",\"companyName\":\"\",\"address\":\"13 Holman Rd Emerald\",\"latitude\":-37.8975108,\"longitude\":145.4450303,\"installationAddressLineOne\":\"13 Holman Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Emerald\",\"installationState\":\"VIC\",\"installationPostcode\":3782,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"G\'day,I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.I have three SolarEdge HD-Wave inverters and 16 kWh of solar.Thanks,Gabe(I have 3 off solaredge HD wave inverters and 16kwh solar.)This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 3 off Solaredge 7kw hd wave Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableGabriel has verified this phone number\",\"importantNotesSplit\":\"G\'day,:::I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.:::I have three SolarEdge HD-Wave inverters and 16 kWh of solar.::Thanks,::Gabe::(I have 3 off solaredge HD wave inverters and 16kwh solar.):This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: 3 off Solaredge 7kw hd wave :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Gabriel has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: G\'day,I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.I have three SolarEdge HD-Wave inverters and 16 kWh of solar.Thanks,Gabe(I have 3 off solaredge HD wave inverters and 16kwh solar.)This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 3 off Solaredge 7kw hd wave Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableGabriel has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 13 Holman Rd Emerald, Emerald, VIC, 3782\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-12T00:00:00.845Z\"}'),
(49, 'new', 'Cathy Sage', 'cathy@sagewords.com.au', '0400 714 603', 'Kensington', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 18:00:00', NULL, '2026-03-12 07:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029653', '{\"id\":1029653,\"idLeadSupplier\":2302686,\"name\":\"Cathy\",\"lastName\":\"Sage\",\"phone\":\"0400 714 603\",\"email\":\"cathy@sagewords.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 16:30:50\",\"companyName\":\"\",\"address\":\"91 McCracken St Kensington\",\"latitude\":-37.7933281,\"longitude\":144.9279465,\"installationAddressLineOne\":\"91 McCracken St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kensington\",\"installationState\":\"VIC\",\"installationPostcode\":3031,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsCathy has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Unknown:Required for: Lowest bills:Cathy has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsCathy has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 3\\n\\nAddress: 91 McCracken St Kensington, Kensington, VIC, 3031\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-12T07:00:00.681Z\"}'),
(50, 'new', 'Sean Hearn', 'sshearn@hotmail.com', '0419 799 111', 'Bulleen', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 19:00:00', NULL, '2026-03-12 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029682', '{\"id\":1029682,\"idLeadSupplier\":2302732,\"name\":\"Sean\",\"lastName\":\"Hearn\",\"phone\":\"0419 799 111\",\"email\":\"sshearn@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 17:45:09\",\"companyName\":\"\",\"address\":\"75 Yarra Valley Blvd Bulleen\",\"latitude\":-37.760986,\"longitude\":145.0902712,\"installationAddressLineOne\":\"75 Yarra Valley Blvd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bulleen\",\"installationState\":\"VIC\",\"installationPostcode\":3105,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Would like installation before 01 May 2026 for battery rebate.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSean has verified this phone number\",\"importantNotesSplit\":\"Would like installation before 01 May 2026 for battery rebate.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Sean has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Would like installation before 01 May 2026 for battery rebate.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSean has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 75 Yarra Valley Blvd Bulleen, Bulleen, VIC, 3105\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T08:00:00.598Z\"}');
INSERT INTO `leads` (`id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `last_inbound_email_at`, `last_outbound_email_at`, `followup_first_sent_at`, `followup_second_sent_at`, `flagged_for_review_at`, `auto_close_nonresponsive`, `lost_reason`, `owner_doc_last_sent_at`, `owner_doc_reminders_count`, `external_id`, `marketing_payload_json`) VALUES
(51, 'new', 'Aiden Chan', 'kssangx5@gmail.com', '0472 760 495', 'Lyndhurst', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 21:00:00', NULL, '2026-03-12 10:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029758', '{\"id\":1029758,\"idLeadSupplier\":2302788,\"name\":\"Aiden\",\"lastName\":\"Chan\",\"phone\":\"0472 760 495\",\"email\":\"kssangx5@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-12 20:05:24\",\"companyName\":\"\",\"address\":\"21 Tea Tree Ct Lyndhurst\",\"latitude\":-38.0656147,\"longitude\":145.2488039,\"installationAddressLineOne\":\"21 Tea Tree Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lyndhurst\",\"installationState\":\"VIC\",\"installationPostcode\":3975,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashAiden has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Aiden has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashAiden has verified this phone number\\n\\nFeatures: On Grid Solar\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 21 Tea Tree Ct Lyndhurst, Lyndhurst, VIC, 3975\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T10:00:00.942Z\"}'),
(52, 'new', 'Ellen Xin', 'ellenxin7@hotmail.com', '0409 224 188', 'Kew', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 01:00:00', NULL, '2026-03-12 14:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029803', '{\"id\":1029803,\"idLeadSupplier\":2302849,\"name\":\"Ellen\",\"lastName\":\"Xin\",\"phone\":\"0409 224 188\",\"email\":\"ellenxin7@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 23:40:09\",\"companyName\":\"\",\"address\":\"33 Mont Victor Rd Kew\",\"latitude\":-37.8071891,\"longitude\":145.0576466,\"installationAddressLineOne\":\"33 Mont Victor Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kew\",\"installationState\":\"VIC\",\"installationPostcode\":3101,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"remove the old panels, and install new onesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Sunny Boy SB1700 Required for: Lowest bills & charge from solar in blackoutEllen has verified this phone number\",\"importantNotesSplit\":\"remove the old panels, and install new ones:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Sunny Boy SB1700 :Required for: Lowest bills & charge from solar in blackout:Ellen has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: remove the old panels, and install new onesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Sunny Boy SB1700 Required for: Lowest bills & charge from solar in blackoutEllen has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 33 Mont Victor Rd Kew, Kew, VIC, 3101\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T14:00:00.615Z\"}'),
(53, 'new', 'Kathryn Lowe', 'kathryn.lowe@mac.com', '0414 373 080', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 11:00:00', NULL, '2026-03-13 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029948', '{\"id\":1029948,\"idLeadSupplier\":2303208,\"name\":\"Kathryn\",\"lastName\":\"Lowe\",\"phone\":\"0414 373 080\",\"email\":\"kathryn.lowe@mac.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-13 10:05:33\",\"companyName\":\"\",\"address\":\"179 Murrindal Dr Rowville\",\"latitude\":-37.9091057,\"longitude\":145.2638734,\"installationAddressLineOne\":\"179 Murrindal Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Currently renovating and are building an extension to which we can also add solar once completed.We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableKathryn has verified this phone number\",\"importantNotesSplit\":\"Currently renovating and are building an extension to which we can also add solar once completed.::We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & easily expandable:Kathryn has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Currently renovating and are building an extension to which we can also add solar once completed.We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableKathryn has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 179 Murrindal Dr Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-13T00:00:00.812Z\"}'),
(54, 'new', 'David Kwong', 'kwongdavid@hotmail.com', '0455 451 967', 'Murrumbeena', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 11:00:00', NULL, '2026-03-13 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029708', '{\"id\":1029708,\"idLeadSupplier\":2302952,\"name\":\"David\",\"lastName\":\"Kwong\",\"phone\":\"0455 451 967\",\"email\":\"kwongdavid@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 01:45:35\",\"companyName\":\"\",\"address\":\"28 Bute St Murrumbeena\",\"latitude\":-37.8951151,\"longitude\":145.0704236,\"installationAddressLineOne\":\"28 Bute St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Murrumbeena\",\"installationState\":\"VIC\",\"installationPostcode\":3163,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & charge from solar in blackoutThis is an ORIGIN lead.David has verified this phone number\",\"importantNotesSplit\":\"Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Blackout Protection & charge from solar in blackout:This is an ORIGIN lead.:David has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & charge from solar in blackoutThis is an ORIGIN lead.David has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 28 Bute St Murrumbeena, Murrumbeena, VIC, 3163\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T00:00:00.872Z\"}'),
(55, 'new', 'Awin Stephen', 'awinstephen@gmail.com', '0432 551 768', 'Mooroolbark', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 11:00:00', NULL, '2026-03-13 00:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029706', '{\"id\":1029706,\"idLeadSupplier\":2302946,\"name\":\"Awin\",\"lastName\":\"Stephen\",\"phone\":\"0432 551 768\",\"email\":\"awinstephen@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 01:45:15\",\"companyName\":\"\",\"address\":\"5 Devon Walk Mooroolbark\",\"latitude\":-37.7745499,\"longitude\":145.3232157,\"installationAddressLineOne\":\"5 Devon Walk\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mooroolbark\",\"installationState\":\"VIC\",\"installationPostcode\":3138,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking to install before changes to rebates in MayThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW5000 MSRequired for: Quickest payback timeAwin has verified this phone number\",\"importantNotesSplit\":\"Looking to install before changes to rebates in May:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe GW5000 MS:Required for: Quickest payback time:Awin has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking to install before changes to rebates in MayThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW5000 MSRequired for: Quickest payback timeAwin has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 5 Devon Walk Mooroolbark, Mooroolbark, VIC, 3138\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T00:00:00.876Z\"}'),
(56, 'new', 'Ivan Mlinaric', 'ivanmlinaric@outlook.com', '401471415', 'Botanic Ridge', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 12:00:00', NULL, '2026-03-13 01:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1029796', '{\"id\":1029796,\"idLeadSupplier\":2303263,\"name\":\"Ivan\",\"lastName\":\"Mlinaric\",\"phone\":401471415,\"email\":\"ivanmlinaric@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 10:35:25\",\"companyName\":\"\",\"address\":\"27 Bellis Cct Botanic Ridge\",\"latitude\":-38.1441303,\"longitude\":145.2506757,\"installationAddressLineOne\":\"27 Bellis Cct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Botanic Ridge\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: froniusRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Ivan has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: fronius::Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout::This is an ORIGIN lead.:Ivan has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: froniusRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Ivan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 27 Bellis Cct Botanic Ridge, Botanic Ridge, VIC, 3977\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T01:00:00.604Z\"}'),
(57, 'closed_won', 'Glynnis Owen', 'glynnis.owen@optusnet.com.au', '0411 469 764', 'Eltham', NULL, 0.00, 'Solar Quotes', NULL, 1, 1, '2026-03-13 17:47:17', '2026-03-13 17:47:17', NULL, '2026-03-13 03:00:00', '2026-03-13 06:47:17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030082', '{\"id\":1030082,\"idLeadSupplier\":2303472,\"name\":\"Glynnis\",\"lastName\":\"Owen\",\"phone\":\"0411 469 764\",\"email\":\"glynnis.owen@optusnet.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 13:06:01\",\"companyName\":\"\",\"address\":\"9-11 Grove St Eltham\",\"latitude\":-37.7108116,\"longitude\":145.1535576,\"installationAddressLineOne\":\"9-11 Grove St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Eltham\",\"installationState\":\"VIC\",\"installationPostcode\":3095,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"We have room for the battery to be installed in our garage.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: GoodweRequired for: Quickest payback time, almost instant changeover in a blackout & easily expandableGlynnis has verified this phone number\",\"importantNotesSplit\":\"We have room for the battery to be installed in our garage.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Goodwe:Required for: Quickest payback time, almost instant changeover in a blackout & easily expandable:Glynnis has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Glynnis booked for ash between Monday 1-2pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: We have room for the battery to be installed in our garage.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: GoodweRequired for: Quickest payback time, almost instant changeover in a blackout & easily expandableGlynnis has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 9-11 Grove St Eltham, Eltham, VIC, 3095\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T03:00:00.555Z\"}'),
(58, 'inspection_completed', 'Lê Nguyễn Nhựt Minh', 'TESST@GMAIL.COM', '123456789', 'Dandenong', 50.00, 100.00, 'Facebook', NULL, 0, 0, NULL, '2026-03-13 16:51:25', '2026-03-14 17:50:00', '2026-03-13 05:48:16', '2026-03-13 05:51:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL),
(59, 'new', 'Richard Taylor', 'richjamestaylor@icloud.com', '0404 343 219', 'Elwood', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1031017', '{\"id\":1031017,\"idLeadSupplier\":2305028,\"name\":\"Richard\",\"lastName\":\"Taylor\",\"phone\":\"0404 343 219\",\"email\":\"richjamestaylor@icloud.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-15 15:05:08\",\"companyName\":\"\",\"address\":\"20 Coleridge St Elwood\",\"latitude\":-37.8811732,\"longitude\":144.992799,\"installationAddressLineOne\":\"20 Coleridge St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Elwood\",\"installationState\":\"VIC\",\"installationPostcode\":3184,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase inverters to Jinko panelsRequired for: Quickest payback timeRichard has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase inverters to Jinko panels:Required for: Quickest payback time:Richard has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase inverters to Jinko panelsRequired for: Quickest payback timeRichard has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 20 Coleridge St Elwood, Elwood, VIC, 3184\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.645Z\"}'),
(60, 'new', 'David Kirkland', 'davidkir70@gmail.com', '0410 270 084', 'Ferntree Gully', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030930', '{\"id\":1030930,\"idLeadSupplier\":2304848,\"name\":\"David\",\"lastName\":\"Kirkland\",\"phone\":\"0410 270 084\",\"email\":\"davidkir70@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-15 11:20:34\",\"companyName\":\"\",\"address\":\"18 Holme Rd Ferntree Gully\",\"latitude\":-37.8898357,\"longitude\":145.2663999,\"installationAddressLineOne\":\"18 Holme Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ferntree Gully\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solis S5-GR3P8KRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Solis S5-GR3P8K:Required for: Quickest payback time & charge from solar in blackout:David has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solis S5-GR3P8KRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 18 Holme Rd Ferntree Gully, Ferntree Gully, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.664Z\"}'),
(61, 'new', 'Neil Robinson', 'neilsrobinson15664@gmail.com', '0419 537 591', 'Eltham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030887', '{\"id\":1030887,\"idLeadSupplier\":2304796,\"name\":\"Neil\",\"lastName\":\"Robinson\",\"phone\":\"0419 537 591\",\"email\":\"neilsrobinson15664@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 09:45:25\",\"companyName\":\"\",\"address\":\"12 Balmoral Cct Eltham\",\"latitude\":-37.6950141,\"longitude\":145.1542016,\"installationAddressLineOne\":\"12 Balmoral Cct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Eltham\",\"installationState\":\"VIC\",\"installationPostcode\":3095,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableNeil has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Neil has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableNeil has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 12 Balmoral Cct Eltham, Eltham, VIC, 3095\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-15T08:00:00.668Z\"}'),
(62, 'new', 'Matthew Fayle', 'talkies_decibel.4@icloud.com', '0407 663 964', 'Ashburton', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030879', '{\"id\":1030879,\"idLeadSupplier\":2304782,\"name\":\"Matthew\",\"lastName\":\"Fayle\",\"phone\":\"0407 663 964\",\"email\":\"talkies_decibel.4@icloud.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 09:25:19\",\"companyName\":\"\",\"address\":\"12 High St Rd Ashburton\",\"latitude\":-37.8654725,\"longitude\":145.0910703,\"installationAddressLineOne\":\"12 High St Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ashburton\",\"installationState\":\"VIC\",\"installationPostcode\":3147,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Two storey townhouse with a shared roof area.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Matthew has verified this phone number\",\"importantNotesSplit\":\"Two storey townhouse with a shared roof area.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:This is an ORIGIN lead.:Matthew has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Two storey townhouse with a shared roof area.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Matthew has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 12 High St Rd Ashburton, Ashburton, VIC, 3147\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-15T08:00:00.672Z\"}'),
(63, 'new', 'Chris Wignall', 'wignall2000@gmail.com', '0419 595 145', 'Ivanhoe', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030853', '{\"id\":1030853,\"idLeadSupplier\":2304740,\"name\":\"Chris\",\"lastName\":\"Wignall\",\"phone\":\"0419 595 145\",\"email\":\"wignall2000@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Increase size of existing solar system\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-15 08:30:18\",\"companyName\":\"\",\"address\":\"22 Beatty St Ivanhoe\",\"latitude\":-37.7592294,\"longitude\":145.0425112,\"installationAddressLineOne\":\"22 Beatty St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ivanhoe\",\"installationState\":\"VIC\",\"installationPostcode\":3079,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I have an existing 2kw system and would like to increase capacity and will charge an EVLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashChris has verified this phone number\",\"importantNotesSplit\":\"I have an existing 2kw system and would like to increase capacity and will charge an EV:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Chris has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: I have an existing 2kw system and would like to increase capacity and will charge an EVLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashChris has verified this phone number\\n\\nFeatures: Increase size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 3\\n\\nAddress: 22 Beatty St Ivanhoe, Ivanhoe, VIC, 3079\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.682Z\"}'),
(64, 'new', 'Anthony Widjaja', 'anthony.widjaja@live.com', '0402 750 930', 'Knoxfield', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030829', '{\"id\":1030829,\"idLeadSupplier\":2304736,\"name\":\"Anthony\",\"lastName\":\"Widjaja\",\"phone\":\"0402 750 930\",\"email\":\"anthony.widjaja@live.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 08:30:10\",\"companyName\":\"\",\"address\":\"21 David St Knoxfield\",\"latitude\":-37.8920105,\"longitude\":145.2508811,\"installationAddressLineOne\":\"21 David St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Knoxfield\",\"installationState\":\"VIC\",\"installationPostcode\":3180,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeThis is an ORIGIN lead.Anthony has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time:This is an ORIGIN lead.:Anthony has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeThis is an ORIGIN lead.Anthony has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 21 David St Knoxfield, Knoxfield, VIC, 3180\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-15T08:00:00.688Z\"}'),
(65, 'new', 'David Nguyen', 'qkdn@me.com', '0434 382 676', 'Mont Albert', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030782', '{\"id\":1030782,\"idLeadSupplier\":2304694,\"name\":\"David\",\"lastName\":\"Nguyen\",\"phone\":\"0434 382 676\",\"email\":\"qkdn@me.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 02:05:55\",\"companyName\":\"\",\"address\":\"15 Leopold Cres Mont Albert\",\"latitude\":-37.8223209,\"longitude\":145.1034873,\"installationAddressLineOne\":\"15 Leopold Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mont Albert\",\"installationState\":\"VIC\",\"installationPostcode\":3127,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:David has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 15 Leopold Cres Mont Albert, Mont Albert, VIC, 3127\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-15T08:00:00.709Z\"}');
INSERT INTO `leads` (`id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `last_inbound_email_at`, `last_outbound_email_at`, `followup_first_sent_at`, `followup_second_sent_at`, `flagged_for_review_at`, `auto_close_nonresponsive`, `lost_reason`, `owner_doc_last_sent_at`, `owner_doc_reminders_count`, `external_id`, `marketing_payload_json`) VALUES
(66, 'new', 'Jovica Torlak', 'torlak@bigpond.com', '0400 057 584', 'Malvern East', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030705', '{\"id\":1030705,\"idLeadSupplier\":2304645,\"name\":\"Jovica\",\"lastName\":\"Torlak\",\"phone\":\"0400 057 584\",\"email\":\"torlak@bigpond.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nA home currently under construction - frame and roof completed\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-15 01:45:59\",\"companyName\":\"\",\"address\":\"76 Alma St Malvern East\",\"latitude\":-37.88021,\"longitude\":145.0774259,\"installationAddressLineOne\":\"76 Alma St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Malvern East\",\"installationState\":\"VIC\",\"installationPostcode\":3145,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashJovica has verified this phone number\",\"importantNotesSplit\":\"Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Jovica has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashJovica has verified this phone number\\n\\nFeatures: On Grid Solar\\nA home currently under construction - frame and roof completed\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 76 Alma St Malvern East, Malvern East, VIC, 3145\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-15T08:00:00.714Z\"}'),
(67, 'new', 'Sharon Song', 'sharonsong23@gmail.com', '0425 260 639', 'Burwood', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030794', '{\"id\":1030794,\"idLeadSupplier\":2304518,\"name\":\"Sharon\",\"lastName\":\"Song\",\"phone\":\"0425 260 639\",\"email\":\"sharonsong23@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-14 23:05:08\",\"companyName\":\"\",\"address\":\"16 Wattlebird Ct Burwood\",\"latitude\":-37.8427435,\"longitude\":145.1012891,\"installationAddressLineOne\":\"16 Wattlebird Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Burwood\",\"installationState\":\"VIC\",\"installationPostcode\":3125,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Sharon  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:This is an ORIGIN lead.:Sharon  has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Sharon  has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 16 Wattlebird Ct Burwood, Burwood, VIC, 3125\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.718Z\"}'),
(68, 'new', 'Neil Horvath', 'knwhorvath@gmail.com', '0449 162 020', 'Vermont South', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030746', '{\"id\":1030746,\"idLeadSupplier\":2304458,\"name\":\"Neil\",\"lastName\":\"Horvath\",\"phone\":\"0449 162 020\",\"email\":\"knwhorvath@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-14 20:45:07\",\"companyName\":\"\",\"address\":\"16 Warrington Ave Vermont South\",\"latitude\":-37.8560445,\"longitude\":145.1890334,\"installationAddressLineOne\":\"16 Warrington Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Vermont South\",\"installationState\":\"VIC\",\"installationPostcode\":3133,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panelsQuality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutNeil  has verified this phone number\",\"importantNotesSplit\":\"Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panels::Quality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackout:Neil  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panelsQuality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutNeil  has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 16 Warrington Ave Vermont South, Vermont South, VIC, 3133\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.722Z\"}'),
(69, 'new', 'Stephen Hooke', 'emailstevehooke@gmail.com', '0421 048 329', 'Nunawading', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030710', '{\"id\":1030710,\"idLeadSupplier\":2304436,\"name\":\"Stephen\",\"lastName\":\"Hooke\",\"phone\":\"0421 048 329\",\"email\":\"emailstevehooke@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 18:40:25\",\"companyName\":\"\",\"address\":\"9 Lemon Grove Nunawading\",\"latitude\":-37.8087243,\"longitude\":145.1837885,\"installationAddressLineOne\":\"9 Lemon Grove\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Nunawading\",\"installationState\":\"VIC\",\"installationPostcode\":3131,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesStephen  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliances:Stephen  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesStephen  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 9 Lemon Grove Nunawading, Nunawading, VIC, 3131\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.726Z\"}'),
(70, 'new', 'Gary Wyatt', 'gdw2964@outlook.com', '0437 257 753', 'Wantirna South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030654', '{\"id\":1030654,\"idLeadSupplier\":2304390,\"name\":\"Gary\",\"lastName\":\"Wyatt\",\"phone\":\"0437 257 753\",\"email\":\"gdw2964@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 17:05:18\",\"companyName\":\"\",\"address\":\"4 Riverpark Dr Wantirna South\",\"latitude\":-37.8728715,\"longitude\":145.2322395,\"installationAddressLineOne\":\"4 Riverpark Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wantirna South\",\"installationState\":\"VIC\",\"installationPostcode\":3152,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panelsRequired for: Blackout Protection, charge from solar in blackout & easily expandableGary has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panels::Required for: Blackout Protection, charge from solar in blackout & easily expandable::Gary has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panelsRequired for: Blackout Protection, charge from solar in blackout & easily expandableGary has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 4 Riverpark Dr Wantirna South, Wantirna South, VIC, 3152\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.731Z\"}'),
(71, 'new', 'Adriyan Hansopaheluwakan', 'nelizhu88@gmail.com', '0433 753 588', 'Narre Warren', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030641', '{\"id\":1030641,\"idLeadSupplier\":2304370,\"name\":\"Adriyan\",\"lastName\":\"Hansopaheluwakan\",\"phone\":\"0433 753 588\",\"email\":\"nelizhu88@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 16:05:06\",\"companyName\":\"\",\"address\":\"9 Wallaroo Ave Narre Warren\",\"latitude\":-38.0128613,\"longitude\":145.2977055,\"installationAddressLineOne\":\"9 Wallaroo Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I have one quote from other provider.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius 5kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAdriyan has verified this phone number\",\"importantNotesSplit\":\"I have one quote from other provider.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius 5kw:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Adriyan has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have one quote from other provider.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius 5kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAdriyan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 9 Wallaroo Ave Narre Warren, Narre Warren, VIC, 3805\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.735Z\"}'),
(72, 'new', 'Nick Matlock', 'nbm1981@hotmail.com', '0419 149 311', 'Parkdale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030639', '{\"id\":1030639,\"idLeadSupplier\":2304365,\"name\":\"Nick\",\"lastName\":\"Matlock\",\"phone\":\"0419 149 311\",\"email\":\"nbm1981@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 15:55:08\",\"companyName\":\"\",\"address\":\"6 Vialls Ave Parkdale\",\"latitude\":-37.9933106,\"longitude\":145.0855745,\"installationAddressLineOne\":\"6 Vialls Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Parkdale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sungrow SGR10T 11.4kW Solar PanelsRequired for: Quickest payback time & easily expandableNick has verified this phone number\",\"importantNotesSplit\":\"Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Sungrow SGR10T 11.4kW Solar Panels:Required for: Quickest payback time & easily expandable:Nick has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sungrow SGR10T 11.4kW Solar PanelsRequired for: Quickest payback time & easily expandableNick has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 6 Vialls Ave Parkdale, Parkdale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.739Z\"}'),
(73, 'new', 'Tuan Tran', 'tuanthi@gmail.com', '0412 020 701', 'Bayswater North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030308', '{\"id\":1030308,\"idLeadSupplier\":2303994,\"name\":\"Tuan\",\"lastName\":\"Tran\",\"phone\":\"0412 020 701\",\"email\":\"tuanthi@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 02:15:19\",\"companyName\":\"\",\"address\":\"26 Bayview Rise Bayswater North\",\"latitude\":-37.8252652,\"longitude\":145.2727398,\"installationAddressLineOne\":\"26 Bayview Rise\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bayswater North\",\"installationState\":\"VIC\",\"installationPostcode\":3153,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: FroniusRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutTuan has verified this phone number\",\"importantNotesSplit\":\"I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Tuan has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:57\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: FroniusRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutTuan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 26 Bayview Rise Bayswater North, Bayswater North, VIC, 3153\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.743Z\"}'),
(74, 'new', 'Amar Naik', 'amarnaik1@gmail.com', '0422 282 527', 'Carnegie', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030319', '{\"id\":1030319,\"idLeadSupplier\":2303979,\"name\":\"Amar\",\"lastName\":\"Naik\",\"phone\":\"0422 282 527\",\"email\":\"amarnaik1@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 02:10:53\",\"companyName\":\"\",\"address\":\"14 Frogmore Rd Carnegie\",\"latitude\":-37.8939362,\"longitude\":145.0636382,\"installationAddressLineOne\":\"14 Frogmore Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Carnegie\",\"installationState\":\"VIC\",\"installationPostcode\":3163,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW10KAU-DTRequired for: Quickest payback timeAmar has verified this phone number\",\"importantNotesSplit\":\"I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe GW10KAU-DT:Required for: Quickest payback time:Amar has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Tuesday: 10am - Amar Naik - (Carnegie)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW10KAU-DTRequired for: Quickest payback timeAmar has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 14 Frogmore Rd Carnegie, Carnegie, VIC, 3163\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.745Z\"}'),
(75, 'new', 'Gael McLeod', 'gmc0608@hotmail.com', '0405 156 849', 'Glen Iris', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030117', '{\"id\":1030117,\"idLeadSupplier\":2303884,\"name\":\"Gael\",\"lastName\":\"McLeod\",\"phone\":\"0405 156 849\",\"email\":\"gmc0608@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 01:45:27\",\"companyName\":\"\",\"address\":\"5 Airley Rd Glen Iris\",\"latitude\":-37.8536288,\"longitude\":145.0714871,\"installationAddressLineOne\":\"5 Airley Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Iris\",\"installationState\":\"VIC\",\"installationPostcode\":3146,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I already have a few quotesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutGael has verified this phone number\",\"importantNotesSplit\":\"I already have a few quotes:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:Gael has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:48\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I already have a few quotesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutGael has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 5 Airley Rd Glen Iris, Glen Iris, VIC, 3146\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.749Z\"}'),
(76, 'new', 'Katherine Hunt', 'katty54@hotmail.com', '0421 335 355', 'Kew', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030345', '{\"id\":1030345,\"idLeadSupplier\":2303764,\"name\":\"Katherine\",\"lastName\":\"Hunt\",\"phone\":\"0421 335 355\",\"email\":\"katty54@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 22:05:15\",\"companyName\":\"\",\"address\":\"53 Davis St Kew\",\"latitude\":-37.81060799999,\"longitude\":145.0463328,\"installationAddressLineOne\":\"53 Davis St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kew\",\"installationState\":\"VIC\",\"installationPostcode\":3101,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Fronius primo gen24 8.0Required for: Lowest billsThis is an ORIGIN lead.Katherine  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Fronius primo gen24 8.0:Required for: Lowest bills:This is an ORIGIN lead.:Katherine  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:45\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Fronius primo gen24 8.0Required for: Lowest billsThis is an ORIGIN lead.Katherine  has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 53 Davis St Kew, Kew, VIC, 3101\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-15T08:00:00.753Z\"}'),
(77, 'new', 'Alison Liyanage', 'alison.liyanage@gmail.com', '0431 239 184', 'Mount Waverley', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-15 19:00:00', NULL, '2026-03-15 08:00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '1030340', '{\"id\":1030340,\"idLeadSupplier\":2303761,\"name\":\"Alison\",\"lastName\":\"Liyanage\",\"phone\":\"0431 239 184\",\"email\":\"alison.liyanage@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-13 22:05:08\",\"companyName\":\"\",\"address\":\"521 Stephensons Rd Mount Waverley\",\"latitude\":-37.895313,\"longitude\":145.1246676,\"installationAddressLineOne\":\"521 Stephensons Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mount Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3149,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliancesThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Alison has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliances:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Alison has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Wednesday: 8am - Alison Liyanage - 521 Stephensons Rd , Mount Waverley\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliancesThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Alison has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 521 Stephensons Rd Mount Waverley, Mount Waverley, VIC, 3149\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-15T08:00:00.757Z\"}');

-- --------------------------------------------------------

--
-- Table structure for table `lead_communications`
--

CREATE TABLE `lead_communications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `direction` enum('outbound','inbound') NOT NULL,
  `channel` enum('email','sms','call') NOT NULL DEFAULT 'email',
  `subject` varchar(255) DEFAULT NULL,
  `body` mediumtext DEFAULT NULL,
  `automated` tinyint(1) NOT NULL DEFAULT 0,
  `provider_message_id` varchar(255) DEFAULT NULL,
  `related_message_id` varchar(255) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lead_communications`
--

INSERT INTO `lead_communications` (`id`, `lead_id`, `direction`, `channel`, `subject`, `body`, `automated`, `provider_message_id`, `related_message_id`, `sent_at`, `delivered_at`, `created_at`) VALUES
(51, 1, 'outbound', 'email', 'Lead #1 — Missing documents', '\n  <!doctype html>\n  <html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>\n    <title>Action needed: Lead #1 is missing documents</title>\n  </head>\n  <body style=\"margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#0f172a;\">\n    <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f6f9fc;\">\n      <tr><td align=\"center\" style=\"padding:24px\">\n        <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb\">\n          <tr>\n            <td style=\"background:#1A7B7B;color:#fff;padding:16px 20px;font-weight:700;font-size:16px;\">\n              XVRYTHNG — Missing document reminder\n            </td>\n          </tr>\n          <tr>\n            <td style=\"padding:20px;\">\n              <p style=\"margin:0 0 12px;\">Hi Admin,</p>\n              <p style=\"margin:0 0 12px;\">Lead <strong>#1</strong> (MInwerwe) currently has <strong>no uploaded documents</strong>.</p>\n              <p style=\"margin:0 0 12px;\">Please chase the customer and upload or mark received in the CRM so reminders stop automatically.</p>\n              <p style=\"margin:0;\">Thanks,<br/>Sales Ops</p>\n              <hr style=\"border:none;border-top:1px solid #e5e7eb;margin:20px 0\"/>\n              <p style=\"font-size:12px;color:#6b7280;margin:0;\">Automated internal reminder • This will stop when at least one document is received.</p>\n            </td>\n          </tr>\n          <tr>\n            <td style=\"padding:16px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;\">\n              © 2026 XVRYTHNG\n            </td>\n          </tr>\n        </table>\n      </td></tr>\n    </table>\n  </body></html>', 1, '15e287ee-1561-4a85-8456-10f19dc1b32b', NULL, '2026-02-28 22:40:14', NULL, '2026-02-28 22:40:14');

-- --------------------------------------------------------

--
-- Table structure for table `lead_documents`
--

CREATE TABLE `lead_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('requested','received') NOT NULL DEFAULT 'requested',
  `filename` varchar(255) DEFAULT NULL,
  `storage_url` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_notes`
--

CREATE TABLE `lead_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `follow_up_at` datetime DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_site_inspections`
--

CREATE TABLE `lead_site_inspections` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `inspector_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('draft','submitted') NOT NULL DEFAULT 'draft',
  `inspected_at` datetime DEFAULT NULL,
  `inspector_name` varchar(120) DEFAULT NULL,
  `roof_type` varchar(60) DEFAULT NULL,
  `roof_pitch_deg` decimal(5,2) DEFAULT NULL,
  `house_storey` enum('single','double','triple') DEFAULT NULL,
  `meter_phase` enum('single','three') DEFAULT NULL,
  `inverter_location` varchar(255) DEFAULT NULL,
  `msb_condition` text DEFAULT NULL,
  `shading` enum('none','light','moderate','heavy') DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `template_key` varchar(64) DEFAULT NULL,
  `template_version` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lead_site_inspections`
--

INSERT INTO `lead_site_inspections` (`id`, `lead_id`, `status`, `inspected_at`, `inspector_name`, `roof_type`, `roof_pitch_deg`, `house_storey`, `meter_phase`, `inverter_location`, `msb_condition`, `shading`, `additional_notes`, `template_key`, `template_version`, `created_at`, `updated_at`) VALUES
(2, 1, 'submitted', '2555-09-11 03:15:00', 'MInh', 'sdfFF', NULL, '', 'single', 'sdfs', 'gôd', '', '{\"_t\":\"default\",\"_v\":1,\"id\":2,\"lead_id\":1,\"status\":\"submitted\",\"inspected_at\":\"2555-09-11T03:15:00.000Z\",\"inspector_name\":\"MInh\",\"roof_type\":\"sdfFF\",\"roof_pitch_deg\":null,\"house_storey\":\"\",\"meter_phase\":\"single\",\"inverter_location\":\"sdfs\",\"msb_condition\":\"gôd\",\"shading\":\"\",\"additional_notes\":\"{\\\"_t\\\":\\\"default\\\",\\\"_v\\\":1,\\\"id\\\":2,\\\"lead_id\\\":1,\\\"status\\\":\\\"submitted\\\",\\\"inspected_at\\\":\\\"2555-09-11T13:15:00.000Z\\\",\\\"inspector_name\\\":\\\"MInh\\\",\\\"roof_type\\\":\\\"sdf\\\",\\\"roof_pitch_deg\\\":null,\\\"house_storey\\\":\\\"\\\",\\\"meter_phase\\\":\\\"single\\\",\\\"inverter_location\\\":\\\"sdfs\\\",\\\"msb_condition\\\":\\\"gôd\\\",\\\"shading\\\":\\\"\\\",\\\"additional_notes\\\":\\\"{\\\\\\\"_t\\\\\\\":\\\\\\\"default\\\\\\\",\\\\\\\"_v\\\\\\\":1,\\\\\\\"id\\\\\\\":2,\\\\\\\"lead_id\\\\\\\":1,\\\\\\\"status\\\\\\\":\\\\\\\"submitted\\\\\\\",\\\\\\\"inspected_at\\\\\\\":\\\\\\\"2555-09-11T23:15:00.000Z\\\\\\\",\\\\\\\"inspector_name\\\\\\\":\\\\\\\"MInh\\\\\\\",\\\\\\\"roof_type\\\\\\\":\\\\\\\"sdf\\\\\\\",\\\\\\\"roof_pitch_deg\\\\\\\":null,\\\\\\\"house_storey\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"meter_phase\\\\\\\":\\\\\\\"single\\\\\\\",\\\\\\\"inverter_location\\\\\\\":\\\\\\\"sdfs\\\\\\\",\\\\\\\"msb_condition\\\\\\\":\\\\\\\"gôd\\\\\\\",\\\\\\\"shading\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"additional_notes\\\\\\\":\\\\\\\"{\\\\\\\\\\\\\\\"_t\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"default\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"_v\\\\\\\\\\\\\\\":1,\\\\\\\\\\\\\\\"jobDetails\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"lifeSupportRequired\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"consumerMains\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"isMultiOccupancy\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"storey\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"inspectionCompany\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"xTechs Renewables\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"licenseSelfie\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"fullHousePhoto\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\"switchboard\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"meterNumber\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"nmi\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"isCompliant\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"phases\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"biDirectionalMeter\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"asbestosPresent\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"mainSwitchRatingAmps\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"pointOfAttachment\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"distanceTxToPOA\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"distancePOAToMSB\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"consumerMainsCableSize\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"consumerMainsCableType\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"mainsRunMethod\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"inverterToThisMSB\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"spareForSolarMainBreaker\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"spaceForSmartMeter\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"distanceInverterFromMSB\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"meterPhoto\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"neutralEarthPhoto\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"photoSwitchboardOn\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"photoSwitchboardOff\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"voltageReadingPhotos\\\\\\\\\\\\\\\":[]},\\\\\\\\\\\\\\\"subBoard\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"msbFeedsSubBoard\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"subBoardPOCPhoto\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\"inverterLocation\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"requireACIsolator\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"mountingMethod\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"ventilationOK\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"backingBoardNeeded\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"directSunlight\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"conduitRunDiscussed\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"locationPhoto\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\"batteryDetails\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"installingBattery\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\"monitoring\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"wifiAtLocation\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"strongReception\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"ethernetRunnable\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"spareRouterPort\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"wifiName\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"wifiPassword\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"distanceToEthernetPort\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\"existingSystem\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"existingSolar\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"existingBattery\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\"roofProfile\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"roofHeightMeters\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"safeAccess\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"accessMethod\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"panelCarryMethod\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"edgeProtectionRequired\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"edgeProtectionAvailable\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"edgeProtectionMeters\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"roofMaterial\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"roofConditionOK\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"section1Pitch\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"section2Pitch\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"section3Pitch\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"anchorPoints\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"skylights\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"designFits\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"tiltsRequired\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"tiltAngle\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"spareTilesAvailable\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"structureForModules\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"shadingIssues\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"dcCableRunMeters\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"dcConduitMeters\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"edgeProtectionPhoto\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"section1Photo\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"section2Photo\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"section3Photo\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\"mudMap\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"accessNotes\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"mapPhoto\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\"shading\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"electrical\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"hazards\\\\\\\\\\\\\\\":[],\\\\\\\\\\\\\\\"other\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\"recommendations\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"count\\\\\\\\\\\\\\\":0,\\\\\\\\\\\\\\\"summary\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"items\\\\\\\\\\\\\\\":[]},\\\\\\\\\\\\\\\"id\\\\\\\\\\\\\\\":2,\\\\\\\\\\\\\\\"lead_id\\\\\\\\\\\\\\\":1,\\\\\\\\\\\\\\\"status\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"draft\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"inspected_at\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"2555-09-12T09:15\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"inspector_name\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"MInh\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"roof_type\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"sdf\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"roof_pitch_deg\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"house_storey\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"meter_phase\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"single\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"inverter_location\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"sdfs\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"msb_condition\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"gôd\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"additional_notes\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"jobDetails\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"lifeSupportRequired\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"consumerMains\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"isMultiOccupancy\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"storey\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"inspectionCompany\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"xTechs Renewables\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"licenseSelfie\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"fullHousePhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"switchboard\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"meterNumber\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"nmi\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"isCompliant\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"phases\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"biDirectionalMeter\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"asbestosPresent\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"mainSwitchRatingAmps\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"pointOfAttachment\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"distanceTxToPOA\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"distancePOAToMSB\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"consumerMainsCableSize\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"consumerMainsCableType\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"mainsRunMethod\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"inverterToThisMSB\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"spareForSolarMainBreaker\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"spaceForSmartMeter\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"distanceInverterFromMSB\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"meterPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"neutralEarthPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"photoSwitchboardOn\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"photoSwitchboardOff\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"voltageReadingPhotos\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":[]},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"subBoard\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"msbFeedsSubBoard\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"subBoardPOCPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"inverterLocation\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"requireACIsolator\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"mountingMethod\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"ventilationOK\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"backingBoardNeeded\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"directSunlight\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"conduitRunDiscussed\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"locationPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"batteryDetails\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"installingBattery\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"monitoring\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"wifiAtLocation\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"strongReception\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"ethernetRunnable\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"spareRouterPort\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"wifiName\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"wifiPassword\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"distanceToEthernetPort\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"existingSystem\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"existingSolar\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"existingBattery\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"roofProfile\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"roofHeightMeters\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"safeAccess\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"accessMethod\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"panelCarryMethod\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"edgeProtectionRequired\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"edgeProtectionAvailable\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"edgeProtectionMeters\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"roofMaterial\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"roofConditionOK\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section1Pitch\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section2Pitch\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section3Pitch\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"anchorPoints\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"skylights\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"designFits\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"tiltsRequired\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"tiltAngle\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"spareTilesAvailable\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"structureForModules\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"shadingIssues\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"dcCableRunMeters\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"dcConduitMeters\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"edgeProtectionPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section1Photo\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section2Photo\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"section3Photo\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"mudMap\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"accessNotes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"mapPhoto\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":null},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"shading\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"sources\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":[],\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"other\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"electrical\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"hazards\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":[],\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"other\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"notes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"},\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"recommendations\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"count\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":0,\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"summary\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\"items\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\":[]}}\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"template_key\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"template_version\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"created_at\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"2026-02-22T17:42:34.000Z\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"updated_at\\\\\\\\\\\\\\\":null,\\\\\\\\\\\\\\\"jobDetails.licenseSelfie\\\\\\\\\\\\\\\":{\\\\\\\\\\\\\\\"filename\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"1771808864857-south-melb.jpg\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"storage_url\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"/uploads/lead-1/site-inspection/jobDetails-licenseSelfie/1771808864857-south-melb.jpg\\\\\\\\\\\\\\\",\\\\\\\\\\\\\\\"preview_data_url\\\\\\\\\\\\\\\":\\\\\\\\\\\\\\\"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/4QCqRXhpZgAASUkqAAgAAAADAA4BAgBgAAAAMgAAABoBBQABAAAAkgAAABsBBQABAAAAmgAAAAAAAABXYXJtIG1vcm5pbmcgbGlnaHQgb24gaGlnaC1yaXNlIHRvd2VycyBpbiBNZWxib3VybmUgQ0JEIGFib3ZlIFByaW5jZXMgYnJpZGdlIGFjcm9zcyBZYXJyYSByaXZlci4sAQAAAQAAACwBAAABAAAA/+EF2Gh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyI+Cgk8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgoJCTxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6SXB0YzR4bXBDb3JlPSJodHRwOi8vaXB0Yy5vcmcvc3RkL0lwdGM0eG1wQ29yZS8xLjAveG1sbnMvIiAgIHhtbG5zOkdldHR5SW1hZ2VzR0lGVD0iaHR0cDovL3htcC5nZXR0eWltYWdlcy5jb20vZ2lmdC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBsdXM9Imh0dHA6Ly9ucy51c2VwbHVzLm9yZy9sZGYveG1wLzEuMC8iICB4bWxuczppcHRjRXh0PSJodHRwOi8vaXB0Yy5vcmcvc3RkL0lwdGM0eG1wRXh0LzIwMDgtMDItMjkvIiB4bWxuczp4bXBSaWdodHM9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9yaWdodHMvIiBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iIEdldHR5SW1hZ2VzR0lGVDpBc3NldElEPSI4NzYwMjYyMjQiIHhtcFJpZ2h0czpXZWJTdGF0ZW1lbnQ9Imh0dHBzOi8vd3d3LmlzdG9ja3Bob3RvLmNvbS9sZWdhbC9saWNlbnNlLWFncmVlbWVudD91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIgcGx1czpEYXRhTWluaW5nPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3ZvY2FiL0RNSS1QUk9ISUJJVEVELUVYQ0VQVFNFQVJDSEVOR0lORUlOREVYSU5HIiA+CjxkYzpjcmVhdG9yPjxyZGY6U2VxPjxyZGY6bGk+emV0dGVyPC9yZGY6bGk+PC9yZGY6U2VxPjwvZGM6Y3JlYXRvcj48ZGM6ZGVzY3JpcHRpb24+PHJkZjpBbHQ+PHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5XYXJtIG1vcm5pbmcgbGlnaHQgb24gaGlnaC1yaXNlIHRvd2VycyBpbiBNZWxib3VybmUgQ0JEIGFib3ZlIFByaW5jZXMgYnJpZGdlIGFjcm9zcyBZYXJyYSByaXZlci48L3JkZjpsaT48L3JkZjpBbHQ+PC9kYzpkZXNjcmlwdGlvbj4KPHBsdXM6TGljZW5zb3I+PHJkZjpTZXE+PHJkZjpsaSByZGY6cGFyc2VUeXBlPSdSZXNvdXJjZSc+PHBsdXM6TGljZW5zb3JVUkw+aHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ204NzYwMjYyMjQtP3V0bV9tZWRpdW09b3JnYW5pYyZhbXA7dXRtX3NvdXJjZT1nb29nbGUmYW1wO3V0bV9jYW1wYWlnbj1pcHRjdXJsPC9wbHVzOkxpY2Vuc29yVVJMPjwvcmRmOmxpPjwvcmRmOlNlcT48L3BsdXM6TGljZW5zb3I+CgkJPC9yZGY6RGVzY3JpcHRpb24+Cgk8L3JkZjpSREY+CjwveDp4bXBtZXRhPgo8P3hwYWNrZXQgZW5kPSJ3Ij8+Cv/tAKpQaG90b3Nob3AgMy4wADhCSU0EBAAAAAAAjRwCUAAGemV0dGVyHAJ4AGBXYXJtIG1vcm5pbmcgbGlnaHQgb24gaGlnaC1yaXNlIHRvd2VycyBpbiBNZWxib3VybmUgQ0JEIGFib3ZlIFBy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', 'default', 1, '2026-02-23 00:42:34', '2026-03-13 16:51:48');
INSERT INTO `lead_site_inspections` (`id`, `lead_id`, `status`, `inspected_at`, `inspector_name`, `roof_type`, `roof_pitch_deg`, `house_storey`, `meter_phase`, `inverter_location`, `msb_condition`, `shading`, `additional_notes`, `template_key`, `template_version`, `created_at`, `updated_at`) VALUES
(3, 58, 'submitted', '2026-03-13 05:48:00', 'EQW', 'QWEEE', NULL, NULL, 'single', 'EWQ', 'EQWE', NULL, '{\"_t\":\"default\",\"_v\":1,\"inspected_at\":\"2026-03-13T05:48:00.000Z\",\"roof_type\":\"QWEEE\",\"inspector_name\":\"EQW\",\"meter_phase\":\"single\",\"inverter_location\":\"EWQ\",\"msb_condition\":\"EQWE\",\"jobDetails.fullHousePhoto\":{\"filename\":\"1773381007347-Screenshot_2026-03-11_120030.png\",\"storage_url\":\"/uploads/lead-58/site-inspection/jobDetails-fullHousePhoto/1773381007347-Screenshot_2026-03-11_120030.png\",\"preview_data_url\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAScAAACYCAYAAACmsS9VAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAzsSURBVHhe7d1fiFzXYcfx3/03/0ejlRISi5rKUCmNHEsuTo0R1CIgxRiR2hBqRSlx65BA49LI6UMgD0qhTiGkpbUotBT6pNgJiZvWhhhVyJBKDyaJ0UPsh1aSqaSotqxIq9Xszs6dO/dfH2ZntXu9O/+1e7z6fkBYnDNz8Iu+nHtm5l6rPh+kAgDDWP3ilKY9pwGgL8uyskN9LYvT0hARJQCTtjRS/YJl1eeDtBuiNE0VxbHiOFWSporjtBMpy5KIFYBhLbTDsiw5jiV74b+u4yzGabVIWbcarTRNU7XbsaIklm3ZyhfzsmxLiWUpTqVUtAnA8CxLsiQ5luRISuJEgR8oSRO5tqNcbvVIWddvzadhFMtxbBWKeUWyFSaUCMCd4dmWXCVq+YHiOJHnOnIdW5ZlLQuU7bdClcpFecWi/MQiTADuqDBJ5SeWvGJRpXJRfitUGMZK04VjpAXWbCtKg1SKaRKANeZYUt6S6rPzyrm2cp67uIOy/YQwAVgfcSr5iVTbVFbQjhXFyeIOyqZLANZTKilIpU218uLlnSTZ2RcCwFqLUymxbDmurfZCoIgTACO0k1SFYl7xwqUdcQJgjEi2bNtWFCfECYA5wiRVvphXHLNzAmAYy7a4rANgnsSyFCeJrPebEd8mANZJy/cVtAMl8e2P0AdlWZZsx1E+l1ehWMxOf2jZltSqN4gTsB7iOFajMac4irJTI3FcV5VKVY7jZKcGlqapglZLYRgqjiMlSZJ9iWzbluO48jxP+ULhAz/WnQTLkgLiBKyPev3WxMLU5biuarXN2eGB+M2mfL+ZHe6rWCypWCplh8fWnm1w5gSstZbvTzxMkhRHkVq+nx3uKY5j1eu3RgqTJPl+sxPaOM5OjY04AWssaAfZoYkZZu04jjU3Wx87lHEUddaZcKCIE7DGkgn/I15qmLUbjbkVz5VGkSSJGo257PBYOHMC1tjN6RvZoWXCKNLp07/QuXPvqNGY19RUTZ+6/xPau/fT2ZeuaMvWj2SHPmDUM6Z+JnUG1Z7lQBxYc73i9Otfv6vj3/+JqtWKHtyzS5trm3T9xrTefPMtlSslPfPMU6pWytm3LdMvTmmaaubmdHZ4Yqa2bB37U7wRD8Sv6qXD+/TwQ/v08EPP642lU1d+pKdWGgfQVxhFOv79n2j37k/qyNe/rH37HtGeB3dp//4/0Le+9eeq1Sp68cV/z75taEGrlR3q6dqpY/rGX/5Ab2UnVjHs+qsZIU5Lva4Xjl/NDgIYwenTv1C1WtEffu5AdkqS9IVDT+jdd6/q7bf/Ozs1lDAMs0OrunbqmL574lZ2uKdh1u9lzDhJl44d1UtXsqMAhnXu3Dt6cM+u7PCifD6nPbt36fz5/81ODSWOB/x07u0f6LsnPqqHfi870dvA6/cxVpweO7hf0gUd++aP9F52con3jn9l4TKw8+fomYWJM893xg533/9zHc285o1vZ94DbFCNxrw21zZlh5epbqpobn68g+yBP6F74Iv6h7//onZnx/sYeP0+xoqT9h/VCwclnf8nPbfK5d0b396nJ49dWDZ28htf6ey27tup7ZJ0/rwuSdKZUzq58Jpzl65KuqqLFyRpvx5/dOkKwMYzNVXT9Ru9D6pv3JjRVK2WHd6QxouTpL1ffVbbJV069q8rHIL/XCdek6QdOvLKaf3y7Gm9cmSHpAt69WdXpXsf1RM7JemyLl6R3rt0Wdq5o7PeO5elK2f06nlJBw9ob3ZpYIP51P2f0C/f/FV2eNH09E2dPfuWdt2/Mzs1FNse+599T5Naf/xV7j2kF47skPS6nvvmqeVzVy7rnNS59Huyc3m2fBd1jz7zeCdW/3Pxqn524oK040AnWK+d0hsXOzuqx/Y/suQ9wMa0d++nVamUdfz4vykI2svmpqdv6m//7l903/bf0o7f2b5sbliO42aHJmpS648fJ0nbnn5eR3ZKOn+hc3n2Abd3Tt0/P376HknStu2/LUk6+c9H9ep56bH9hxaCdVknXr8saYd+977McsAG9cwzT2m+6ev577ygl1/+qf7z5H/pxZf+Q9/5m3/Utm0f08VL/9dzdzUIz/OyQxM1qfUnEifpHv3x9zqXd8vce0jPHdSyndPyA3BJjx7QY+qGrXO21AnWBZ187YK084A+c+/SRYGNq1op62t/9iUdeupzsm1L71+7rmqlrGef/RN9/S++rMOHn9QPf/jKWIHKFwrZoZ52f+mvhjoYH3b91UwoTksv75bb+9enO4fmq3pEj3fndy4ckHeDJWn7449q2+0XA3eFBx74pD7/+YP606f/SE888dnFS7mHf3+PDh9+UmfPDvqVyA+yLEvF4vg/MVlJsVga+9vhXfx8BVhjMzenh77r5aAsy9LUlq3Z4RVN+p5S49xPKmvEn68AGIc9xt0q+xlm7UqlOrlP1mxblUo1OzyWyfyfARhYPpfPDk3MMGs7jqPqppocd7xP1xzX7awzRBgHQZyANVYoFscOwkoc1x36QQeO46hW2zzyGVSxWFKttnniYRJnTsD64AEHvXE/J2Cd8WiolREnAEbi0zoAxiJOAIxEnAAYiTgBMBJxAmAk4gTASMQJgJGIEwAjEScARiJOAIxEnAAYyUqH/bUhANxhV67V2TkBMBNxAmAk4gTASMQJgJGIEwAjEScARiJOAIxEnAAYiTgBMBJxAmCkif98ZcLLATDQnXqYZteVa/Xx4hRFkfxWW0E7VBzFild4QiiAjcmxbTmuo3zOU7GQkzvBR6yPHKcoijQ711TQDlUq5pXP5+R5rhybq0TgbhEnicIwUhC01fQD5XOeNlVLE4nU0HFK01RNv6X67LyqlZKqlVL2JQDuUnONpuYaTdU2lVUqFsa69BsqTmmaqjHvy28FmqpV5Xnj1xHAxhKGkWbqcyoW8qqUiyMHauBbpnR3TH4r0NYtNcIEYEWe52rrlpr8VqCm3xrrA7KB4hRFkeqz85qqVTlXAtCTY9uaqlVVn51XFEXZ6YH1LU2apppr+KpWSuyYAAzE81xVKyXNNfyRd0994xRFkYJ2yOE3gKFUKyUF7XDk3VPPOKVpKr/VVqmYz04BQF+lYl5+qz3S7qlvnNphpHw+l50CgL7y+ZzaYTT5OElSHMWcNQEYiee5iqM4OzyQnnFK01RxkvAJHYCROLatOEkmu3MaZTEAWM2wTVk1TgCwnogTACMRJwBGIk4AjEScABiJOAEwEnECYCTiBMBIxAmAkYgTACMRJwBGWvUBB2maKkkSXbs+o20f/0h2uocz+urHv6aXs8MDO6gfv/89fTY7DOBD6b33b+hjH52SbdsDP/Bg4AccAMBauwM7JwC4jZ0TgA2FOAEwEnECYCTiBMBIxAmAkYgTACMRJwBGIk4AjEScABiJOAEwEnECYCTiBMBIxAmAkYgTACMRJwBGIk4AjEScABiJOAEwEnECYCTiBMBIxAmAkYgTACMRJwBGuiPPrZtttrNDADaITaVcdqinUZ9bd0fiBABdo8aJyzoARiJOAIxEnAAYiTgBMBJxAmAk4gTASMQJgJGIEwAjEScARuobJ8e2FSdJdhgA+oqTRI7dNzMrWvVd3a+ZO66jMIyy0wDQVxhGclxHWtKUQa0aJy0s5rmOgoAf8gIYXhC05bnO0GFSvzhJUiHvqekH2WEA6KvpByrkvezwQHrGybIsua6rnOdqrtHMTgPAquYaTeU8V67rTn7nZFmWLMtSpVzQXKPJ2ROAgYRhpLlGU5VyYbEjw+oZJy0EynEcVcoFzdTn+OQOQE9xkmimPqdKuSDHGe28SYPGybZtFQt55TxX0zfr7KAArCgMI03frCvnuSoW8kPdYC6rb5y0ZPdULhVUyHu6Pn2LMygAy8w1mro+fUuFvKdyabxdk3rdQzwrTVOlaao4jhVFkZp+W+0wUqmYVz6fk+e5I3/ZCsCHT5wkCsNIQdBW0w+U81yVijm5rrsYplHj1PMe4ivpBipJEqVpqiiKFLQjhVGsJE44jwLuIo5ty3Zsea6jfO72p3LdS7lRw6RR4tTVjdTSUHXHAdwduvHJBmmcKHWNHKeubqC6fwdwd1kaqElEqWvsOK1kwssBMNAkQ7SSOxInABgXz60DYJw4SWRZA37PCQDWShQlsm2bOAEwSxBGsgb9hjgArJVmK5RtEycABgnakZIkketwWQfAIPX5luyF70wRJwBGaPhtRXEi1+1825w4AVh3QTvSzKwvZ8lPYeygzb2ZAKyfoB3p+q2mPMda3DVZliX7NzPzavg8XQXA2mv4bf1mZl6uLbmuvezmdNbVG/U0SSXXsVUrF5TPudn3A8BEBe1I9fmWojiRbXX6Y9u342RZlqwbtxppkiQKo869mCzbVrngKe+5cl2bG8gBGFucJIqiREEYab4VKl2495u3sFta6ZYr/w8LR0wRor7L6QAAAABJRU5ErkJggg==\"},\"id\":3,\"lead_id\":58,\"status\":\"submitted\",\"roof_pitch_deg\":null,\"house_storey\":null,\"shading\":null,\"additional_notes\":\"{\\\"_t\\\":\\\"default\\\",\\\"_v\\\":1,\\\"inspected_at\\\":\\\"2026-03-13T16:48\\\",\\\"roof_type\\\":\\\"QWE\\\",\\\"inspector_name\\\":\\\"EQW\\\",\\\"meter_phase\\\":\\\"single\\\",\\\"inverter_location\\\":\\\"EWQ\\\",\\\"msb_condition\\\":\\\"EQWE\\\",\\\"jobDetails.fullHousePhoto\\\":{\\\"filename\\\":\\\"1773381007347-Screenshot_2026-03-11_120030.png\\\",\\\"storage_url\\\":\\\"/uploads/lead-58/site-inspection/jobDetails-fullHousePhoto/1773381007347-Screenshot_2026-03-11_120030.png\\\",\\\"preview_data_url\\\":\\\"data:image/png;base64,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\\\"}}\",\"template_key\":\"default\",\"template_version\":1,\"created_at\":\"2026-03-13T05:50:15.000Z\",\"updated_at\":null,\"__savedTemplateKey\":\"default\",\"__savedTemplateVer\":1}', 'default', 1, '2026-03-13 16:50:15', '2026-03-13 16:51:25');

-- --------------------------------------------------------

--
-- Table structure for table `leave_balances`
--

CREATE TABLE `leave_balances` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `leave_type` enum('annual','sick','personal','unpaid') NOT NULL,
  `total_days` decimal(5,1) NOT NULL DEFAULT 0.0,
  `used_days` decimal(5,1) NOT NULL DEFAULT 0.0,
  `year` smallint(5) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `leave_type` enum('annual','sick','personal','unpaid') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days_count` decimal(5,1) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewer_note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `conversation_id` int(10) UNSIGNED NOT NULL,
  `sender_id` int(10) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `body`, `created_at`) VALUES
(1, 1, 1, 'hi', '2026-03-03 22:42:18'),
(2, 2, 1, 'Hi Ash', '2026-03-06 00:35:56'),
(3, 2, 5, 'Hi Admin', '2026-03-06 00:43:13'),
(4, 2, 5, 'Hello', '2026-03-06 00:53:13'),
(5, 2, 5, 'Hi', '2026-03-06 00:53:21'),
(6, 2, 5, 'fqwef', '2026-03-06 00:53:25'),
(7, 2, 5, 'ewrqwer', '2026-03-06 00:54:43'),
(8, 2, 5, 'Hi Ash', '2026-03-06 01:02:47'),
(9, 2, 5, 'ưqer', '2026-03-06 01:03:03'),
(10, 2, 5, 'ewqr', '2026-03-06 01:03:06'),
(11, 2, 5, 'How are you today admin ?', '2026-03-06 01:06:35'),
(12, 2, 5, 'hi', '2026-03-06 01:16:01'),
(13, 2, 5, 'Please message me', '2026-03-06 01:16:53'),
(14, 2, 5, 'Tesing', '2026-03-06 01:19:21'),
(15, 2, 5, 'hi', '2026-03-06 01:19:28'),
(16, 2, 5, 'fasd', '2026-03-06 01:20:41'),
(17, 2, 5, 'hi', '2026-03-06 01:51:18'),
(18, 2, 5, 'hi', '2026-03-06 01:51:22'),
(19, 2, 5, 'Test', '2026-03-06 01:56:26'),
(20, 2, 5, 'test', '2026-03-06 01:56:33'),
(21, 2, 5, 'test', '2026-03-06 01:56:38'),
(22, 2, 5, 'TestPopup', '2026-03-06 02:08:26'),
(23, 2, 5, 'téttpopop', '2026-03-06 02:08:52'),
(24, 2, 5, 'test', '2026-03-06 02:09:11'),
(25, 2, 5, 'tét', '2026-03-06 02:09:21'),
(26, 2, 5, 'sadf', '2026-03-06 02:09:31'),
(27, 2, 5, 'test', '2026-03-06 02:09:36'),
(28, 2, 5, 'yo', '2026-03-06 02:13:32'),
(29, 2, 5, 'yo', '2026-03-06 02:13:48'),
(30, 2, 5, 'yo', '2026-03-06 02:13:57'),
(31, 2, 5, 'yo', '2026-03-06 02:14:01'),
(32, 2, 5, 'hi', '2026-03-06 02:22:05'),
(33, 2, 5, 'test', '2026-03-06 02:24:43'),
(34, 2, 5, 'test', '2026-03-06 02:32:49'),
(35, 2, 5, 'test', '2026-03-06 02:39:47'),
(36, 2, 5, 'test', '2026-03-06 02:42:37'),
(37, 2, 5, 'testtt', '2026-03-06 02:47:13'),
(38, 2, 5, 'hi', '2026-03-06 03:09:44'),
(39, 2, 5, 'hi', '2026-03-06 03:10:06'),
(40, 2, 5, 'testing123', '2026-03-06 03:16:53'),
(41, 2, 5, 'test', '2026-03-06 03:21:40'),
(42, 2, 5, 'h', '2026-03-06 03:22:10'),
(43, 2, 5, 'test', '2026-03-06 03:26:11'),
(44, 2, 5, 'hi admin', '2026-03-06 03:32:28'),
(45, 2, 5, 'qưe', '2026-03-06 03:32:40'),
(46, 2, 5, 'fg', '2026-03-06 03:32:48'),
(47, 2, 5, 'rqwer', '2026-03-06 03:32:55'),
(48, 2, 5, 'hi', '2026-03-06 03:34:37'),
(49, 2, 5, 'hi', '2026-03-06 03:38:02'),
(50, 2, 5, 'hi', '2026-03-06 03:43:07'),
(51, 2, 5, 'hi', '2026-03-06 03:44:16'),
(52, 2, 5, 'hi', '2026-03-06 03:50:47'),
(53, 2, 1, 'hi Ashley', '2026-03-09 23:23:30'),
(54, 2, 1, '', '2026-03-13 06:37:42'),
(55, 2, 1, '', '2026-03-13 06:39:34'),
(56, 2, 1, '', '2026-03-13 06:41:20');

-- --------------------------------------------------------

--
-- Table structure for table `message_attachments`
--

CREATE TABLE `message_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `message_id` int(10) UNSIGNED NOT NULL,
  `conversation_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mimetype` varchar(100) NOT NULL,
  `storage_url` varchar(1024) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `message_attachments`
--

INSERT INTO `message_attachments` (`id`, `message_id`, `conversation_id`, `filename`, `mimetype`, `storage_url`, `created_at`) VALUES
(1, 54, 2, 'Screenshot 2026-03-11 163608.png', 'image/png', '/uploads/chats/chat_2_1_1773383862523.png', '2026-03-13 06:37:42'),
(2, 55, 2, 'Screenshot 2026-03-12 102817.png', 'image/png', '/uploads/chats/chat_2_1_1773383974581.png', '2026-03-13 06:39:34'),
(3, 56, 2, 'Screenshot 2026-03-12 102817.png', 'image/png', '/uploads/chats/chat_2_1_1773384080183.png', '2026-03-13 06:41:20');

-- --------------------------------------------------------

--
-- Table structure for table `modules`
--

CREATE TABLE `modules` (
  `key_name` varchar(80) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `modules`
--

INSERT INTO `modules` (`key_name`, `display_name`, `created_at`) VALUES
('attendance', 'Attendance', '2026-02-24 01:48:58'),
('leads', 'Leads', '2026-02-24 01:48:58'),
('messages', 'Messages', '2026-02-24 01:48:58'),
('on_field', 'On Field', '2026-02-24 01:48:58'),
('operations', 'Operations', '2026-02-24 01:48:58'),
('projects', 'Projects', '2026-02-24 01:48:58'),
('referrals', 'Referrals', '2026-02-24 01:48:58');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `resource` varchar(80) NOT NULL,
  `action` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `resource`, `action`, `description`, `created_at`) VALUES
(1, '*', '*', 'All permissions (super admin)', '2026-02-24 01:56:11'),
(2, 'overview', 'view', 'View dashboard overview', '2026-02-24 01:56:11'),
(3, 'profile', 'view', 'View own profile', '2026-02-24 01:56:11'),
(4, 'profile', 'edit', 'Edit own profile', '2026-02-24 01:56:11'),
(5, 'companies', 'view', 'List companies', '2026-02-24 01:56:11'),
(6, 'companies', 'create', 'Create company (tenant)', '2026-02-24 01:56:11'),
(7, 'leads', 'view', 'View leads', '2026-02-24 01:56:11'),
(8, 'leads', 'create', 'Create leads', '2026-02-24 01:56:11'),
(9, 'leads', 'edit', 'Edit leads', '2026-02-24 01:56:11'),
(10, 'projects', 'view', 'View projects', '2026-02-24 01:56:11'),
(11, 'projects', 'create', 'Create projects', '2026-02-24 01:56:11'),
(12, 'projects', 'edit', 'Edit projects', '2026-02-24 01:56:11'),
(13, 'on_field', 'view', 'View on-field', '2026-02-24 01:56:11'),
(14, 'on_field', 'edit', 'Edit on-field', '2026-02-24 01:56:11'),
(15, 'operations', 'view', 'View operations', '2026-02-24 01:56:11'),
(16, 'operations', 'edit', 'Edit operations', '2026-02-24 01:56:11'),
(17, 'attendance', 'view', 'View attendance', '2026-02-24 01:56:11'),
(18, 'attendance', 'edit', 'Edit attendance', '2026-02-24 01:56:11'),
(19, 'referrals', 'view', 'View referrals', '2026-02-24 01:56:11'),
(20, 'referrals', 'edit', 'Edit referrals', '2026-02-24 01:56:11'),
(21, 'messages', 'view', 'View messages', '2026-02-24 01:56:11'),
(22, 'messages', 'edit', 'Edit messages', '2026-02-24 01:56:11'),
(23, 'settings', 'view', 'View settings', '2026-02-24 01:56:11'),
(24, 'settings', 'manage', 'Manage settings', '2026-02-24 01:56:11'),
(25, 'roles', 'view', 'View roles', '2026-02-24 01:56:11'),
(26, 'roles', 'manage', 'Create/edit roles and assign permissions', '2026-02-24 01:56:11');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `stage` enum('new','pre_approval','state_rebate','design_engineering','procurement','scheduled','installation_in_progress','installation_completed','compliance_check','inspection_grid_connection','rebate_stc_claims','project_completed') NOT NULL DEFAULT 'new',
  `customer_name` varchar(150) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `expected_completion_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `lead_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `created_at`, `updated_at`, `expected_completion_date`) VALUES
(1, 1, 'pre_approval', 'MInwerwe', '', '', 'test', 1000.00, 5550.00, '2026-03-11 00:35:07', '2026-03-13 00:17:19', '2026-03-27'),
(2, 57, 'new', 'Glynnis Owen', 'glynnis.owen@optusnet.com.au', '0411 469 764', 'Eltham', NULL, 0.00, '2026-03-13 06:47:17', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `project_assignees`
--

CREATE TABLE `project_assignees` (
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_documents`
--

CREATE TABLE `project_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `filename` varchar(255) NOT NULL,
  `storage_url` varchar(1024) NOT NULL,
  `uploaded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project_documents`
--

INSERT INTO `project_documents` (`id`, `project_id`, `filename`, `storage_url`, `uploaded_by`, `created_at`) VALUES
(1, 1, '1773363743727-record-medical-history.pdf', '/uploads/project-1/1773363743727-record-medical-history.pdf', 1, '2026-03-13 01:02:23');

-- --------------------------------------------------------

--
-- Table structure for table `project_notes`
--

CREATE TABLE `project_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project_notes`
--

INSERT INTO `project_notes` (`id`, `project_id`, `body`, `created_by`, `created_at`) VALUES
(1, 1, 'ewrwerwer', 1, '2026-03-13 01:01:08');

-- --------------------------------------------------------

--
-- Table structure for table `project_schedules`
--

CREATE TABLE `project_schedules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
  `scheduled_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qualifications`
--

CREATE TABLE `qualifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `authority` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referral_bonuses`
--

CREATE TABLE `referral_bonuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `referral_lead_id` bigint(20) UNSIGNED NOT NULL,
  `bonus_amount` decimal(10,2) NOT NULL,
  `bonus_paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `created_at`) VALUES
(1, 1, '282abfb55e2d11e46ab0cd12f2a3081a033e243f0f2c87d2d8d9ff7a4ce2ad0b', '2026-02-16 06:15:30', '2026-02-09 06:15:30'),
(2, 1, 'cddac0ea852f58f2edf1f40800127ff63c502df710fa428e53a1741d338a5acb', '2026-02-16 06:22:38', '2026-02-09 06:22:38'),
(3, 1, '66a4ea7e22744959e7ea8c744ead158f5a9d35ca1857b25aa25d1400cf1677c6', '2026-02-16 06:32:31', '2026-02-09 06:32:31'),
(4, 1, '35ab502424f71295b649fafab1cd0a4a7d3a102ff68eb34c6d42b3efd2e54637', '2026-03-03 08:50:12', '2026-02-24 08:50:12'),
(5, 1, '53e4ad410a01253d7ce2edd954fe6e82affcaf94f69b9365ef0127bdf2536a43', '2026-03-03 08:51:03', '2026-02-24 08:51:03'),
(6, 1, '5ec9cdcc3613962e5ff3c67c7894dbc538087e0aa0f45e69494e2312fada9fa6', '2026-03-03 08:51:10', '2026-02-24 08:51:10'),
(7, 1, '2b5948dd86296a628a1fd13a514feda8831508593bfa3666b875e81392d06d16', '2026-03-03 08:52:45', '2026-02-24 08:52:45'),
(8, 1, '41ebabb01d866eb1941b0f3156a587d2eee6cf3ee59facc648de7a1eead64bd6', '2026-03-03 08:56:17', '2026-02-24 08:56:17'),
(9, 1, '562350b9f3dd20eebdd96dedcc39e729ca5300fbe5c01a7a65ae27f285ee87a2', '2026-03-04 07:40:27', '2026-02-25 07:40:27'),
(10, 4, 'd430a478cd5467d7043cfc2c7996c5aa4cbf95af34cc841c5fbe67d1c80e7875', '2026-03-04 07:42:06', '2026-02-25 07:42:06'),
(11, 1, 'f4feb9f58dff13788f73ca9028907adc6feaf5fda80e3cdd016819d4027a0373', '2026-03-04 07:49:58', '2026-02-25 07:49:58'),
(12, 4, 'f3fbc6b3ee5b07eadbe7358e315b5bdcc8228a95f9ad9862ee2a377fbd85f7f9', '2026-03-04 07:50:19', '2026-02-25 07:50:19'),
(13, 1, 'a1974fbab4c73d6636b14850102487149f00149bf78ec98db49134a8a48b1db3', '2026-03-04 08:31:06', '2026-02-25 08:31:06'),
(14, 4, 'b9d0b62d080755fc212e8ecd8a16b11a5313fe2410664ac24f122a8139298783', '2026-03-04 09:26:11', '2026-02-25 09:26:11'),
(15, 1, '56576ff5cbb2381a5443e6a511307c5f18630bbe2a67f99a021f9020450dcdf1', '2026-03-04 10:04:27', '2026-02-25 10:04:27'),
(16, 1, '0f8cfd82f73d60b627949395daf16e0d09a90e5c0fab002eab21a05d14a43246', '2026-03-07 06:46:18', '2026-02-28 06:46:18'),
(17, 1, 'bd0b700c543d14dbdb9f6128445c00f36883f8e78e3e9e35116cd88f50221c81', '2026-03-07 22:58:47', '2026-02-28 22:58:47'),
(19, 1, '6f885af351381812e68d21f4c936c6880190f66aed00a8676cb8d2816026994e', '2026-03-07 23:06:56', '2026-02-28 23:06:56'),
(21, 1, '63991e2f4b6417ecf0f29960e0ed526fe1a592f63f39432616ab9a17fb8124e2', '2026-03-07 23:10:25', '2026-02-28 23:10:25'),
(22, 1, '62e58beb47df1bab7ebb37173fdf3d0f96f6a66ec7b3751515d3d4df7d796560', '2026-03-09 09:45:37', '2026-03-02 09:45:37'),
(25, 8, 'ca1f949acc69d1b0daa9458e858d17a2dffb2b11edfc497f5e8e0c575adbb3a6', '2026-03-09 10:55:17', '2026-03-02 10:55:17'),
(26, 8, 'abe266de3c85d919ccc11c96dc97772e199d0e62c4748d6c52e41515e5eef059', '2026-03-09 12:19:47', '2026-03-02 12:19:47'),
(27, 1, '1704c23121afc6a23a997251d7e9f06be19b7b51d0a092be45dd513551d01604', '2026-03-10 09:41:21', '2026-03-03 09:41:21'),
(28, 1, 'e4ce83dc4af7ac654e194a75addf1757a35a701ecc9078a751a94ce17a9c7fa5', '2026-03-10 10:45:17', '2026-03-03 10:45:17'),
(29, 8, '9ee757695c55d2f2cf1fd86cdfc9fd758711eb3e7d9df70c8f90ba939d155e8a', '2026-03-10 11:09:31', '2026-03-03 11:09:31'),
(30, 1, '3da48cd3193500051a4249b011ba6bdab75ab5aa5bb8edfd59826c7d13317ce8', '2026-03-10 11:09:45', '2026-03-03 11:09:45'),
(31, 1, '43c9ffc4b7fc0d3a4212b04e7ef7582e5a4d733ece070484027bb4348df6d89f', '2026-03-10 23:28:04', '2026-03-03 23:28:05'),
(32, 1, '58471627f3a99f0890478c6a8c7587d8e3a12931332676331530bc11b7659dd0', '2026-03-11 09:09:50', '2026-03-04 09:09:50'),
(33, 1, '47805d546c5525e23231917b5a97a0cd7bef781293bf9c24a6bbc1f7383db147', '2026-03-12 12:07:41', '2026-03-05 12:07:41'),
(34, 1, '5edb5679ebf490c581af4d2c9ed2c387f7429eae4572fda29aa7f2f51558b8e5', '2026-03-13 11:35:21', '2026-03-06 11:35:21'),
(35, 7, '897da578bf616eb7cf5b2b7a65114b52ca1863c2ed8134bb1835cbbeb84ac1c0', '2026-03-13 11:38:10', '2026-03-06 11:38:10'),
(36, 1, 'afa49995d4e03d20e61782d75a1250dd4a6cc01da55947df4f17bd3cf4d19473', '2026-03-13 11:38:34', '2026-03-06 11:38:34'),
(37, 5, 'cbcbbacf5fdccff219e22ad0803acdde5e106e6c4a46ad1a72bdb449a56b28be', '2026-03-13 11:41:45', '2026-03-06 11:41:45'),
(38, 5, '57ddd596733a2d6b264310982287240b2ff7716c70e4ed7ca6afca4173a8ced8', '2026-03-13 11:42:33', '2026-03-06 11:42:33'),
(39, 1, 'eb26a5cb5bf2e1b912f533a0bbca3da5549ebc00da137086deff506d6a94e754', '2026-03-13 11:43:02', '2026-03-06 11:43:02'),
(40, 1, 'bc38ab3306c4d0b07d9cb9146c90208d86eccd6d770e1f83def6d2ce5b2408de', '2026-03-17 10:02:10', '2026-03-10 10:02:10'),
(41, 5, '52ab8ba7d6c51247164a5f0a2057c7e81ed9c7ac00db4bad5f358eff20ec3fd7', '2026-03-17 10:21:29', '2026-03-10 10:21:29'),
(42, 1, '3aee07cd1db1f9bc07595666e51eb1692d3ad909e011b5448e2df3f8d7896314', '2026-03-18 10:26:02', '2026-03-11 10:26:02'),
(43, 1, 'f248fefbeb9b9b535f73381db693c3ea88584e5babcafde6c138ae68b09e2991', '2026-03-19 10:41:08', '2026-03-12 10:41:08'),
(44, 1, 'f386422fdd02271e4db514a67de4d16e3cb805d7835eea8cc066a5c0188fadee', '2026-03-19 22:03:02', '2026-03-12 22:03:02'),
(45, 1, '690ea143b54f2023c86c639b1a0d04717696220dc83aafb268c3c66e14c015a7', '2026-03-19 22:11:05', '2026-03-12 22:11:05'),
(46, 1, 'ef01b489677f8d8d4bf36662572a0ac8091a95d0929f9d7f99d6ca0dbc44776c', '2026-03-20 00:20:41', '2026-03-13 00:20:41'),
(47, 1, '96e4e38ac5b572a3c62d64c13ca78593099f38f2f6eeabab301515b635b6d980', '2026-03-20 11:04:34', '2026-03-13 11:04:34'),
(48, 5, 'dcd9227f4f05df0642be0ab33d628487f8d7b228beb839860e9748b7e417b0ff', '2026-03-20 17:02:01', '2026-03-13 17:02:01'),
(49, 1, '67ba973276c8c2709aa338a638c75989bbd5e46de269d4457013ee7244c2c555', '2026-03-22 18:08:30', '2026-03-15 18:08:30');

-- --------------------------------------------------------

--
-- Table structure for table `retailer_projects`
--

CREATE TABLE `retailer_projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
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
  `lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expected_completion_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `retailer_projects`
--

INSERT INTO `retailer_projects` (`id`, `company_id`, `code`, `job_type`, `stage`, `customer_name`, `customer_email`, `customer_contact`, `address`, `location_url`, `client_type`, `client_name`, `system_type`, `suburb`, `system_size_kw`, `house_storey`, `roof_type`, `meter_phase`, `access_to_two_storey`, `access_to_inverter`, `value_amount`, `lead_id`, `notes`, `created_at`, `updated_at`, `expected_completion_date`) VALUES
(1, 1, 'PRJ-01', 'stage_one', 'ces_certificate_received', 'tét', NULL, NULL, 'Burrows Ave', NULL, NULL, NULL, NULL, 'Dandenong', 1000.00, NULL, NULL, NULL, NULL, NULL, 50.00, NULL, NULL, '2026-03-12 11:46:45', '2026-03-13 12:27:50', NULL),
(2, 1, 'PRJ-02', 'site_inspection', 'scheduled', 'Lê Nguyễn Nhựt Minh', 'test@gmail.com', '0433193725', 'Burrows Ave', NULL, 'Commercial', 'rewqr', 'Solar PV', NULL, 50.00, 'Single', 'Tile', 'Two Phase', 'No', 'Yes', 500.00, NULL, NULL, '2026-03-12 12:06:36', '2026-03-12 15:05:01', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `retailer_project_assignees`
--

CREATE TABLE `retailer_project_assignees` (
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `retailer_project_assignees`
--

INSERT INTO `retailer_project_assignees` (`project_id`, `employee_id`, `company_id`, `assigned_at`, `assigned_by`) VALUES
(2, 4, 1, '2026-03-12 13:47:01', 1),
(2, 5, 1, '2026-03-12 13:47:01', 1),
(2, 6, 1, '2026-03-12 13:47:01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `retailer_project_documents`
--

CREATE TABLE `retailer_project_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `filename` varchar(255) NOT NULL,
  `storage_url` varchar(1024) NOT NULL,
  `uploaded_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `retailer_project_notes`
--

CREATE TABLE `retailer_project_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `body` text NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `retailer_project_schedules`
--

CREATE TABLE `retailer_project_schedules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `job_type` enum('site_inspection','stage_one','stage_two','full_system') NOT NULL,
  `scheduled_date` date NOT NULL,
  `scheduled_time` time DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `retailer_project_schedules`
--

INSERT INTO `retailer_project_schedules` (`id`, `company_id`, `project_id`, `job_type`, `scheduled_date`, `scheduled_time`, `scheduled_at`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'site_inspection', '2026-03-14', '05:00:00', '2026-03-15 13:00:00', NULL, 1, 1, '2026-03-12 12:06:36', '2026-03-13 00:30:50'),
(10, 1, 1, 'stage_one', '2026-03-17', NULL, '2026-03-17 13:00:00', NULL, 1, 1, '2026-03-13 12:27:39', '2026-03-13 12:27:50');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'super_admin', 'Platform-wide admin', '2026-02-08 23:02:28'),
(2, 'company_admin', 'Company-level admin', '2026-02-08 23:02:28'),
(3, 'manager', 'Team/region manager', '2026-02-08 23:02:28'),
(4, 'field_agent', 'Field operations', '2026-02-08 23:02:28');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES
(1, 1, '2026-02-24 01:56:11'),
(2, 2, '2026-02-24 01:56:11'),
(2, 3, '2026-02-24 01:56:11'),
(2, 4, '2026-02-24 01:56:11'),
(2, 7, '2026-02-24 01:56:11'),
(2, 8, '2026-02-24 01:56:11'),
(2, 9, '2026-02-24 01:56:11'),
(2, 10, '2026-02-24 01:56:11'),
(2, 11, '2026-02-24 01:56:11'),
(2, 12, '2026-02-24 01:56:11'),
(2, 13, '2026-02-24 01:56:11'),
(2, 14, '2026-02-24 01:56:11'),
(2, 15, '2026-02-24 01:56:11'),
(2, 16, '2026-02-24 01:56:11'),
(2, 17, '2026-02-24 01:56:11'),
(2, 18, '2026-02-24 01:56:11'),
(2, 19, '2026-02-24 01:56:11'),
(2, 20, '2026-02-24 01:56:11'),
(2, 21, '2026-02-24 01:56:11'),
(2, 22, '2026-02-24 01:56:11'),
(2, 23, '2026-02-24 01:56:11'),
(2, 24, '2026-02-24 01:56:11'),
(2, 25, '2026-02-24 01:56:11'),
(2, 26, '2026-02-24 01:56:11'),
(3, 2, '2026-02-24 01:56:11'),
(3, 3, '2026-02-24 01:56:11'),
(3, 4, '2026-02-24 01:56:11'),
(3, 7, '2026-02-24 01:56:11'),
(3, 8, '2026-02-24 01:56:11'),
(3, 9, '2026-02-24 01:56:11'),
(3, 10, '2026-02-24 01:56:11'),
(3, 11, '2026-02-24 01:56:11'),
(3, 12, '2026-02-24 01:56:11'),
(3, 13, '2026-02-24 01:56:11'),
(3, 14, '2026-02-24 01:56:11'),
(3, 15, '2026-02-24 01:56:11'),
(3, 17, '2026-02-24 01:56:11'),
(3, 18, '2026-02-24 01:56:11'),
(3, 19, '2026-02-24 01:56:11'),
(3, 21, '2026-02-24 01:56:11'),
(3, 22, '2026-02-24 01:56:11'),
(3, 23, '2026-02-24 01:56:11'),
(4, 2, '2026-02-24 01:56:11'),
(4, 3, '2026-02-24 01:56:11'),
(4, 4, '2026-02-24 01:56:11'),
(4, 7, '2026-02-25 01:43:37'),
(4, 10, '2026-02-24 01:56:11'),
(4, 13, '2026-02-24 01:56:11'),
(4, 14, '2026-02-24 01:56:11'),
(4, 17, '2026-02-24 01:56:11'),
(4, 18, '2026-02-24 01:56:11'),
(4, 21, '2026-02-24 01:56:11'),
(4, 22, '2026-02-24 01:56:11');

-- --------------------------------------------------------

--
-- Table structure for table `schema_migrations`
--

CREATE TABLE `schema_migrations` (
  `version` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `executed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `duration_ms` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schema_migrations`
--

INSERT INTO `schema_migrations` (`version`, `description`, `executed_at`, `duration_ms`) VALUES
('V001__multi_tenant', 'Company types, modules, and tenant columns', '2026-03-12 10:40:44', 5321),
('V002__rbac', 'Permissions, role_permissions, custom_roles', '2026-03-12 10:40:44', 116),
('V003__user_profile', 'User profile and notification columns', '2026-03-12 10:40:44', 493),
('V004__solarquotes', 'External ID and marketing payload on leads', '2026-03-12 10:40:45', 1071),
('V005__attendance', 'Employee attendance table', '2026-03-12 10:40:45', 96),
('V006__attendance_edit_requests', 'Attendance edit request table', '2026-03-12 10:40:45', 19),
('V007__leave', 'Leave balances and requests', '2026-03-12 10:40:46', 63),
('V008__expenses', 'Expense claims table', '2026-03-12 10:40:46', 90);

-- --------------------------------------------------------

--
-- Table structure for table `trial_users`
--

CREATE TABLE `trial_users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `trial_users`
--

INSERT INTO `trial_users` (`id`, `name`, `phone`, `email`, `created_at`, `updated_at`) VALUES
(1, 'Lê Nguyễn Nhựt Minh', '+61433193725', 'lenguyennhutminh4@gmail.com', '2026-03-04 00:14:17', '2026-03-04 00:14:17'),
(2, 'abcxyz', '123456789', 'test123@gmail.com', '2026-03-04 09:10:45', '2026-03-04 09:10:45'),
(3, 'tes', '123456789', '1@gmail.com', '2026-03-04 09:12:16', '2026-03-04 09:12:16'),
(4, 'qwer', '123456789', '123@gmail.com', '2026-03-04 09:12:40', '2026-03-04 09:12:40'),
(5, 'test', '123456789', 'testing@gmail.com', '2026-03-04 09:15:57', '2026-03-04 09:15:57');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `role_id` tinyint(3) UNSIGNED NOT NULL,
  `custom_role_id` int(10) UNSIGNED DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `abn` varchar(32) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `failed_attempts` int(11) NOT NULL DEFAULT 0,
  `lock_until` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `notify_email` tinyint(1) NOT NULL DEFAULT 1,
  `notify_sms` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `company_id`, `role_id`, `custom_role_id`, `email`, `password_hash`, `name`, `phone`, `abn`, `image_url`, `status`, `must_change_password`, `last_login_at`, `created_at`, `updated_at`, `failed_attempts`, `lock_until`, `password_changed_at`, `department`, `notify_email`, `notify_sms`) VALUES
(1, 1, 1, NULL, 'admin@xvrythng.com', '$2a$12$1PNIXU4FIwJ3KTad78XF3u8L5RTyJJUlMQVK7HiktoJaqDWF1SIiK', 'Super Admin', NULL, NULL, NULL, 'active', 0, '2026-03-15 07:08:30', '2026-02-08 23:02:54', '2026-03-15 07:08:30', 0, NULL, NULL, NULL, 1, 0),
(3, 1, 2, NULL, 'testing@gmail.com', '$2a$12$52tn2JaM92vJSUv.UFr5Welem9tqV4H74y9pgQdqhnpPzCI2x0es.', 'Nguyen Le', NULL, NULL, NULL, 'active', 0, NULL, '2026-02-08 23:29:33', '2026-02-08 23:29:33', 0, NULL, NULL, NULL, 1, 0),
(4, 1, 4, NULL, 'lenguyennhutminh44@gmail.com', '$2a$10$TBJzo/2PmK.9/HoZWV2s8e49/FhtHlLTrpnMnWT7o9EU1ZV8IK4h2', 'testing testing', NULL, NULL, NULL, 'active', 0, '2026-02-25 02:26:11', '2026-02-25 00:41:49', '2026-02-25 02:26:11', 0, NULL, NULL, NULL, 1, 0),
(5, 1, 4, NULL, 'ashley@xtechsrenewable.com', '$2a$10$0jE4EKMHuIEcKfYpE/DQXe3jjz9xqg3f5nj049xnv8PImY2ctuIYq', 'Ashley Bronson', NULL, NULL, NULL, 'active', 0, '2026-03-13 06:02:01', '2026-02-27 23:52:51', '2026-03-13 06:02:01', 0, NULL, NULL, NULL, 1, 0),
(6, 1, 4, NULL, 'liam@xtechsrenewable.com', '$2a$10$TCPo.yS7xizvaxh4sxkZ.O867bteeqGRzhkWowahSDl9LgP5kWb0a', 'Liam Jackman', NULL, NULL, NULL, 'active', 1, NULL, '2026-02-27 23:59:10', '2026-02-27 23:59:10', 0, NULL, NULL, NULL, 1, 0),
(7, 1, 4, NULL, 'clarke.dean123@gmail.com', '$2a$10$eJwpVMcBYOnlNlKz4yz.fuEHJb5VXGPTrp1S3foOj.kRqeo2hOHam', 'Clarke Dean', NULL, NULL, NULL, 'active', 1, '2026-03-06 00:38:10', '2026-02-28 00:00:48', '2026-03-06 00:38:10', 0, NULL, NULL, NULL, 1, 0),
(8, 1, 4, NULL, 'lenguyennhutminh4@gmail.com', '$2a$10$rJwI7S.QbAhssEbvnV2EKOZrKZ8MkDS7f/G43w26tbGumoOkz56xO', 'testing testing', NULL, NULL, NULL, 'active', 0, '2026-03-03 00:09:31', '2026-02-28 16:05:42', '2026-03-03 00:09:31', 0, NULL, '2026-03-02 10:54:51', NULL, 1, 0),
(9, 2, 2, NULL, 'message@gmail.com', '$2a$12$GAbG7bCla6kd88X1wiEf1uZpgWWO/tlbP82bDV3WyTh.eSr2Cryra', 'Message', NULL, NULL, NULL, 'active', 0, NULL, '2026-03-06 00:39:40', '2026-03-06 00:39:40', 0, NULL, NULL, NULL, 1, 0);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_role_access_preview`
-- (See below for the actual view)
--
CREATE TABLE `v_role_access_preview` (
`company_id` int(10) unsigned
,`job_role_id` int(10) unsigned
,`job_role_code` varchar(50)
,`module_key` varchar(80)
,`display_name` varchar(150)
);

-- --------------------------------------------------------

--
-- Structure for view `v_role_access_preview`
--
DROP TABLE IF EXISTS `v_role_access_preview`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_role_access_preview`  AS SELECT `c`.`id` AS `company_id`, `jr`.`id` AS `job_role_id`, `jr`.`code` AS `job_role_code`, `m`.`key_name` AS `module_key`, `m`.`display_name` AS `display_name` FROM ((((`companies` `c` join `job_roles` `jr` on(`jr`.`company_id` = `c`.`id`)) join `job_role_modules` `jrm` on(`jrm`.`job_role_id` = `jr`.`id`)) join `modules` `m` on(`m`.`key_name` = `jrm`.`module_key`)) join `company_type_modules` `ctm` on(`ctm`.`company_type_id` = `c`.`company_type_id` and `ctm`.`module_key` = `jrm`.`module_key`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance_edit_requests`
--
ALTER TABLE `attendance_edit_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `idx_employee` (`employee_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_companies_slug` (`slug`),
  ADD KEY `idx_companies_status` (`status`),
  ADD KEY `fk_companies_type` (`company_type_id`);

--
-- Indexes for table `company_types`
--
ALTER TABLE `company_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_company_types_name` (`name`);

--
-- Indexes for table `company_type_modules`
--
ALTER TABLE `company_type_modules`
  ADD PRIMARY KEY (`company_type_id`,`module_key`),
  ADD KEY `idx_ctm_module` (`module_key`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversations_company` (`company_id`);

--
-- Indexes for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_conv_participant` (`conversation_id`,`user_id`),
  ADD KEY `idx_conv_participants_user` (`user_id`);

--
-- Indexes for table `custom_roles`
--
ALTER TABLE `custom_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_custom_role_company_name` (`company_id`,`name`),
  ADD KEY `idx_custom_roles_company` (`company_id`);

--
-- Indexes for table `custom_role_permissions`
--
ALTER TABLE `custom_role_permissions`
  ADD PRIMARY KEY (`custom_role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_dept_company_name` (`company_id`,`name`);

--
-- Indexes for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_emg_emp` (`employee_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_emp_user` (`user_id`),
  ADD KEY `fk_emp_emptype` (`employment_type_id`),
  ADD KEY `idx_emp_company` (`company_id`),
  ADD KEY `idx_emp_dept` (`department_id`),
  ADD KEY `idx_emp_jobrole` (`job_role_id`),
  ADD KEY `idx_emp_status` (`status`);

--
-- Indexes for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_emp_attendance_company` (`company_id`),
  ADD KEY `idx_emp_attendance_employee` (`employee_id`),
  ADD KEY `idx_emp_attendance_date` (`date`);

--
-- Indexes for table `employee_documents`
--
ALTER TABLE `employee_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_empdoc_employee` (`employee_id`),
  ADD KEY `idx_empdoc_company` (`company_id`);

--
-- Indexes for table `employee_qualifications`
--
ALTER TABLE `employee_qualifications`
  ADD PRIMARY KEY (`employee_id`,`qualification_id`),
  ADD KEY `fk_eq_qual` (`qualification_id`);

--
-- Indexes for table `employment_types`
--
ALTER TABLE `employment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `expense_claims`
--
ALTER TABLE `expense_claims`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `idx_employee` (`employee_id`),
  ADD KEY `idx_project` (`project_name`);

--
-- Indexes for table `inspection_templates`
--
ALTER TABLE `inspection_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_template_version` (`company_id`,`key`,`version`);

--
-- Indexes for table `job_roles`
--
ALTER TABLE `job_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_jobrole_company_code` (`company_id`,`code`);

--
-- Indexes for table `job_role_modules`
--
ALTER TABLE `job_role_modules`
  ADD PRIMARY KEY (`job_role_id`,`module_key`),
  ADD KEY `fk_jrm_module` (`module_key`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_leads_board` (`stage`,`updated_at`),
  ADD KEY `idx_leads_stage_count` (`stage`),
  ADD KEY `idx_leads_value` (`value_amount`),
  ADD KEY `idx_leads_text` (`customer_name`),
  ADD KEY `idx_leads_suburb` (`suburb`),
  ADD KEY `idx_leads_site_inspection_date` (`site_inspection_date`),
  ADD KEY `idx_leads_external_id` (`external_id`),
  ADD KEY `idx_leads_referred_by` (`referred_by_lead_id`);

--
-- Indexes for table `lead_communications`
--
ALTER TABLE `lead_communications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`);

--
-- Indexes for table `lead_documents`
--
ALTER TABLE `lead_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead` (`lead_id`),
  ADD KEY `idx_lead_type` (`lead_id`);

--
-- Indexes for table `lead_notes`
--
ALTER TABLE `lead_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead_notes_lead` (`lead_id`);

--
-- Indexes for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_lead` (`lead_id`),
  ADD KEY `idx_lead` (`lead_id`);

--
-- Indexes for table `leave_balances`
--
ALTER TABLE `leave_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_emp_type_year` (`employee_id`,`leave_type`,`year`),
  ADD KEY `idx_company` (`company_id`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_company_status` (`company_id`,`status`),
  ADD KEY `idx_employee` (`employee_id`),
  ADD KEY `idx_dates` (`start_date`,`end_date`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_messages_conversation` (`conversation_id`),
  ADD KEY `idx_messages_created` (`conversation_id`,`created_at`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_msg_attachments_message` (`message_id`),
  ADD KEY `idx_msg_attachments_conversation` (`conversation_id`);

--
-- Indexes for table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`key_name`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prt_user` (`user_id`),
  ADD KEY `idx_prt_token` (`token_hash`),
  ADD KEY `idx_prt_exp` (`expires_at`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_permission` (`resource`,`action`),
  ADD KEY `idx_perm_resource` (`resource`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_projects_lead_id` (`lead_id`),
  ADD KEY `idx_projects_stage` (`stage`);

--
-- Indexes for table `project_assignees`
--
ALTER TABLE `project_assignees`
  ADD PRIMARY KEY (`project_id`,`employee_id`),
  ADD KEY `idx_company` (`company_id`),
  ADD KEY `fk_pa_employee` (`employee_id`);

--
-- Indexes for table `project_documents`
--
ALTER TABLE `project_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_docs_project` (`project_id`);

--
-- Indexes for table `project_notes`
--
ALTER TABLE `project_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_project_notes_project` (`project_id`);

--
-- Indexes for table `project_schedules`
--
ALTER TABLE `project_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_project` (`project_id`),
  ADD KEY `idx_company_project` (`company_id`,`project_id`);

--
-- Indexes for table `qualifications`
--
ALTER TABLE `qualifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `referral_bonuses`
--
ALTER TABLE `referral_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_referral_lead_id` (`referral_lead_id`),
  ADD KEY `idx_bonus_paid_at` (`bonus_paid_at`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rt_user` (`user_id`),
  ADD KEY `idx_rt_token` (`token_hash`),
  ADD KEY `idx_rt_exp` (`expires_at`);

--
-- Indexes for table `retailer_projects`
--
ALTER TABLE `retailer_projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_retailer_projects_code` (`code`),
  ADD KEY `idx_retailer_projects_company` (`company_id`),
  ADD KEY `idx_retailer_projects_stage` (`stage`);

--
-- Indexes for table `retailer_project_assignees`
--
ALTER TABLE `retailer_project_assignees`
  ADD PRIMARY KEY (`project_id`,`employee_id`,`company_id`),
  ADD KEY `idx_rpa_company` (`company_id`),
  ADD KEY `idx_rpa_employee` (`employee_id`);

--
-- Indexes for table `retailer_project_documents`
--
ALTER TABLE `retailer_project_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_retailer_docs_project` (`project_id`);

--
-- Indexes for table `retailer_project_notes`
--
ALTER TABLE `retailer_project_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_retailer_notes_project` (`project_id`);

--
-- Indexes for table `retailer_project_schedules`
--
ALTER TABLE `retailer_project_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_retailer_project_schedule_project` (`company_id`,`project_id`),
  ADD KEY `idx_retailer_project_schedule_company` (`company_id`),
  ADD KEY `idx_retailer_project_schedule_date` (`scheduled_date`),
  ADD KEY `fk_rps_project` (`project_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `schema_migrations`
--
ALTER TABLE `schema_migrations`
  ADD PRIMARY KEY (`version`);

--
-- Indexes for table `trial_users`
--
ALTER TABLE `trial_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_trial_users_email` (`email`),
  ADD KEY `idx_trial_users_created_at` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_email_company` (`email`,`company_id`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_company_role` (`company_id`,`role_id`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `fk_users_custom_role` (`custom_role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance_edit_requests`
--
ALTER TABLE `attendance_edit_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `company_types`
--
ALTER TABLE `company_types`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `custom_roles`
--
ALTER TABLE `custom_roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employee_documents`
--
ALTER TABLE `employee_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `employment_types`
--
ALTER TABLE `employment_types`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `expense_claims`
--
ALTER TABLE `expense_claims`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inspection_templates`
--
ALTER TABLE `inspection_templates`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `job_roles`
--
ALTER TABLE `job_roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT for table `lead_communications`
--
ALTER TABLE `lead_communications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `lead_documents`
--
ALTER TABLE `lead_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lead_notes`
--
ALTER TABLE `lead_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `leave_balances`
--
ALTER TABLE `leave_balances`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `message_attachments`
--
ALTER TABLE `message_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `project_documents`
--
ALTER TABLE `project_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `project_notes`
--
ALTER TABLE `project_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `project_schedules`
--
ALTER TABLE `project_schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `qualifications`
--
ALTER TABLE `qualifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `referral_bonuses`
--
ALTER TABLE `referral_bonuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `retailer_projects`
--
ALTER TABLE `retailer_projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `retailer_project_documents`
--
ALTER TABLE `retailer_project_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `retailer_project_notes`
--
ALTER TABLE `retailer_project_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `retailer_project_schedules`
--
ALTER TABLE `retailer_project_schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `trial_users`
--
ALTER TABLE `trial_users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `fk_companies_type` FOREIGN KEY (`company_type_id`) REFERENCES `company_types` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `company_type_modules`
--
ALTER TABLE `company_type_modules`
  ADD CONSTRAINT `company_type_modules_ibfk_1` FOREIGN KEY (`company_type_id`) REFERENCES `company_types` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  ADD CONSTRAINT `conversation_participants_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversation_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `custom_roles`
--
ALTER TABLE `custom_roles`
  ADD CONSTRAINT `custom_roles_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `custom_role_permissions`
--
ALTER TABLE `custom_role_permissions`
  ADD CONSTRAINT `custom_role_permissions_ibfk_1` FOREIGN KEY (`custom_role_id`) REFERENCES `custom_roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `custom_role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_dept_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `emergency_contacts`
--
ALTER TABLE `emergency_contacts`
  ADD CONSTRAINT `fk_emg_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_emp_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_emp_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_emptype` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_jobrole` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employee_documents`
--
ALTER TABLE `employee_documents`
  ADD CONSTRAINT `fk_empdoc_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_empdoc_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_qualifications`
--
ALTER TABLE `employee_qualifications`
  ADD CONSTRAINT `fk_eq_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eq_qual` FOREIGN KEY (`qualification_id`) REFERENCES `qualifications` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_roles`
--
ALTER TABLE `job_roles`
  ADD CONSTRAINT `fk_jobrole_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_role_modules`
--
ALTER TABLE `job_role_modules`
  ADD CONSTRAINT `fk_jrm_module` FOREIGN KEY (`module_key`) REFERENCES `modules` (`key_name`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jrm_role` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lead_communications`
--
ALTER TABLE `lead_communications`
  ADD CONSTRAINT `fk_comm_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lead_documents`
--
ALTER TABLE `lead_documents`
  ADD CONSTRAINT `fk_lead_documents_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lead_notes`
--
ALTER TABLE `lead_notes`
  ADD CONSTRAINT `fk_lead_notes_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  ADD CONSTRAINT `fk_siteinsp_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD CONSTRAINT `fk_msg_attachments_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_msg_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `project_assignees`
--
ALTER TABLE `project_assignees`
  ADD CONSTRAINT `fk_pa_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pa_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_documents`
--
ALTER TABLE `project_documents`
  ADD CONSTRAINT `fk_project_docs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_notes`
--
ALTER TABLE `project_notes`
  ADD CONSTRAINT `fk_project_notes_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_schedules`
--
ALTER TABLE `project_schedules`
  ADD CONSTRAINT `fk_ps_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `referral_bonuses`
--
ALTER TABLE `referral_bonuses`
  ADD CONSTRAINT `referral_bonuses_ibfk_1` FOREIGN KEY (`referral_lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `retailer_project_assignees`
--
ALTER TABLE `retailer_project_assignees`
  ADD CONSTRAINT `fk_rpa_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rpa_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `retailer_project_documents`
--
ALTER TABLE `retailer_project_documents`
  ADD CONSTRAINT `fk_retailer_docs_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `retailer_project_notes`
--
ALTER TABLE `retailer_project_notes`
  ADD CONSTRAINT `fk_retailer_notes_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `retailer_project_schedules`
--
ALTER TABLE `retailer_project_schedules`
  ADD CONSTRAINT `fk_rps_project` FOREIGN KEY (`project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_custom_role` FOREIGN KEY (`custom_role_id`) REFERENCES `custom_roles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
