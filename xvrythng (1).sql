-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Mar 19, 2026 at 06:12 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.1.17

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
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action_type` enum('lead_created','stage_changed','proposal_sent','call_logged') NOT NULL,
  `description` varchar(255) NOT NULL,
  `meta_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_json`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_activity`
--

CREATE TABLE `approval_activity` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `approval_type` enum('leave','expense','attendance') NOT NULL,
  `approval_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `actor_user_id` int(10) UNSIGNED NOT NULL,
  `action` enum('approved','rejected') NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `abn` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Australia',
  `company_type_id` tinyint(3) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`id`, `name`, `slug`, `status`, `created_at`, `updated_at`, `abn`, `contact_email`, `contact_phone`, `address_line1`, `address_line2`, `city`, `state`, `postcode`, `country`, `company_type_id`) VALUES
(1, 'asdas', 'asdas', 'active', '2026-02-09 03:34:20', '2026-02-09 03:34:20', '3545', 'asds@gm.co', '324657687989', 'asdf', 'fdsfsdfd', 'sydeny', 'NSW', '2000', 'Australia', 1),
(2, 'Acme', 'acme', 'active', '2026-02-09 03:51:38', '2026-02-09 03:51:38', '3456576', 'abc@gmail.com', '4567879809', 'sadas', 'sadsad', 'asdfg', 'NSW', '2000', 'Australia', 1),
(3, 'safsdfdf', 'safsdfdf', 'active', '2026-02-09 07:06:50', '2026-02-09 07:06:50', 'asdsa', 'dfsgfhfg@gma.com', '53465768', 'wretyut', 'asdfdghh', 'Sydney', 'NSW', '2000', 'Australia', 1),
(4, 'Test ABC', 'test-abc', 'active', '2026-02-11 05:09:18', '2026-02-11 05:09:18', '32546576876987', 'testabc@gmail.com', '233534534', '12e M st', 'suite 100', 'Sydny', 'NSW', '1000', 'Australia', 1),
(5, 'sadfg', 'sadfg', 'active', '2026-02-17 08:34:44', '2026-02-17 08:34:44', '234545y', 'dsaf', '4657', '243567', 'aerstdthf', 'Sydney', 'NSW', '1000', 'Australia', 2);

-- --------------------------------------------------------

--
-- Table structure for table `company_payroll_settings`
--

CREATE TABLE `company_payroll_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `flat_tax_rate` decimal(6,4) NOT NULL DEFAULT 0.2000,
  `weekly_threshold` decimal(8,2) NOT NULL DEFAULT 40.00,
  `fortnight_threshold` decimal(8,2) NOT NULL DEFAULT 80.00,
  `overtime_multiplier` decimal(6,3) NOT NULL DEFAULT 1.500,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company_payroll_settings`
--

INSERT INTO `company_payroll_settings` (`id`, `company_id`, `flat_tax_rate`, `weekly_threshold`, `fortnight_threshold`, `overtime_multiplier`, `created_at`, `updated_at`) VALUES
(1, 1, 0.2000, 40.00, 80.00, 1.500, '2026-03-17 20:00:20', '2026-03-17 20:00:20'),
(2, 2, 0.2000, 40.00, 80.00, 1.500, '2026-03-17 20:00:20', '2026-03-17 20:00:20'),
(3, 3, 0.2000, 40.00, 80.00, 1.500, '2026-03-17 20:00:20', '2026-03-17 20:00:20'),
(4, 4, 0.2000, 40.00, 80.00, 1.500, '2026-03-17 20:00:20', '2026-03-17 20:00:20'),
(5, 5, 0.2000, 40.00, 80.00, 1.500, '2026-03-17 20:00:20', '2026-03-17 20:00:20');

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
(1, 'solar_retailer', 'Solar retailer – full CRM, projects, field', '2026-02-08 17:46:09'),
(2, 'installer', 'Installer – projects and field only', '2026-02-08 17:46:09'),
(3, 'enterprise', 'Enterprise – all modules', '2026-02-08 17:46:09');

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
(1, 'attendance', '2026-02-08 17:46:09'),
(1, 'installation', '2026-03-12 16:49:19'),
(1, 'leads', '2026-02-08 17:46:09'),
(1, 'messages', '2026-02-08 17:46:09'),
(1, 'on_field', '2026-02-08 17:46:09'),
(1, 'operations', '2026-02-08 17:46:09'),
(1, 'projects', '2026-02-08 17:46:09'),
(1, 'referrals', '2026-02-08 17:46:09'),
(1, 'support', '2026-03-06 18:51:38'),
(2, 'installation', '2026-03-12 16:49:19'),
(2, 'on_field', '2026-02-08 17:46:09'),
(2, 'operations', '2026-02-08 17:46:09'),
(2, 'projects', '2026-02-08 17:46:09'),
(3, 'attendance', '2026-02-08 17:46:09'),
(3, 'installation', '2026-03-12 16:49:19'),
(3, 'leads', '2026-02-08 17:46:09'),
(3, 'messages', '2026-02-08 17:46:09'),
(3, 'on_field', '2026-02-08 17:46:09'),
(3, 'operations', '2026-02-08 17:46:09'),
(3, 'projects', '2026-02-08 17:46:09'),
(3, 'referrals', '2026-02-08 17:46:09'),
(3, 'support', '2026-03-06 18:51:38');

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
(1, 2, 'dm', NULL, '2026-02-18 18:19:36', '2026-02-18 18:19:36'),
(2, 2, 'group', 'test grp', '2026-02-18 18:45:24', '2026-02-18 18:45:24'),
(3, 1, 'dm', NULL, '2026-02-18 19:03:17', '2026-02-18 19:03:17'),
(4, 2, 'group', 'Group 1', '2026-02-23 07:46:43', '2026-02-23 07:46:43'),
(5, NULL, 'dm', NULL, '2026-03-07 19:20:50', '2026-03-07 19:20:50');

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
(6, 3, 2, NULL, '2026-02-18 19:03:17'),
(9, 5, 7, '2026-03-09 05:44:33', '2026-03-07 19:20:50');

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
  `code` varchar(50) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `company_id`, `code`, `name`, `created_at`) VALUES
(1, 1, 'GEN', 'General', '2026-03-07 06:21:37'),
(2, 2, 'GEN', 'General', '2026-03-07 06:21:37'),
(3, 3, 'GEN', 'General', '2026-03-07 06:21:37'),
(4, 4, 'GEN', 'General', '2026-03-07 06:21:37'),
(5, 5, 'GEN', 'General', '2026-03-07 06:21:37')
ON DUPLICATE KEY UPDATE
  `company_id` = VALUES(`company_id`),
  `code`        = VALUES(`code`),
  `name`        = VALUES(`name`),
  `created_at`  = VALUES(`created_at`);

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
(3, 1, 5, 'XTR-DIR-001', 'Ashley', 'Bronson', '0000-00-00', 'Male', 'ashley@xtechsrenewable.com', '123456789', '', '', '', '', '', '', 3, 7, 1, NULL, NULL, 'monthly', 0.00, 'active', '', '2026-02-27 18:22:51', '2026-02-27 18:22:51'),
(4, 1, 8, 'XTR-DIR-002', 'Soumik', 'Pathak', '1998-11-12', 'male', 'soumikpathak0@gmail.com', '8652191966', '', '', '', '', '', '', 1, 21, 1, '2026-03-02', NULL, 'monthly', 0.00, 'active', '', '2026-03-07 19:10:31', '2026-03-07 19:10:31'),
(5, 1, NULL, 'XTR-APP-001', 'asdasd', 'dasd', '2026-02-25', 'male', 'asdasd@gm.co', 'sadds', '', '', '', '', '', '', 1, 16, 1, '2026-03-04', NULL, 'monthly', 0.00, 'active', '', '2026-03-09 05:43:51', '2026-03-09 05:43:51');

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
(1, 'Full-time', '2026-03-07 06:21:37'),
(2, 'Part-time', '2026-03-07 06:21:37'),
(3, 'Contractor', '2026-03-07 06:21:37');

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
(6, 1, 'default', 'Default (Full)', 1, 'published', '[\"*\"]', '[]', '{\"requiredFields\":[\"inspected_at\",\"inspector_name\",\"roof_type\",\"meter_phase\",\"inverter_location\",\"msb_condition\"]}', '{\"enabledSections\":[\"core\",\"job\",\"switchboard\",\"subBoard\",\"inverter\",\"monitor\",\"roof\",\"mudmap\",\"final\"],\"stepGuards\":[{\"stepId\":\"job\",\"fields\":[\"jobDetails.licenseSelfie\"]}]}', NULL, NULL, '2026-02-23 02:24:34', '2026-02-23 02:24:34');

-- --------------------------------------------------------

--
-- Table structure for table `installation_checklist_items`
--

CREATE TABLE `installation_checklist_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `section` varchar(100) NOT NULL DEFAULT 'general',
  `label` varchar(255) NOT NULL,
  `sort_order` smallint(6) NOT NULL DEFAULT 0,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `installation_checklist_items`
--

INSERT INTO `installation_checklist_items` (`id`, `company_id`, `section`, `label`, `sort_order`, `is_required`, `created_at`) VALUES
(1, NULL, 'pre_install', 'Site arrival & safety briefing', 1, 1, '2026-03-12 22:19:19'),
(2, NULL, 'pre_install', 'Confirm customer name & address', 2, 1, '2026-03-12 22:19:19'),
(3, NULL, 'pre_install', 'Confirm system specs with customer', 3, 1, '2026-03-12 22:19:19'),
(4, NULL, 'pre_install', 'Inspect roof / mounting area', 4, 1, '2026-03-12 22:19:19'),
(5, NULL, 'pre_install', 'Check switchboard / MSB', 5, 1, '2026-03-12 22:19:19'),
(6, NULL, 'pre_install', 'PPE checked for all team members', 6, 1, '2026-03-12 22:19:19'),
(7, NULL, 'install', 'Mount rails / brackets', 1, 1, '2026-03-12 22:19:19'),
(8, NULL, 'install', 'Install solar panels', 2, 1, '2026-03-12 22:19:19'),
(9, NULL, 'install', 'Run DC cabling & conduit', 3, 1, '2026-03-12 22:19:19'),
(10, NULL, 'install', 'Install & wire inverter', 4, 1, '2026-03-12 22:19:19'),
(11, NULL, 'install', 'AC connection to switchboard', 5, 1, '2026-03-12 22:19:19'),
(12, NULL, 'install', 'Battery installation (if applicable)', 6, 0, '2026-03-12 22:19:19'),
(13, NULL, 'post_install', 'Commissioning & system test', 1, 1, '2026-03-12 22:19:19'),
(14, NULL, 'post_install', 'Label all equipment', 2, 1, '2026-03-12 22:19:19'),
(15, NULL, 'post_install', 'Clean up worksite', 3, 1, '2026-03-12 22:19:19'),
(16, NULL, 'post_install', 'Brief customer on system operation', 4, 1, '2026-03-12 22:19:19'),
(17, NULL, 'post_install', 'Take completion photos', 5, 1, '2026-03-12 22:19:19'),
(18, NULL, 'post_install', 'Complete customer sign-off', 6, 1, '2026-03-12 22:19:19'),
(19, NULL, 'pre_install', 'Site arrival & safety briefing', 1, 1, '2026-03-12 22:35:30'),
(20, NULL, 'pre_install', 'Confirm customer name & address', 2, 1, '2026-03-12 22:35:30'),
(21, NULL, 'pre_install', 'Confirm system specs with customer', 3, 1, '2026-03-12 22:35:30'),
(22, NULL, 'pre_install', 'Inspect roof / mounting area', 4, 1, '2026-03-12 22:35:30'),
(23, NULL, 'pre_install', 'Check switchboard / MSB', 5, 1, '2026-03-12 22:35:30'),
(24, NULL, 'pre_install', 'PPE checked for all team members', 6, 1, '2026-03-12 22:35:30'),
(25, NULL, 'install', 'Mount rails / brackets', 1, 1, '2026-03-12 22:35:30'),
(26, NULL, 'install', 'Install solar panels', 2, 1, '2026-03-12 22:35:30'),
(27, NULL, 'install', 'Run DC cabling & conduit', 3, 1, '2026-03-12 22:35:30'),
(28, NULL, 'install', 'Install & wire inverter', 4, 1, '2026-03-12 22:35:30'),
(29, NULL, 'install', 'AC connection to switchboard', 5, 1, '2026-03-12 22:35:30'),
(30, NULL, 'install', 'Battery installation (if applicable)', 6, 0, '2026-03-12 22:35:30'),
(31, NULL, 'post_install', 'Commissioning & system test', 1, 1, '2026-03-12 22:35:30'),
(32, NULL, 'post_install', 'Label all equipment', 2, 1, '2026-03-12 22:35:30'),
(33, NULL, 'post_install', 'Clean up worksite', 3, 1, '2026-03-12 22:35:30'),
(34, NULL, 'post_install', 'Brief customer on system operation', 4, 1, '2026-03-12 22:35:30'),
(35, NULL, 'post_install', 'Take completion photos', 5, 1, '2026-03-12 22:35:30'),
(36, NULL, 'post_install', 'Complete customer sign-off', 6, 1, '2026-03-12 22:35:30'),
(37, NULL, 'pre_install', 'Site arrival & safety briefing', 1, 1, '2026-03-12 23:57:47'),
(38, NULL, 'pre_install', 'Confirm customer name & address', 2, 1, '2026-03-12 23:57:47'),
(39, NULL, 'pre_install', 'Confirm system specs with customer', 3, 1, '2026-03-12 23:57:47'),
(40, NULL, 'pre_install', 'Inspect roof / mounting area', 4, 1, '2026-03-12 23:57:47'),
(41, NULL, 'pre_install', 'Check switchboard / MSB', 5, 1, '2026-03-12 23:57:47'),
(42, NULL, 'pre_install', 'PPE checked for all team members', 6, 1, '2026-03-12 23:57:47'),
(43, NULL, 'install', 'Mount rails / brackets', 1, 1, '2026-03-12 23:57:47'),
(44, NULL, 'install', 'Install solar panels', 2, 1, '2026-03-12 23:57:47'),
(45, NULL, 'install', 'Run DC cabling & conduit', 3, 1, '2026-03-12 23:57:47'),
(46, NULL, 'install', 'Install & wire inverter', 4, 1, '2026-03-12 23:57:47'),
(47, NULL, 'install', 'AC connection to switchboard', 5, 1, '2026-03-12 23:57:47'),
(48, NULL, 'install', 'Battery installation (if applicable)', 6, 0, '2026-03-12 23:57:47'),
(49, NULL, 'post_install', 'Commissioning & system test', 1, 1, '2026-03-12 23:57:47'),
(50, NULL, 'post_install', 'Label all equipment', 2, 1, '2026-03-12 23:57:47'),
(51, NULL, 'post_install', 'Clean up worksite', 3, 1, '2026-03-12 23:57:47'),
(52, NULL, 'post_install', 'Brief customer on system operation', 4, 1, '2026-03-12 23:57:47'),
(53, NULL, 'post_install', 'Take completion photos', 5, 1, '2026-03-12 23:57:47'),
(54, NULL, 'post_install', 'Complete customer sign-off', 6, 1, '2026-03-12 23:57:47');

-- --------------------------------------------------------

--
-- Table structure for table `installation_checklist_responses`
--

CREATE TABLE `installation_checklist_responses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `checked` tinyint(1) NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `checked_by` int(10) UNSIGNED DEFAULT NULL,
  `checked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_jobs`
--

CREATE TABLE `installation_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `retailer_project_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('scheduled','in_progress','paused','completed') NOT NULL DEFAULT 'scheduled',
  `customer_name` varchar(150) NOT NULL DEFAULT '',
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `system_type` varchar(100) DEFAULT NULL,
  `panel_count` smallint(5) UNSIGNED DEFAULT NULL,
  `inverter_model` varchar(150) DEFAULT NULL,
  `battery_included` tinyint(1) NOT NULL DEFAULT 0,
  `scheduled_date` date DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `estimated_hours` decimal(4,1) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `total_elapsed_seconds` int(10) UNSIGNED DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_job_assignees`
--

CREATE TABLE `installation_job_assignees` (
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `role` varchar(80) DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `assigned_by` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_photos`
--

CREATE TABLE `installation_photos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `section` enum('before','during','after','general') NOT NULL DEFAULT 'general',
  `storage_url` varchar(512) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mime_type` varchar(80) DEFAULT NULL,
  `size_bytes` int(10) UNSIGNED DEFAULT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `taken_at` datetime DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_photo_requirements`
--

CREATE TABLE `installation_photo_requirements` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `section` enum('before','during','after') NOT NULL,
  `min_count` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `is_required` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_signoffs`
--

CREATE TABLE `installation_signoffs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `signature_url` varchar(512) DEFAULT NULL,
  `signed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `signed_by_ip` varchar(45) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `installation_time_records`
--

CREATE TABLE `installation_time_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `event` enum('start','pause','resume','end') NOT NULL,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp(),
  `recorded_by` int(10) UNSIGNED DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 1, 'STAFF', 'Staff', NULL, '2026-03-07 06:21:37'),
(2, 2, 'STAFF', 'Staff', NULL, '2026-03-07 06:21:37'),
(3, 3, 'STAFF', 'Staff', NULL, '2026-03-07 06:21:37'),
(4, 4, 'STAFF', 'Staff', NULL, '2026-03-07 06:21:37'),
(5, 5, 'STAFF', 'Staff', NULL, '2026-03-07 06:21:37'),
(8, 1, 'MGR', 'Manager', NULL, '2026-03-07 06:21:37'),
(9, 2, 'MGR', 'Manager', NULL, '2026-03-07 06:21:37'),
(10, 3, 'MGR', 'Manager', NULL, '2026-03-07 06:21:37'),
(11, 4, 'MGR', 'Manager', NULL, '2026-03-07 06:21:37'),
(12, 5, 'MGR', 'Manager', NULL, '2026-03-07 06:21:37'),
(15, 1, 'ELE-LEAD', 'Lead Electrician', NULL, '2026-03-07 13:07:01'),
(16, 1, 'APP', 'Apprentice', NULL, '2026-03-07 13:07:01'),
(17, 1, 'SAL-MGR', 'Sales Manager', NULL, '2026-03-07 13:07:01'),
(18, 1, 'SAL-EXE', 'Sales Executive', NULL, '2026-03-07 13:07:01'),
(19, 1, 'OPS-MGR', 'Operations Manager', NULL, '2026-03-07 13:07:01'),
(20, 1, 'PM-MGR', 'Project Manager', NULL, '2026-03-07 13:07:01'),
(21, 1, 'DIR', 'Director', NULL, '2026-03-07 13:07:01');

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
(7, 'referrals'),
(16, 'attendance'),
(16, 'leads'),
(16, 'messages'),
(16, 'on_field'),
(16, 'operations'),
(16, 'projects'),
(16, 'referrals'),
(16, 'support'),
(21, 'attendance'),
(21, 'leads'),
(21, 'messages'),
(21, 'on_field'),
(21, 'operations'),
(21, 'projects'),
(21, 'referrals'),
(21, 'support');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
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
  `external_id` varchar(255) DEFAULT NULL,
  `marketing_payload_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`marketing_payload_json`)),
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
  `assigned_user_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(1, NULL, 'new', 'test', '', '', 'test', 1000.00, NULL, NULL, NULL, 0, 0, NULL, '2026-02-11 08:52:35', NULL, '2026-02-11 01:52:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, NULL, 'new', 'test', '', '', 'test', 1000.00, NULL, NULL, NULL, 0, 0, NULL, '2026-02-11 08:52:45', NULL, '2026-02-11 01:52:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, NULL, 'new', 'test', '', '', 'test', 100.00, 200.00, 'test', NULL, 0, 0, NULL, '2026-02-11 08:55:40', NULL, '2026-02-11 01:55:40', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, NULL, 'proposal_sent', 'test', '', '', 'test', 100.00, 123.00, '123', NULL, 0, 0, NULL, '2026-02-17 13:37:37', NULL, '2026-02-11 01:55:57', '2026-02-17 08:07:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, NULL, 'new', 'test', '', '', 'test', 100.00, 100.00, 'Web', NULL, 0, 0, NULL, '2026-02-11 09:45:20', NULL, '2026-02-11 02:45:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, NULL, 'new', 'Minh', '', '', 'Minh', 5.00, 5.00, 'gg', NULL, 0, 0, NULL, '2026-02-12 06:53:36', NULL, '2026-02-11 02:46:32', '2026-02-11 23:53:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, NULL, 'new', 'testcal', '', '', 'cal', 100000.00, 5000.00, 'Web', NULL, 0, 0, NULL, '2026-02-12 08:05:59', NULL, '2026-02-12 01:05:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, NULL, 'contacted', 'adsfsa', '', '', 'safsdfasdf', 50.00, 50.00, 'wewerwrwerwer', NULL, 0, 0, NULL, '2026-02-17 13:36:50', NULL, '2026-02-12 01:07:55', '2026-02-17 08:06:50', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, NULL, 'contacted', 'testfwewefwe', '', '', 'set', 7.00, 50.00, 'fwefwefwefewfwe', NULL, 0, 0, NULL, '2026-02-17 13:36:49', NULL, '2026-02-12 01:09:00', '2026-02-17 08:06:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, NULL, 'qualified', 'testagain', '', '', 'aeokne', 50.00, 500.00, 'werwer', NULL, 0, 0, NULL, '2026-02-17 13:36:49', '2026-02-14 09:15:00', '2026-02-12 01:15:31', '2026-02-17 08:06:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(11, NULL, 'contacted', 'Michael Flynn', 'michael.flynn@vicbar.com.au', '0408 122 190', 'Hawthorn', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:02:51', NULL, '2026-02-18 17:30:03', '2026-02-18 17:32:51', '1019248', '{\"id\":1019248,\"idLeadSupplier\":2284028,\"name\":\"Michael\",\"lastName\":\"Flynn\",\"phone\":\"0408 122 190\",\"email\":\"michael.flynn@vicbar.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-18 08:05:12\",\"companyName\":\"\",\"address\":\"7 Smart St Hawthorn\",\"latitude\":-37.8161387,\"longitude\":145.0240949,\"installationAddressLineOne\":\"7 Smart St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Hawthorn\",\"installationState\":\"VIC\",\"installationPostcode\":3122,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Note, we already have a very old solar hot water system.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & easily expandableMichael has verified this phone number\",\"importantNotesSplit\":\"Note, we already have a very old solar hot water system.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & easily expandable:Michael has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Note, we already have a very old solar hot water system.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & easily expandableMichael has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 7 Smart St Hawthorn, Hawthorn, VIC, 3122\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.679Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, NULL, 'new', 'Brett Dyer', 'brett_a_dyer@bigpond.com', '0429 627 375', 'Sandringham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1019171', '{\"id\":1019171,\"idLeadSupplier\":2283938,\"name\":\"Brett\",\"lastName\":\"Dyer\",\"phone\":\"0429 627 375\",\"email\":\"brett_a_dyer@bigpond.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-18 01:50:18\",\"companyName\":\"\",\"address\":\"8 Holloway Cl Sandringham\",\"latitude\":-37.95812859999,\"longitude\":145.0260515,\"installationAddressLineOne\":\"8 Holloway Cl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Sandringham\",\"installationState\":\"VIC\",\"installationPostcode\":3191,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase micro invertersRequired for: Lowest bills & charge from solar in blackoutBrett has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase micro inverters:Required for: Lowest bills & charge from solar in blackout:Brett has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase micro invertersRequired for: Lowest bills & charge from solar in blackoutBrett has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 8 Holloway Cl Sandringham, Sandringham, VIC, 3191\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.685Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, NULL, 'new', 'Jonathan Tan', 'tychiang82@gmail.com', '0490 240 282', 'Balwyn North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1019165', '{\"id\":1019165,\"idLeadSupplier\":2283928,\"name\":\"Jonathan\",\"lastName\":\"Tan\",\"phone\":\"0490 240 282\",\"email\":\"tychiang82@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-18 01:46:16\",\"companyName\":\"\",\"address\":\"34 Kawarren St Balwyn North\",\"latitude\":-37.7841433,\"longitude\":145.0918936,\"installationAddressLineOne\":\"34 Kawarren St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Balwyn North\",\"installationState\":\"VIC\",\"installationPostcode\":3104,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I would like the Signenergy battery 48kw with 30kw inverter This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EnphaseRequired for: Lowest bills & backups up 3-phase appliancesJonathan  has verified this phone number\",\"importantNotesSplit\":\"I would like the Signenergy battery 48kw with 30kw inverter :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase:Required for: Lowest bills & backups up 3-phase appliances:Jonathan  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"ash lead\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I would like the Signenergy battery 48kw with 30kw inverter This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EnphaseRequired for: Lowest bills & backups up 3-phase appliancesJonathan  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 34 Kawarren St Balwyn North, Balwyn North, VIC, 3104\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.687Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, NULL, 'new', 'Ida Greco', 'ida.greco3@gmail.com', '0402 359 393', 'Wheelers Hill', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1019102', '{\"id\":1019102,\"idLeadSupplier\":2283900,\"name\":\"Ida\",\"lastName\":\"Greco\",\"phone\":\"0402 359 393\",\"email\":\"ida.greco3@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-18 01:36:13\",\"companyName\":\"\",\"address\":\"5 Tiki Ct Wheelers Hill\",\"latitude\":-37.9216864,\"longitude\":145.1906109,\"installationAddressLineOne\":\"5 Tiki Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wheelers Hill\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"i have 2 quotes which are very different for the same system. we are after a 20 kw battery for 3 phase. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: sungrow in verterRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Ida has verified this phone number\",\"importantNotesSplit\":\"i have 2 quotes which are very different for the same system. we are after a 20 kw battery for 3 phase. :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: sungrow in verter:Required for: Quickest payback time & almost instant changeover in a blackout:This is an ORIGIN lead.:Ida has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: i have 2 quotes which are very different for the same system. we are after a 20 kw battery for 3 phase. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: sungrow in verterRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Ida has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 5 Tiki Ct Wheelers Hill, Wheelers Hill, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.693Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, NULL, 'new', 'Lyndal Wight', 'lyndalwight1@gmail.com', '0419 597 135', 'Emerald', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018926', '{\"id\":1018926,\"idLeadSupplier\":2283853,\"name\":\"Lyndal\",\"lastName\":\"Wight\",\"phone\":\"0419 597 135\",\"email\":\"lyndalwight1@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-18 01:25:27\",\"companyName\":\"\",\"address\":\"28 Poplar Cres Emerald\",\"latitude\":-37.9127421,\"longitude\":145.4527894,\"installationAddressLineOne\":\"28 Poplar Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Emerald\",\"installationState\":\"VIC\",\"installationPostcode\":3782,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolaredgeRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutLyndal has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Solaredge:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Lyndal has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolaredgeRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutLyndal has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 28 Poplar Cres Emerald, Emerald, VIC, 3782\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.694Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, NULL, 'new', 'Aries Lin', 'yuhsienlin@hotmail.com', '0490 688 695', 'Doncaster East', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1019160', '{\"id\":1019160,\"idLeadSupplier\":2283794,\"name\":\"Aries\",\"lastName\":\"Lin\",\"phone\":\"0490 688 695\",\"email\":\"yuhsienlin@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 21:55:08\",\"companyName\":\"\",\"address\":\"8 Hatfield Ct Doncaster East\",\"latitude\":-37.797694,\"longitude\":145.1480856,\"installationAddressLineOne\":\"8 Hatfield Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Doncaster East\",\"installationState\":\"VIC\",\"installationPostcode\":3109,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutAries has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout:Aries has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutAries has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 8 Hatfield Ct Doncaster East, Doncaster East, VIC, 3109\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.696Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, NULL, 'new', 'Robert Chen', 'robertchen83@gmail.com', '0425 769 784', 'Brighton East', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018986', '{\"id\":1018986,\"idLeadSupplier\":2283554,\"name\":\"Robert\",\"lastName\":\"Chen\",\"phone\":\"0425 769 784\",\"email\":\"robertchen83@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-17 15:40:37\",\"companyName\":\"\",\"address\":\"15 Blanche St Brighton East\",\"latitude\":-37.9097051,\"longitude\":145.008589,\"installationAddressLineOne\":\"15 Blanche St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Brighton East\",\"installationState\":\"VIC\",\"installationPostcode\":3187,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Request total install cost for 20kwh Sungrow SGH battery system with Sungrow 10.RS inverter, and extra 6.6kw Solar Panels, bringing total system capacity to 13.3 kwLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: No battery, just a 6.6kw solar panel system with 5kw inverter is currently installedExisting inverter type: Sungrow SG5K-DRequired for: Blackout Protection & charge from solar in blackoutRobert has verified this phone number\",\"importantNotesSplit\":\"Request total install cost for 20kwh Sungrow SGH battery system with Sungrow 10.RS inverter, and extra 6.6kw Solar Panels, bringing total system capacity to 13.3 kw:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: No battery, just a 6.6kw solar panel system with 5kw inverter is currently installed:::Existing inverter type: Sungrow SG5K-D:Required for: Blackout Protection & charge from solar in blackout:Robert has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"lost\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: Request total install cost for 20kwh Sungrow SGH battery system with Sungrow 10.RS inverter, and extra 6.6kw Solar Panels, bringing total system capacity to 13.3 kwLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: No battery, just a 6.6kw solar panel system with 5kw inverter is currently installedExisting inverter type: Sungrow SG5K-DRequired for: Blackout Protection & charge from solar in blackoutRobert has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 15 Blanche St Brighton East, Brighton East, VIC, 3187\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.700Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, NULL, 'new', 'Cameron James', 'cameronss@bigpond.com', '0401 234 672', 'Lyndhurst', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018960', '{\"id\":1018960,\"idLeadSupplier\":2283485,\"name\":\"Cameron\",\"lastName\":\"James\",\"phone\":\"0401 234 672\",\"email\":\"cameronss@bigpond.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 15:05:11\",\"companyName\":\"\",\"address\":\"7 Golden Ash Cl Lyndhurst\",\"latitude\":-38.0645907,\"longitude\":145.2469808,\"installationAddressLineOne\":\"7 Golden Ash Cl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lyndhurst\",\"installationState\":\"VIC\",\"installationPostcode\":3975,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Removing the old five panel from the roofLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutCameron has verified this phone number\",\"importantNotesSplit\":\"Removing the old five panel from the roof:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:Cameron has verified this phone number\",\"requestedQuotes\":1,\"note\":\"Was busy at the moment will call back to discuss things further - Neil - 18/02/2026 - 12\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Removing the old five panel from the roofLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutCameron has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 7 Golden Ash Cl Lyndhurst, Lyndhurst, VIC, 3975\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.702Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, NULL, 'new', 'Alena Huang', 'yhliu013@gmail.com', '0451 314 194', 'Balwyn North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018937', '{\"id\":1018937,\"idLeadSupplier\":2283467,\"name\":\"Alena\",\"lastName\":\"Huang\",\"phone\":\"0451 314 194\",\"email\":\"yhliu013@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 14:55:08\",\"companyName\":\"\",\"address\":\"16 Gardenia Rd Balwyn North\",\"latitude\":-37.7882046,\"longitude\":145.0985072,\"installationAddressLineOne\":\"16 Gardenia Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Balwyn North\",\"installationState\":\"VIC\",\"installationPostcode\":3104,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAlena has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Alena has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Inspection Date - 20/02/2026\\t5:00 PM\\tAshley\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAlena has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 16 Gardenia Rd Balwyn North, Balwyn North, VIC, 3104\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.703Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(20, NULL, 'new', 'STUART MCKNIGHT', 'stuartdmcknight10@gmail.com', '0468 302 198', 'Sandringham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018947', '{\"id\":1018947,\"idLeadSupplier\":2283465,\"name\":\"STUART\",\"lastName\":\"MCKNIGHT\",\"phone\":\"0468 302 198\",\"email\":\"stuartdmcknight10@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 14:45:15\",\"companyName\":\"\",\"address\":\"20 Victory St Sandringham\",\"latitude\":-37.9519368,\"longitude\":145.0107359,\"installationAddressLineOne\":\"20 Victory St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Sandringham\",\"installationState\":\"VIC\",\"installationPostcode\":3191,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Use between 20kwh and 50kwh per day.We charge an EVWe have a power hungry heating/cooling systemWe\'ll be home all day, so are considering solar panels only, with a battery option laterThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.STUART has verified this phone number\",\"importantNotesSplit\":\"Use between 20kwh and 50kwh per day.:::We charge an EV:::We have a power hungry heating/cooling system:::We\'ll be home all day, so are considering solar panels only, with a battery option later:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:STUART has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Did not pick up the call - Neil - 18/02/2026 - 11am\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Use between 20kwh and 50kwh per day.We charge an EVWe have a power hungry heating/cooling systemWe\'ll be home all day, so are considering solar panels only, with a battery option laterThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.STUART has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 20 Victory St Sandringham, Sandringham, VIC, 3191\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.705Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, NULL, 'new', 'Suqi Guan', 'suqiguan5522@hotmail.com', '0421 137 350', 'Doncaster', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018918', '{\"id\":1018918,\"idLeadSupplier\":2283422,\"name\":\"Suqi\",\"lastName\":\"Guan\",\"phone\":\"0421 137 350\",\"email\":\"suqiguan5522@hotmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-02-17 13:56:00\",\"companyName\":\"\",\"address\":\"15 Balfour St Doncaster\",\"latitude\":-37.7922862,\"longitude\":145.1152978,\"installationAddressLineOne\":\"15 Balfour St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Doncaster\",\"installationState\":\"VIC\",\"installationPostcode\":3108,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashSuqi has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Suqi has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Already have received a quote, so confused to decide weather to go for Solar now or wait for few years. He will call us back to inform if wants to get the site inspection done.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashSuqi has verified this phone number\\n\\nFeatures: On Grid Solar\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 15 Balfour St Doncaster, Doncaster, VIC, 3108\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.706Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, NULL, 'new', 'Steve Travis', 'gusangora@gmail.com', '0425 735 380', 'Upwey', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018814', '{\"id\":1018814,\"idLeadSupplier\":2283243,\"name\":\"Steve\",\"lastName\":\"Travis\",\"phone\":\"0425 735 380\",\"email\":\"gusangora@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 10:55:54\",\"companyName\":\"\",\"address\":\"53 Belmont Ave Upwey\",\"latitude\":-37.9045505,\"longitude\":145.3267368,\"installationAddressLineOne\":\"53 Belmont Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Upwey\",\"installationState\":\"VIC\",\"installationPostcode\":3158,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"Intermittent shading. Main driver is cost saving, so require reasonable return on investment This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutSteve has verified this phone number\",\"importantNotesSplit\":\"Intermittent shading. Main driver is cost saving, so require reasonable return on investment :This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:Steve has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Ash lead\\nlikely to go for goodwe, \\nneed to send 2 goodwe and 2 sig quotes when he sends me electricity bill a little later today\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Intermittent shading. Main driver is cost saving, so require reasonable return on investment This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutSteve has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 53 Belmont Ave Upwey, Upwey, VIC, 3158\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.707Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, NULL, 'new', 'PHILLIPPA Dwyer', 'Phill.Dwyer@gmail.com', '0491 757 429', 'Williamstown', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018586', '{\"id\":1018586,\"idLeadSupplier\":2283215,\"name\":\"PHILLIPPA\",\"lastName\":\"Dwyer\",\"phone\":\"0491 757 429\",\"email\":\"Phill.Dwyer@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-17 10:45:31\",\"companyName\":\"\",\"address\":\"98 Railway Pl Williamstown\",\"latitude\":-37.86022407826,\"longitude\":144.89125851656,\"installationAddressLineOne\":\"98 Railway Pl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Williamstown\",\"installationState\":\"VIC\",\"installationPostcode\":3016,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"My current solar panels are over 10 years old. I\'m looking for cheapest options. I live alone. Electric bills currently $70 monhtlyLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsPHILLIPPA has verified this phone number\",\"importantNotesSplit\":\"My current solar panels are over 10 years old. I\'m looking for cheapest options. I live alone. Electric bills currently $70 monhtly::Lead has consented to discussion of energy plans.::This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Required for: Lowest bills::PHILLIPPA has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Called but no response&#13;\\n3rd attempt to be done on Thrusday at 11\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: My current solar panels are over 10 years old. I\'m looking for cheapest options. I live alone. Electric bills currently $70 monhtlyLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsPHILLIPPA has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 98 Railway Pl Williamstown, Williamstown, VIC, 3016\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.708Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(24, NULL, 'new', 'Mark Powell', 'mp74@hotmail.co.uk', '0481 239 906', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018530', '{\"id\":1018530,\"idLeadSupplier\":2283192,\"name\":\"Mark\",\"lastName\":\"Powell\",\"phone\":\"0481 239 906\",\"email\":\"mp74@hotmail.co.uk\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-17 10:20:09\",\"companyName\":\"\",\"address\":\"1 Hamilton Wy Rowville\",\"latitude\":-37.9192546,\"longitude\":145.2216184,\"installationAddressLineOne\":\"1 Hamilton Wy\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe Required for: Lowest bills & charge from solar in blackoutMark has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe :Required for: Lowest bills & charge from solar in blackout:Mark has verified this phone number\",\"requestedQuotes\":3,\"note\":\"ash lead\\nto send goodwe indicative pricing quotation\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe Required for: Lowest bills & charge from solar in blackoutMark has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 1 Hamilton Wy Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.709Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(25, NULL, 'new', 'Rob Buick', 'robuick@outlook.com', '0401 623 301', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018735', '{\"id\":1018735,\"idLeadSupplier\":2283046,\"name\":\"Rob\",\"lastName\":\"Buick\",\"phone\":\"0401 623 301\",\"email\":\"robuick@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-17 06:45:10\",\"companyName\":\"\",\"address\":\"87 Mantung Cres Rowville\",\"latitude\":-37.9210534,\"longitude\":145.2433358,\"installationAddressLineOne\":\"87 Mantung Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback timeRob has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Quickest payback time:Rob has verified this phone number\",\"requestedQuotes\":3,\"note\":\"ash call, no reply 11am (17/02/2026&#13;\\n&#13;\\nliam called 6pm no resp 17/02&#13;\\n&#13;\\n3rd attempt to be done on Thrusday at 11\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback timeRob has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 87 Mantung Cres Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.710Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(26, NULL, 'new', 'Geoffrey Grinton', 'ggrinton@gmail.com', '0418 475 564', 'Blackburn South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018483', '{\"id\":1018483,\"idLeadSupplier\":2282937,\"name\":\"Geoffrey\",\"lastName\":\"Grinton\",\"phone\":\"0418 475 564\",\"email\":\"ggrinton@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-17 01:30:23\",\"companyName\":\"\",\"address\":\"4 Hone Ave Blackburn South\",\"latitude\":-37.8316085,\"longitude\":145.1406323,\"installationAddressLineOne\":\"4 Hone Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Blackburn South\",\"installationState\":\"VIC\",\"installationPostcode\":3130,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Currently only have 8 panels. Looking for battery options to help in spreading the daily load. I realise this is very small.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Geoffrey has verified this phone number\",\"importantNotesSplit\":\"Currently only have 8 panels. Looking for battery options to help in spreading the daily load. I realise this is very small.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Geoffrey has verified this phone number\",\"requestedQuotes\":3,\"note\":\"liam called has an old system needs replacing and wants a quote for sig and goodwe\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Currently only have 8 panels. Looking for battery options to help in spreading the daily load. I realise this is very small.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Geoffrey has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 4 Hone Ave Blackburn South, Blackburn South, VIC, 3130\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.711Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(27, NULL, 'new', 'Wendy Ribbands', 'wendy_ribbands@yahoo.com.au', '0402 334 298', 'Richmond', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018477', '{\"id\":1018477,\"idLeadSupplier\":2282655,\"name\":\"Wendy\",\"lastName\":\"Ribbands\",\"phone\":\"0402 334 298\",\"email\":\"wendy_ribbands@yahoo.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-16 16:25:11\",\"companyName\":\"\",\"address\":\"58 Highett St Richmond\",\"latitude\":-37.8154149,\"longitude\":144.9932821,\"installationAddressLineOne\":\"58 Highett St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Richmond\",\"installationState\":\"VIC\",\"installationPostcode\":3121,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & backups up 3-phase appliancesWendy has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & backups up 3-phase appliances:Wendy has verified this phone number\",\"requestedQuotes\":3,\"note\":\"liam inspection wednesday 9:30am\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & backups up 3-phase appliancesWendy has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 58 Highett St Richmond, Richmond, VIC, 3121\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.712Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(28, NULL, 'new', 'Ken Lee', 'kleehummer@gmail.com', '0413 998 306', 'Endeavour Hills', 20.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018171', '{\"id\":1018171,\"idLeadSupplier\":2282382,\"name\":\"Ken\",\"lastName\":\"Lee\",\"phone\":\"0413 998 306\",\"email\":\"kleehummer@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"20+ kW\",\"systemPriceType\":\"Top quality (most expensive)\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-16 12:35:24\",\"companyName\":\"\",\"address\":\"9 Nugent Ct Endeavour Hills\",\"latitude\":-37.9699075,\"longitude\":145.2545163,\"installationAddressLineOne\":\"9 Nugent Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Endeavour Hills\",\"installationState\":\"VIC\",\"installationPostcode\":3802,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I have quoted for jinko solar 13.2 kw and goodwe 10kw inverter n 48kw of battery This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKen has verified this phone number\",\"importantNotesSplit\":\"I have quoted for jinko solar 13.2 kw and goodwe 10kw inverter n 48kw of battery ::This lead was submitted via the QuotesV3 form.::This customer has indicated that they would like to receive the VIC rebate.::Lead wants to pay cash::Required for: Lowest bills & charge from solar in blackout::Ken has verified this phone number\",\"requestedQuotes\":3,\"note\":\"ash lead&#13;\\nno answer,&#13;\\ncall and try Liam&#13;\\n&#13;\\nWe can get a site inspection done today or tomorrow at 5 pm if not today. - 18/02/2026&#13;\\n&#13;\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have quoted for jinko solar 13.2 kw and goodwe 10kw inverter n 48kw of battery This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKen has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 9 Nugent Ct Endeavour Hills, Endeavour Hills, VIC, 3802\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.713Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(29, NULL, 'new', 'Rafael Gonzalez', 'renovations@rafaelgonzalez.me', '0422 517 917', 'Kilsyth', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018290', '{\"id\":1018290,\"idLeadSupplier\":2282373,\"name\":\"Rafael\",\"lastName\":\"Gonzalez\",\"phone\":\"0422 517 917\",\"email\":\"renovations@rafaelgonzalez.me\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Add Batteries to Existing\",\"submittedDate\":\"2026-02-16 12:20:05\",\"companyName\":\"\",\"address\":\"29 Churchill Way Kilsyth\",\"latitude\":-37.7982239,\"longitude\":145.3042565,\"installationAddressLineOne\":\"29 Churchill Way\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kilsyth\",\"installationState\":\"VIC\",\"installationPostcode\":3137,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Hello,My name is Rafael and I am looking for quotes for a home battery installation, with full blackout protection (battery and solar panels still work during a blackout).We are located in Kilsyth and live in a single storey weatherboard house, with a solar PV array of 10kW already installed (by you 4 years ago!). The power board is modern as it was fully replaced a couple years ago.We are thinking about getting somewhere around 20-30kWh of storage, maybe more if the prices and rebates fit our budget of ~$10k. We have no insulation at the moment, and our highest usage in winter can reach 80kWh a day.We’re not looking for super fancy batteries: anything that tracks metrics of our usage that we can consult and export would be great. Beyond that, the ability to choose when to charge or discharge the batter is a must, but I assume all batteries do this.Looking forward to hear from you!Regards,This customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: Fronius Primo 8.2Required for: Lowest bills, charge from solar in blackout & easily expandableExclusive lead from your review pageRafael has verified this phone number\",\"importantNotesSplit\":\"Hello,:::My name is Rafael and I am looking for quotes for a home battery installation, with full blackout protection (battery and solar panels still work during a blackout).:::We are located in Kilsyth and live in a single storey weatherboard house, with a solar PV array of 10kW already installed (by you 4 years ago!). The power board is modern as it was fully replaced a couple years ago.:::We are thinking about getting somewhere around 20-30kWh of storage, maybe more if the prices and rebates fit our budget of ~$10k. We have no insulation at the moment, and our highest usage in winter can reach 80kWh a day.:::We’re not looking for super fancy batteries: anything that tracks metrics of our usage that we can consult and export would be great. Beyond that, the ability to choose when to charge or discharge the batter is a must, but I assume all batteries do this.:::Looking forward to hear from you!:::Regards,::This customer has indicated that they do not want the VIC rebate.::Customer wants a battery upgrade::Amount of storage required: I don\'t know::Existing inverter type: Fronius Primo 8.2::Required for: Lowest bills, charge from solar in blackout & easily expandable::Exclusive lead from your review page::Rafael has verified this phone number\",\"requestedQuotes\":1,\"note\":\"ash lead, no answer,&#13;\\ncall and try liam&#13;\\nno answer liam tues 455pm&#13;\\n&#13;\\n3rd attempt on Thrusday no response\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":2,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Hello,My name is Rafael and I am looking for quotes for a home battery installation, with full blackout protection (battery and solar panels still work during a blackout).We are located in Kilsyth and live in a single storey weatherboard house, with a solar PV array of 10kW already installed (by you 4 years ago!). The power board is modern as it was fully replaced a couple years ago.We are thinking about getting somewhere around 20-30kWh of storage, maybe more if the prices and rebates fit our budget of ~$10k. We have no insulation at the moment, and our highest usage in winter can reach 80kWh a day.We’re not looking for super fancy batteries: anything that tracks metrics of our usage that we can consult and export would be great. Beyond that, the ability to choose when to charge or discharge the batter is a must, but I assume all batteries do this.Looking forward to hear from you!Regards,This customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: Fronius Primo 8.2Required for: Lowest bills, charge from solar in blackout & easily expandableExclusive lead from your review pageRafael has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 29 Churchill Way Kilsyth, Kilsyth, VIC, 3137\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.714Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(30, NULL, 'new', 'Daman Singh Rekhi', 'damanrekhi@gmail.com', '0422 316 290', 'Greensborough', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018187', '{\"id\":1018187,\"idLeadSupplier\":2282057,\"name\":\"Daman Singh\",\"lastName\":\"Rekhi\",\"phone\":\"0422 316 290\",\"email\":\"damanrekhi@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-16 01:55:32\",\"companyName\":\"\",\"address\":\"11 Toorak Ct Greensborough\",\"latitude\":-37.6854667,\"longitude\":145.1231874,\"installationAddressLineOne\":\"11 Toorak Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Greensborough\",\"installationState\":\"VIC\",\"installationPostcode\":3088,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolarMax 4600PRequired for: Quickest payback timeDaman Singh has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: SolarMax 4600P:Required for: Quickest payback time:Daman Singh has verified this phone number\",\"requestedQuotes\":3,\"note\":\"ash lead&#13;\\ncalled no reply,&#13;\\ntry Liam…&#13;\\nno response 450pm tues&#13;\\n&#13;\\nLooking Maximum Battery, has a old solar panel installed in 2013, single phase, he needs a quote before and then the site inspection - Wednesday - Called by Neil\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolarMax 4600PRequired for: Quickest payback timeDaman Singh has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 11 Toorak Ct Greensborough, Greensborough, VIC, 3088\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.715Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(31, NULL, 'new', 'Ash Amir', 'arshad.amir@outlook.com', '0400 807 600', 'Mount Waverley', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1018173', '{\"id\":1018173,\"idLeadSupplier\":2281917,\"name\":\"Ash\",\"lastName\":\"Amir\",\"phone\":\"0400 807 600\",\"email\":\"arshad.amir@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-15 22:35:07\",\"companyName\":\"\",\"address\":\"43 Muir St Mount Waverley\",\"latitude\":-37.8656038,\"longitude\":145.1381803,\"installationAddressLineOne\":\"43 Muir St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mount Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3149,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sigenergy 8kwh module add on. Existing sigenergy battery and inverter. Just need another 8kwh module.Existing inverter type: Battery inverter is sigenergy 10kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAsh has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Sigenergy 8kwh module add on. Existing sigenergy battery and inverter. Just need another 8kwh module.:Existing inverter type: Battery inverter is sigenergy 10kw:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Ash has verified this phone number\",\"requestedQuotes\":2,\"note\":\"try Liam.. &#13;\\nsecond attempt 4:50pm tues&#13;\\n&#13;\\n3rd attempt on Thrusday 10\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sigenergy 8kwh module add on. Existing sigenergy battery and inverter. Just need another 8kwh module.Existing inverter type: Battery inverter is sigenergy 10kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAsh has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 43 Muir St Mount Waverley, Mount Waverley, VIC, 3149\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.716Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(32, NULL, 'new', 'Caroline Burgess', 'billmeburgess@gmail.com', '0408 564 472', 'Upwey', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017339', '{\"id\":1017339,\"idLeadSupplier\":2280982,\"name\":\"Caroline\",\"lastName\":\"Burgess\",\"phone\":\"0408 564 472\",\"email\":\"billmeburgess@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Add Batteries to Existing\",\"submittedDate\":\"2026-02-14 08:06:00\",\"companyName\":\"\",\"address\":\"35 Griffiths Road Upwey\",\"latitude\":-37.9122572,\"longitude\":145.3230903,\"installationAddressLineOne\":\"35 Griffiths Road\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Upwey\",\"installationState\":\"VIC\",\"installationPostcode\":3158,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"No Tesla batteriesThis customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: Sungrow sg10rs-adaRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutCaroline has verified this phone number\",\"importantNotesSplit\":\"No Tesla batteries:::This customer has indicated that they do not want the VIC rebate.::Customer wants a battery upgrade::Amount of storage required: I don\'t know::Existing inverter type: Sungrow sg10rs-ada::Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout:Caroline has verified this phone number\",\"requestedQuotes\":2,\"note\":\"is busy at the moment and has asked to call back on Friday 9am\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":2,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: No Tesla batteriesThis customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: Sungrow sg10rs-adaRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutCaroline has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 35 Griffiths Road Upwey, Upwey, VIC, 3158\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.717Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(33, NULL, 'new', 'Yvonne Nardone', 'ywait@bigpond.com', '0430 100 954', 'Camberwell', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017173', '{\"id\":1017173,\"idLeadSupplier\":2280763,\"name\":\"Yvonne\",\"lastName\":\"Nardone\",\"phone\":\"0430 100 954\",\"email\":\"ywait@bigpond.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-14 01:15:36\",\"companyName\":\"\",\"address\":\"6 Acheron Ave Camberwell\",\"latitude\":-37.8401825,\"longitude\":145.0656445,\"installationAddressLineOne\":\"6 Acheron Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Camberwell\",\"installationState\":\"VIC\",\"installationPostcode\":3124,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I have a 5.13 kW solar panel system with a 5 kW Solar Edge inverter. I want to add a battery 10 to 20 kW,  possibly Alpha ESSS Smile or similar. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solar EdgeRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Yvonne has verified this phone number\",\"importantNotesSplit\":\"I have a 5.13 kW solar panel system with a 5 kW Solar Edge inverter. I want to add a battery 10 to 20 kW,  possibly Alpha ESSS Smile or similar. :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Solar Edge:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:Yvonne has verified this phone number\",\"requestedQuotes\":3,\"note\":\"dorsnt want any more panels doesnt mind about not much excess solar 1:15pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have a 5.13 kW solar panel system with a 5 kW Solar Edge inverter. I want to add a battery 10 to 20 kW,  possibly Alpha ESSS Smile or similar. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solar EdgeRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Yvonne has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 6 Acheron Ave Camberwell, Camberwell, VIC, 3124\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.718Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(34, NULL, 'new', 'Rodney Humphrey', 'rod.humphrey@bigpond.com', '0409 114 575', 'Beaconsfield', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017263', '{\"id\":1017263,\"idLeadSupplier\":2280499,\"name\":\"Rodney\",\"lastName\":\"Humphrey\",\"phone\":\"0409 114 575\",\"email\":\"rod.humphrey@bigpond.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"Top quality (most expensive)\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\\nRodney  specifically requested a quote from Xtechs Renewables Pty Ltd\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-13 14:05:11\",\"companyName\":\"\",\"address\":\"34 Beaconhill Dr Beaconsfield\",\"latitude\":-38.0488098,\"longitude\":145.383068,\"installationAddressLineOne\":\"34 Beaconhill Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Beaconsfield\",\"installationState\":\"VIC\",\"installationPostcode\":3807,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"look at the roof, it has solar pool heating and an evap cooler to considerThis lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Rodney  has verified this phone number\",\"importantNotesSplit\":\"look at the roof, it has solar pool heating and an evap cooler to consider:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Rodney  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"11:30am booked inspection liam monday\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: look at the roof, it has solar pool heating and an evap cooler to considerThis lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Rodney  has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\nRodney  specifically requested a quote from Xtechs Renewables Pty Ltd\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 34 Beaconhill Dr Beaconsfield, Beaconsfield, VIC, 3807\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-18T17:30:03.719Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(35, NULL, 'new', 'Helena Andrews', 'H.Andrews@outlook.com.au', '0409 177 017', 'Fitzroy', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017211', '{\"id\":1017211,\"idLeadSupplier\":2280414,\"name\":\"Helena\",\"lastName\":\"Andrews\",\"phone\":\"0409 177 017\",\"email\":\"H.Andrews@outlook.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-13 12:25:07\",\"companyName\":\"\",\"address\":\"45 Greeves St Fitzroy\",\"latitude\":-37.7997531,\"longitude\":144.9790286,\"installationAddressLineOne\":\"45 Greeves St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Fitzroy\",\"installationState\":\"VIC\",\"installationPostcode\":3065,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"Our current solar system may need looking at - there is a red lightLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EnphaseRequired for: Lowest bills & easily expandableThis is an ORIGIN lead.Helena has verified this phone number\",\"importantNotesSplit\":\"Our current solar system may need looking at - there is a red light:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase:Required for: Lowest bills & easily expandable:This is an ORIGIN lead.:Helena has verified this phone number\",\"requestedQuotes\":1,\"note\":\"has existing enphase system needs to be looked at will ac couple the sigenergy system to it need to book site inspection she is flexible with times\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Our current solar system may need looking at - there is a red lightLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EnphaseRequired for: Lowest bills & easily expandableThis is an ORIGIN lead.Helena has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 45 Greeves St Fitzroy, Fitzroy, VIC, 3065\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.720Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(36, NULL, 'new', 'Carly Stungo', 'carly.stungo@origin.com.au', '0428 556 853', 'Ringwood', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017089', '{\"id\":1017089,\"idLeadSupplier\":2280206,\"name\":\"Carly\",\"lastName\":\"Stungo\",\"phone\":\"0428 556 853\",\"email\":\"carly.stungo@origin.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-13 08:25:08\",\"companyName\":\"\",\"address\":\"27 Tandarra Dr Ringwood\",\"latitude\":-37.7831402,\"longitude\":145.252337,\"installationAddressLineOne\":\"27 Tandarra Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ringwood\",\"installationState\":\"VIC\",\"installationPostcode\":3134,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Origin employeeThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sumpower IQ7ARequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Carly has verified this phone number\",\"importantNotesSplit\":\"Origin employee:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Sumpower IQ7A:Required for: Quickest payback time & charge from solar in blackout:This is an ORIGIN lead.:Carly has verified this phone number\",\"requestedQuotes\":2,\"note\":\"liam called 9am was busy\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Origin employeeThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sumpower IQ7ARequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Carly has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 3\\n\\nAddress: 27 Tandarra Dr Ringwood, Ringwood, VIC, 3134\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.722Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(37, NULL, 'new', 'Kevin Yip', 'kevin_yip28@hotmail.com', '0430 787 548', 'Clarinda', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1017076', '{\"id\":1017076,\"idLeadSupplier\":2280160,\"name\":\"Kevin\",\"lastName\":\"Yip\",\"phone\":\"0430 787 548\",\"email\":\"kevin_yip28@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-13 07:10:11\",\"companyName\":\"\",\"address\":\"194 Clarinda Rd Clarinda\",\"latitude\":-37.9423006,\"longitude\":145.0978268,\"installationAddressLineOne\":\"194 Clarinda Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Clarinda\",\"installationState\":\"VIC\",\"installationPostcode\":3169,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsKevin has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills:Kevin has verified this phone number\",\"requestedQuotes\":3,\"note\":\"3rd call attempt Thrusday 10am\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsKevin has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 194 Clarinda Rd Clarinda, Clarinda, VIC, 3169\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.723Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(38, NULL, 'new', 'Jean Pierre Viader', 'jeanpierreviader@gmail.com', '0404 570 301', 'Pakenham', 3.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1016709', '{\"id\":1016709,\"idLeadSupplier\":2279539,\"name\":\"Jean Pierre\",\"lastName\":\"Viader\",\"phone\":\"0404 570 301\",\"email\":\"jeanpierreviader@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"3 to 5 kW\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-12 12:40:17\",\"companyName\":\"\",\"address\":\"46 Constance Way Pakenham\",\"latitude\":-38.0597152,\"longitude\":145.5132266,\"installationAddressLineOne\":\"46 Constance Way\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Pakenham\",\"installationState\":\"VIC\",\"installationPostcode\":3810,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Jean Pierre has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:Jean Pierre has verified this phone number\",\"requestedQuotes\":3,\"note\":\"ash lead,\\ncalled 4:15pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Jean Pierre has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 46 Constance Way Pakenham, Pakenham, VIC, 3810\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-18T17:30:03.724Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(39, NULL, 'new', 'MICHAEL GRANT', 'm.d.grant@bigpond.com', '0407 238 646', 'Mount Evelyn', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1016578', '{\"id\":1016578,\"idLeadSupplier\":2279264,\"name\":\"MICHAEL\",\"lastName\":\"GRANT\",\"phone\":\"0407 238 646\",\"email\":\"m.d.grant@bigpond.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-12 06:35:06\",\"companyName\":\"\",\"address\":\"95 Fernhill Road Mount Evelyn\",\"latitude\":-37.7773161,\"longitude\":145.3939598,\"installationAddressLineOne\":\"95 Fernhill Road\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mount Evelyn\",\"installationState\":\"VIC\",\"installationPostcode\":3796,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: sungrowRequired for: Blackout Protection & charge from solar in blackoutMICHAEL has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: sungrow:Required for: Blackout Protection & charge from solar in blackout:MICHAEL has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: sungrowRequired for: Blackout Protection & charge from solar in blackoutMICHAEL has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 95 Fernhill Road Mount Evelyn, Mount Evelyn, VIC, 3796\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.725Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(40, NULL, 'new', 'David Punter', 'thepunter99@gmail.com', '0419 303 905', 'Mulgrave', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1016264', '{\"id\":1016264,\"idLeadSupplier\":2279063,\"name\":\"David\",\"lastName\":\"Punter\",\"phone\":\"0419 303 905\",\"email\":\"thepunter99@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-12 01:36:05\",\"companyName\":\"\",\"address\":\"29 Stadium Cct Mulgrave\",\"latitude\":-37.9238824,\"longitude\":145.1898286,\"installationAddressLineOne\":\"29 Stadium Cct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mulgrave\",\"installationState\":\"VIC\",\"installationPostcode\":3170,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase micro invertersRequired for: Lowest bills & charge from solar in blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase micro inverters:Required for: Lowest bills & charge from solar in blackout:David has verified this phone number\",\"requestedQuotes\":3,\"note\":\"existing enphase add some more panels and a quote with no additional\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase micro invertersRequired for: Lowest bills & charge from solar in blackoutDavid has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 29 Stadium Cct Mulgrave, Mulgrave, VIC, 3170\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.725Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(41, NULL, 'new', 'Tim Lee', 'mail@timlee.co.uk', '0409 047 191', 'Rosanna', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1016210', '{\"id\":1016210,\"idLeadSupplier\":2279035,\"name\":\"Tim\",\"lastName\":\"Lee\",\"phone\":\"0409 047 191\",\"email\":\"mail@timlee.co.uk\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-12 01:25:08\",\"companyName\":\"\",\"address\":\"6 Laane Ave Rosanna\",\"latitude\":-37.7440456,\"longitude\":145.0744079,\"installationAddressLineOne\":\"6 Laane Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rosanna\",\"installationState\":\"VIC\",\"installationPostcode\":3084,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutTim has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:Tim has verified this phone number\",\"requestedQuotes\":3,\"note\":\"20/02/2026\\t9:00 AM\\tAshley\\t40 Kw battery, Single Stack, 11kw, 3phase\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutTim has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 6 Laane Ave Rosanna, Rosanna, VIC, 3084\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.727Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(42, NULL, 'new', 'Faariq Furkan', 'faariq.tb@gmail.com', '0405 637 539', 'Dandenong North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1016042', '{\"id\":1016042,\"idLeadSupplier\":2278646,\"name\":\"Faariq\",\"lastName\":\"Furkan\",\"phone\":\"0405 637 539\",\"email\":\"faariq.tb@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Add Batteries to Existing\",\"submittedDate\":\"2026-02-11 13:25:45\",\"companyName\":\"\",\"address\":\"4 Silk Ct Dandenong North\",\"latitude\":-37.9678756,\"longitude\":145.2223358,\"installationAddressLineOne\":\"4 Silk Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Dandenong North\",\"installationState\":\"VIC\",\"installationPostcode\":3175,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: UnknownRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & easily expandableFaariq has verified this phone number\",\"importantNotesSplit\":\"This customer has indicated that they do not want the VIC rebate.:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing inverter type: Unknown:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Faariq has verified this phone number\",\"requestedQuotes\":3,\"note\":\"13kw solar system atm looking for batteries\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":2,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This customer has indicated that they do not want the VIC rebate.Customer wants a battery upgradeAmount of storage required: I don\'t knowExisting inverter type: UnknownRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & easily expandableFaariq has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 4 Silk Ct Dandenong North, Dandenong North, VIC, 3175\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.727Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(43, NULL, 'new', 'David Philipsen', 'david@parkerfinance.com.au', '0408 385 559', 'Park Orchards', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1015919', '{\"id\":1015919,\"idLeadSupplier\":2278642,\"name\":\"David\",\"lastName\":\"Philipsen\",\"phone\":\"0408 385 559\",\"email\":\"david@parkerfinance.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-11 13:25:22\",\"companyName\":\"\",\"address\":\"6 Villanova Ct Park Orchards\",\"latitude\":-37.77227023797,\"longitude\":145.22811767668,\"installationAddressLineOne\":\"6 Villanova Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Park Orchards\",\"installationState\":\"VIC\",\"installationPostcode\":3114,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"nothing special to request. There is an opportunity to install additional panels but would need to see the business case. interested in the business case to install batteries. A lot of supplier are suggesting 43kwh for $5-6k on Facebook ,which sounds crazy good but I am skeptical. Cheers DaveLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 33 panels at 9.9kw total on 3 of 4 available strings on 2 x Fronius Symo 5.0-3-m inverters.  We have 3 phase power connected.Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"nothing special to request. There is an opportunity to install additional panels but would need to see the business case. interested in the business case to install batteries. A lot of supplier are suggesting 43kwh for $5-6k on Facebook ,which sounds crazy good but I am skeptical. Cheers Dave::Lead has consented to discussion of energy plans.::This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: 33 panels at 9.9kw total on 3 of 4 available strings on 2 x Fronius Symo 5.0-3-m inverters.  We have 3 phase power connected.::Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout::David has verified this phone number\",\"requestedQuotes\":3,\"note\":\"3 phase potentially add more panels and hybrid couple a sig\\nquote drafted \\n2:30pm inspect\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: nothing special to request. There is an opportunity to install additional panels but would need to see the business case. interested in the business case to install batteries. A lot of supplier are suggesting 43kwh for $5-6k on Facebook ,which sounds crazy good but I am skeptical. Cheers DaveLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 33 panels at 9.9kw total on 3 of 4 available strings on 2 x Fronius Symo 5.0-3-m inverters.  We have 3 phase power connected.Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutDavid has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 6 Villanova Ct Park Orchards, Park Orchards, VIC, 3114\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.728Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(44, NULL, 'new', 'Stan Dino', 'standino1949@hotmail.com', '0403 506 739', 'Dandenong North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1015799', '{\"id\":1015799,\"idLeadSupplier\":2278154,\"name\":\"Stan\",\"lastName\":\"Dino\",\"phone\":\"0403 506 739\",\"email\":\"standino1949@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-11 01:35:42\",\"companyName\":\"\",\"address\":\"29 Cheam St Dandenong North\",\"latitude\":-37.9619131,\"longitude\":145.2201312,\"installationAddressLineOne\":\"29 Cheam St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Dandenong North\",\"installationState\":\"VIC\",\"installationPostcode\":3175,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Stan has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:Stan has verified this phone number\",\"requestedQuotes\":2,\"note\":\"2 old inverters quote for replacing all with goodwe and sig\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Stan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 29 Cheam St Dandenong North, Dandenong North, VIC, 3175\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.729Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(45, NULL, 'new', 'Steve Kearney', 'skearney2@mac.com', '0414 719 299', 'Aspendale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-18 23:00:03', NULL, '2026-02-18 17:30:03', NULL, '1015786', '{\"id\":1015786,\"idLeadSupplier\":2278148,\"name\":\"Steve\",\"lastName\":\"Kearney\",\"phone\":\"0414 719 299\",\"email\":\"skearney2@mac.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-11 01:35:26\",\"companyName\":\"\",\"address\":\"39 Kubis Ave Aspendale\",\"latitude\":-38.0216121,\"longitude\":145.1056225,\"installationAddressLineOne\":\"39 Kubis Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Aspendale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"id like a big system at least 20 kw but prepared to get a lesser known battery - really after the cheapest way out , but it wont be worth getting if its not over 20kwThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius - about 10 years old Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSteve has verified this phone number\",\"importantNotesSplit\":\"id like a big system at least 20 kw but prepared to get a lesser known battery - really after the cheapest way out , but it wont be worth getting if its not over 20kw:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius - about 10 years old :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Steve has verified this phone number\",\"requestedQuotes\":2,\"note\":\"ash called, wants cheap.\\nrecommended goodwe 32kWh for about 10-13k,\\nheavy doesn’t want to spend more than 10.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: id like a big system at least 20 kw but prepared to get a lesser known battery - really after the cheapest way out , but it wont be worth getting if its not over 20kwThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius - about 10 years old Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSteve has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 39 Kubis Ave Aspendale, Aspendale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-18T17:30:03.730Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(46, NULL, 'new', 'abc', 'abc@gmail.com', '2143546576876', 'dsad', 324.00, 234234.00, 'asdasd', NULL, 0, 0, NULL, '2026-02-18 23:01:19', NULL, '2026-02-18 17:31:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(47, NULL, 'new', 'Maciej Tatarczuch', 'mtatarczuch@hotmail.com', '0408 326 220', 'Hampton', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-19 17:00:04', NULL, '2026-02-19 11:30:04', NULL, '1020036', '{\"id\":1020036,\"idLeadSupplier\":2285422,\"name\":\"Maciej\",\"lastName\":\"Tatarczuch\",\"phone\":\"0408 326 220\",\"email\":\"mtatarczuch@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-19 21:25:07\",\"companyName\":\"\",\"address\":\"13 The Avenue Hampton\",\"latitude\":-37.9306536,\"longitude\":145.0010245,\"installationAddressLineOne\":\"13 The Avenue\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Hampton\",\"installationState\":\"VIC\",\"installationPostcode\":3188,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Have existing solar panels for pool but not sure re: quality/efficiency/amount of panels. Interested in solar battery +/- extra solar panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableMaciej has verified this phone number\",\"importantNotesSplit\":\"Have existing solar panels for pool but not sure re: quality/efficiency/amount of panels. Interested in solar battery +/- extra solar panels:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Maciej has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Have existing solar panels for pool but not sure re: quality/efficiency/amount of panels. Interested in solar battery +/- extra solar panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableMaciej has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 13 The Avenue Hampton, Hampton, VIC, 3188\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-19T11:30:04.621Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(48, NULL, 'new', 'Lester Lora', 'lesterlorarn@yahoo.com', '0436 317 690', 'Cranbourne West', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-19 21:00:03', NULL, '2026-02-19 15:30:03', NULL, '1020081', '{\"id\":1020081,\"idLeadSupplier\":2285456,\"name\":\"Lester\",\"lastName\":\"Lora\",\"phone\":\"0436 317 690\",\"email\":\"lesterlorarn@yahoo.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nA home currently under construction - frame and roof completed\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-02-19 23:35:07\",\"companyName\":\"\",\"address\":\"48 Sanctum Parade Cranbourne West\",\"latitude\":-38.1190369,\"longitude\":145.2333485,\"installationAddressLineOne\":\"48 Sanctum Parade\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Cranbourne West\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashLester has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Lester has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashLester has verified this phone number\\n\\nFeatures: On Grid Solar\\nA home currently under construction - frame and roof completed\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 48 Sanctum Parade Cranbourne West, Cranbourne West, VIC, 3977\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-19T15:30:03.685Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(49, NULL, 'new', 'Andrew Blackett', 'black777@mac.com', '0413 634 856', 'Upwey', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 09:00:01', NULL, '2026-02-20 03:30:01', NULL, '1020320', '{\"id\":1020320,\"idLeadSupplier\":2285978,\"name\":\"Andrew\",\"lastName\":\"Blackett\",\"phone\":\"0413 634 856\",\"email\":\"black777@mac.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-20 13:45:08\",\"companyName\":\"\",\"address\":\"27 Bayview Ave Upwey\",\"latitude\":-37.9079726,\"longitude\":145.3334283,\"installationAddressLineOne\":\"27 Bayview Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Upwey\",\"installationState\":\"VIC\",\"installationPostcode\":3158,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Interested in adding a new hybrid inverter with new panels to my existing solar setup (SolarEdge), which will be left unchanged. Battery will DC couple to new inverter, AC couple to SolarEdge inverter. Want full house backup, ability to charge battery from solar panels during grid outage, ability to force charge battery from grid during set time windows.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: No existing batteryExisting inverter type: SolarEdge SE5000H, with 5kW solar panels attached. I don\'t want a SolarEdge battery. I would like to install a new hybrid inverter with new panels to expand my solar capacity, with battery DC coupled to new inverter, and AC coupled to existing SolarEdge inverter.Required for: Lowest bills & charge from solar in blackoutAndrew has verified this phone number\",\"importantNotesSplit\":\"Interested in adding a new hybrid inverter with new panels to my existing solar setup (SolarEdge), which will be left unchanged. Battery will DC couple to new inverter, AC couple to SolarEdge inverter. Want full house backup, ability to charge battery from solar panels during grid outage, ability to force charge battery from grid during set time windows.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: No existing battery:Existing inverter type: SolarEdge SE5000H, with 5kW solar panels attached. I don\'t want a SolarEdge battery. I would like to install a new hybrid inverter with new panels to expand my solar capacity, with battery DC coupled to new inverter, and AC coupled to existing SolarEdge inverter.:Required for: Lowest bills & charge from solar in blackout:Andrew has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: Interested in adding a new hybrid inverter with new panels to my existing solar setup (SolarEdge), which will be left unchanged. Battery will DC couple to new inverter, AC couple to SolarEdge inverter. Want full house backup, ability to charge battery from solar panels during grid outage, ability to force charge battery from grid during set time windows.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: No existing batteryExisting inverter type: SolarEdge SE5000H, with 5kW solar panels attached. I don\'t want a SolarEdge battery. I would like to install a new hybrid inverter with new panels to expand my solar capacity, with battery DC coupled to new inverter, and AC coupled to existing SolarEdge inverter.Required for: Lowest bills & charge from solar in blackoutAndrew has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 3\\n\\nAddress: 27 Bayview Ave Upwey, Upwey, VIC, 3158\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-20T03:30:01.484Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(50, NULL, 'new', 'Jim XU', 'bmwm6c@gmail.com', '0438 391 868', 'Dingley Village', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 09:00:01', NULL, '2026-02-20 03:30:01', NULL, '1020273', '{\"id\":1020273,\"idLeadSupplier\":2285899,\"name\":\"Jim\",\"lastName\":\"XU\",\"phone\":\"0438 391 868\",\"email\":\"bmwm6c@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-20 12:35:16\",\"companyName\":\"\",\"address\":\"39 Christina Terrace Dingley Village\",\"latitude\":-37.9730794,\"longitude\":145.1260061,\"installationAddressLineOne\":\"39 Christina Terrace\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Dingley Village\",\"installationState\":\"VIC\",\"installationPostcode\":3172,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutJim has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Jim has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutJim has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 39 Christina Terrace Dingley Village, Dingley Village, VIC, 3172\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-20T03:30:01.493Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(51, NULL, 'new', 'Pradeep Subramaniam', 'pradeepsubramaniam@hotmail.com', '0481 000 476', 'Burwood', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 09:00:01', NULL, '2026-02-20 03:30:01', NULL, '1020266', '{\"id\":1020266,\"idLeadSupplier\":2285871,\"name\":\"Pradeep\",\"lastName\":\"Subramaniam\",\"phone\":\"0481 000 476\",\"email\":\"pradeepsubramaniam@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-20 12:15:14\",\"companyName\":\"\",\"address\":\"3 Stewart St Burwood\",\"latitude\":-37.8478324,\"longitude\":145.1319991,\"installationAddressLineOne\":\"3 Stewart St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Burwood\",\"installationState\":\"VIC\",\"installationPostcode\":3125,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolarEdge SE10k-AUBRequired for: Quickest payback time & charge from solar in blackoutPradeep has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: SolarEdge SE10k-AUB:Required for: Quickest payback time & charge from solar in blackout:Pradeep has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SolarEdge SE10k-AUBRequired for: Quickest payback time & charge from solar in blackoutPradeep has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 3 Stewart St Burwood, Burwood, VIC, 3125\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-20T03:30:01.501Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(52, NULL, 'new', 'Gurjeet Singh', 'gurjeetsahi@gmail.com', '0478 517 910', 'Clyde North', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 09:00:01', NULL, '2026-02-20 03:30:01', NULL, '1020246', '{\"id\":1020246,\"idLeadSupplier\":2285841,\"name\":\"Gurjeet\",\"lastName\":\"Singh\",\"phone\":\"0478 517 910\",\"email\":\"gurjeetsahi@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nA home currently under construction - frame and roof completed\\nMicro Inverters or Power Optimisers\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-02-20 11:15:27\",\"companyName\":\"\",\"address\":\"9 Generation Dr Clyde North\",\"latitude\":-38.1034242,\"longitude\":145.3895571,\"installationAddressLineOne\":\"9 Generation Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Clyde North\",\"installationState\":\"VIC\",\"installationPostcode\":3978,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashThis is an ORIGIN lead.Gurjeet has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:This is an ORIGIN lead.:Gurjeet has verified this phone number\",\"requestedQuotes\":2,\"note\":\"ash quote sent - Feb 20 1:46pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"quote_sent\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashThis is an ORIGIN lead.Gurjeet has verified this phone number\\n\\nFeatures: On Grid Solar\\nA home currently under construction - frame and roof completed\\nMicro Inverters or Power Optimisers\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 9 Generation Dr Clyde North, Clyde North, VIC, 3978\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-20T03:30:01.503Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(53, NULL, 'new', 'John Smith', 'john.smith@email.com', '0412345678', 'Sydney', 6.60, 15000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-02-15 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(54, NULL, 'qualified', 'Jane Doe', 'jane.doe@email.com', '0423456789', 'Melbourne', 10.00, 22000.00, 'Referral', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-02-20 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(55, NULL, 'contacted', 'Bob Johnson', 'bob.johnson@email.com', '0434567890', 'Brisbane', 5.00, 12000.00, 'Phone', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-02-25 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(56, NULL, 'proposal_sent', 'Michael Brown', 'michael.brown@email.com', '0456789012', 'Adelaide', 7.50, 16500.00, 'Referral', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-03-01 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(57, NULL, 'negotiation', 'Emily Davis', 'emily.davis@email.com', '0467890123', 'Sydney', 12.00, 28000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-03-05 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(58, NULL, 'qualified', 'Lisa Anderson', 'lisa.anderson@email.com', '0489012345', 'Brisbane', 9.00, 20000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-03-10 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(59, NULL, 'inspection_completed', 'Maria Garcia', 'maria.garcia@email.com', '0401234567', 'Adelaide', 11.00, 25000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:08', '2024-03-15 00:00:00', '2026-02-20 03:30:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(60, NULL, 'new', 'John Smith', 'john.smith@email.com', '0412345678', 'Sydney', 6.60, 15000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-02-15 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(61, NULL, 'qualified', 'Jane Doe', 'jane.doe@email.com', '0423456789', 'Melbourne', 10.00, 22000.00, 'Referral', NULL, 0, 0, NULL, '2026-02-22 18:05:42', '2024-02-20 00:00:00', '2026-02-20 03:30:28', '2026-02-22 12:35:42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(62, NULL, 'contacted', 'Bob Johnson', 'bob.johnson@email.com', '0434567890', 'Brisbane', 5.00, 12000.00, 'Phone', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-02-25 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(63, NULL, 'proposal_sent', 'Michael Brown', 'michael.brown@email.com', '0456789012', 'Adelaide', 7.50, 16500.00, 'Referral', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-03-01 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(64, NULL, 'negotiation', 'Emily Davis', 'emily.davis@email.com', '0467890123', 'Sydney', 12.00, 28000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-03-05 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(65, NULL, 'qualified', 'Lisa Anderson', 'lisa.anderson@email.com', '0489012345', 'Brisbane', 9.00, 20000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-03-10 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(66, NULL, 'inspection_completed', 'Maria Garcia', 'maria.garcia@email.com', '0401234567', 'Adelaide', 11.00, 25000.00, 'Website', NULL, 0, 0, NULL, '2026-02-20 09:00:28', '2024-03-15 00:00:00', '2026-02-20 03:30:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(67, NULL, 'closed_won', 'Soumik', 'soumikpathak0@gmail.com', '23465768798', 'sds', 33.00, 343.00, 'Website', NULL, 1, 1, '2026-02-20 09:14:00', '2026-02-20 09:14:00', '2026-02-26 09:17:00', '2026-02-20 03:44:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(68, NULL, 'new', 'Kwang Koh', 'keib0102@naver.com', '0469 337 851', 'Croydon', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 10:00:03', NULL, '2026-02-20 04:30:03', NULL, '1019925', '{\"id\":1019925,\"idLeadSupplier\":2286033,\"name\":\"Kwang\",\"lastName\":\"Koh\",\"phone\":\"0469 337 851\",\"email\":\"keib0102@naver.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"Top quality (most expensive)\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-20 14:25:08\",\"companyName\":\"\",\"address\":\"2 Farnley St Croydon\",\"latitude\":-37.800196,\"longitude\":145.2987337,\"installationAddressLineOne\":\"2 Farnley St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Croydon\",\"installationState\":\"VIC\",\"installationPostcode\":3136,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKwang has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.::This lead was submitted via the QuotesV3 form.::This customer has indicated that they would like to receive the VIC rebate.::Lead wants to pay cash::Required for: Lowest bills & charge from solar in blackout:Kwang has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKwang has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 2 Farnley St Croydon, Croydon, VIC, 3136\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-20T04:30:03.200Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(69, NULL, 'new', 'Paul Muldowney', 'plmldwny@gmail.com', '0409 443 022', 'Rosanna', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-02-20 12:00:15', NULL, '2026-02-20 06:30:15', NULL, '1020419', '{\"id\":1020419,\"idLeadSupplier\":2286130,\"name\":\"Paul\",\"lastName\":\"Muldowney\",\"phone\":\"0409 443 022\",\"email\":\"plmldwny@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-20 16:20:07\",\"companyName\":\"\",\"address\":\"101 Hodgson St Rosanna\",\"latitude\":-37.7468241,\"longitude\":145.0748274,\"installationAddressLineOne\":\"101 Hodgson St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rosanna\",\"installationState\":\"VIC\",\"installationPostcode\":3084,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"3 phase grid connection being installed next monthLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & backups up 3-phase appliancesPaul has verified this phone number\",\"importantNotesSplit\":\"3 phase grid connection being installed next month:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout & backups up 3-phase appliances:Paul has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: 3 phase grid connection being installed next monthLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & backups up 3-phase appliancesPaul has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 2\\n\\nAddress: 101 Hodgson St Rosanna, Rosanna, VIC, 3084\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-20T06:30:15.029Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(70, NULL, 'closed_won', 'ref1', 'ref1@gmail.com', '23456788o9p0', NULL, NULL, NULL, 'referral', 69, 1, 1, '2026-02-23 13:15:28', '2026-02-23 13:15:28', NULL, '2026-02-20 08:56:50', '2026-02-23 07:45:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(71, NULL, 'closed_lost', 'dgfd', 'dfs@gm.co', '242354', NULL, NULL, NULL, 'referral', 69, 1, 0, '2026-02-20 19:03:36', '2026-02-20 19:03:36', NULL, '2026-02-20 09:03:31', '2026-02-20 13:33:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(72, NULL, 'new', 'XYZ Name', 'xyz@gmail.com', '9876567656', NULL, NULL, NULL, 'referral', 69, 0, 0, NULL, '2026-02-23 13:12:43', NULL, '2026-02-23 07:42:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(73, NULL, 'new', 'John Ho', 'johnho8088@gmail.com', '0457 333 211', 'Heathmont', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1023106', '{\"id\":1023106,\"idLeadSupplier\":2290969,\"name\":\"John\",\"lastName\":\"Ho\",\"phone\":\"0457 333 211\",\"email\":\"johnho8088@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-26 10:15:11\",\"companyName\":\"\",\"address\":\"25 Pleasant Dr Heathmont\",\"latitude\":-37.8288807,\"longitude\":145.2533825,\"installationAddressLineOne\":\"25 Pleasant Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Heathmont\",\"installationState\":\"VIC\",\"installationPostcode\":3135,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"we are also looking for heat pump for hydronic heating gas boiler replacement if possible. this will add to our electricity bill. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutJohn has verified this phone number\",\"importantNotesSplit\":\"we are also looking for heat pump for hydronic heating gas boiler replacement if possible. this will add to our electricity bill. ::Lead has consented to discussion of energy plans.::This lead was submitted via the QuotesV3 form.::This customer has indicated that they do not want the VIC rebate.::Lead wants to pay cash::Required for: Lowest bills & almost instant changeover in a blackout::John has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: we are also looking for heat pump for hydronic heating gas boiler replacement if possible. this will add to our electricity bill. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutJohn has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 25 Pleasant Dr Heathmont, Heathmont, VIC, 3135\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-28T18:30:01.139Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(74, NULL, 'new', 'Lew Satur', 'lew.satur@gmail.com', '0419 557 113', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1023058', '{\"id\":1023058,\"idLeadSupplier\":2290860,\"name\":\"Lew\",\"lastName\":\"Satur\",\"phone\":\"0419 557 113\",\"email\":\"lew.satur@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-26 02:16:09\",\"companyName\":\"\",\"address\":\"39 Debra St Rowville\",\"latitude\":-37.9360055,\"longitude\":145.2216972,\"installationAddressLineOne\":\"39 Debra St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I have an estimate from one cold caller. For new solar and battery. I’m happy to do that but we currently have a 15 year old 5 kw solar system so we may be able to just add to that or upgrade it. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & easily expandableLew has verified this phone number\",\"importantNotesSplit\":\"I have an estimate from one cold caller. For new solar and battery. I’m happy to do that but we currently have a 15 year old 5 kw solar system so we may be able to just add to that or upgrade it. :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & easily expandable:Lew has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: I have an estimate from one cold caller. For new solar and battery. I’m happy to do that but we currently have a 15 year old 5 kw solar system so we may be able to just add to that or upgrade it. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & easily expandableLew has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 39 Debra St Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-28T18:30:01.149Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(75, NULL, 'new', 'Nick Cham', 'nicho927@yahoo.com', '0422 216 453', 'Glen Waverley', 15.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1023030', '{\"id\":1023030,\"idLeadSupplier\":2290830,\"name\":\"Nick\",\"lastName\":\"Cham\",\"phone\":\"0422 216 453\",\"email\":\"nicho927@yahoo.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"15 to 20 kW\",\"systemPriceType\":\"Top quality (most expensive)\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nA home currently under construction - frame and roof completed\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-26 02:06:15\",\"companyName\":\"\",\"address\":\"3 Browning Dr Glen Waverley\",\"latitude\":-37.8644177,\"longitude\":145.175034,\"installationAddressLineOne\":\"3 Browning Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"*New build with new roof not shown on google map, sufficient to put all panel over north and west side (total panel divided by 2 sides)Prefer higher system efficiency brand/productBattary ready for EV in case required in the futureThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutNick has verified this phone number\",\"importantNotesSplit\":\"*New build with new roof not shown on google map, sufficient to put all panel over north and west side (total panel divided by 2 sides)::Prefer higher system efficiency brand/product::Battary ready for EV in case required in the future:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & almost instant changeover in a blackout:Nick has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: *New build with new roof not shown on google map, sufficient to put all panel over north and west side (total panel divided by 2 sides)Prefer higher system efficiency brand/productBattary ready for EV in case required in the futureThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutNick has verified this phone number\\n\\nFeatures: On Grid Solar\\nA home currently under construction - frame and roof completed\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 3 Browning Dr Glen Waverley, Glen Waverley, VIC, 3150\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-02-28T18:30:01.151Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(76, NULL, 'new', 'Dhruva Rastogi', 'rastogidhruva@gmail.com', '0417 059 401', 'Surrey Hills', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1022968', '{\"id\":1022968,\"idLeadSupplier\":2290800,\"name\":\"Dhruva\",\"lastName\":\"Rastogi\",\"phone\":\"0417 059 401\",\"email\":\"rastogidhruva@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-26 01:56:22\",\"companyName\":\"\",\"address\":\"464 Whitehorse Rd Surrey Hills\",\"latitude\":-37.8147172,\"longitude\":145.0946649,\"installationAddressLineOne\":\"464 Whitehorse Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Surrey Hills\",\"installationState\":\"VIC\",\"installationPostcode\":3127,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"looking for mid range quality and best payoff/reduction in ongoing costs - may add in an EV charger moving forward alsoThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesDhruva has verified this phone number\",\"importantNotesSplit\":\"looking for mid range quality and best payoff/reduction in ongoing costs - may add in an EV charger moving forward also:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliances:Dhruva has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: looking for mid range quality and best payoff/reduction in ongoing costs - may add in an EV charger moving forward alsoThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesDhruva has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 464 Whitehorse Rd Surrey Hills, Surrey Hills, VIC, 3127\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-28T18:30:01.153Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(77, NULL, 'new', 'CHOOLANIE MAYADUNNE', 'choolanie@hotmail.com', '0433 428 862', 'Wantirna South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1022886', '{\"id\":1022886,\"idLeadSupplier\":2290508,\"name\":\"CHOOLANIE\",\"lastName\":\"MAYADUNNE\",\"phone\":\"0433 428 862\",\"email\":\"choolanie@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Hybrid System (Grid Connect with Batteries)\",\"leadType\":\"Hybrid Systems\",\"submittedDate\":\"2026-02-25 16:50:28\",\"companyName\":\"\",\"address\":\"62 Fonteyn Dr Wantirna South\",\"latitude\":-37.8819885,\"longitude\":145.2202527,\"installationAddressLineOne\":\"62 Fonteyn Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wantirna South\",\"installationState\":\"VIC\",\"installationPostcode\":3152,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"We have 3.3 kW solar system right now, which is 9 years old. That has to be removed and a new solar system, having maximum number of panels + 42 kWh battery has to be installed.Lead has consented to discussion of energy plans.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashAmount of storage required: I don\'t knowRequired for: Quickest payback time & charge from solar in blackoutCHOOLANIE has verified this phone number\",\"importantNotesSplit\":\"We have 3.3 kW solar system right now, which is 9 years old. That has to be removed and a new solar system, having maximum number of panels + 42 kWh battery has to be installed.:Lead has consented to discussion of energy plans.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Amount of storage required: I don\'t know:Required for: Quickest payback time & charge from solar in blackout:CHOOLANIE has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":2,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: We have 3.3 kW solar system right now, which is 9 years old. That has to be removed and a new solar system, having maximum number of panels + 42 kWh battery has to be installed.Lead has consented to discussion of energy plans.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashAmount of storage required: I don\'t knowRequired for: Quickest payback time & charge from solar in blackoutCHOOLANIE has verified this phone number\\n\\nFeatures: Hybrid System (Grid Connect with Batteries)\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 62 Fonteyn Dr Wantirna South, Wantirna South, VIC, 3152\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-28T18:30:01.155Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(78, NULL, 'new', 'Ray Borrett', 'borrettray@gmail.com', '0419 366 476', 'Glen Waverley', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1022715', '{\"id\":1022715,\"idLeadSupplier\":2290247,\"name\":\"Ray\",\"lastName\":\"Borrett\",\"phone\":\"0419 366 476\",\"email\":\"borrettray@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-02-25 12:25:16\",\"companyName\":\"\",\"address\":\"5 Karnak Ct Glen Waverley\",\"latitude\":-37.8864125,\"longitude\":145.1802515,\"installationAddressLineOne\":\"5 Karnak Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutRay has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout:Ray has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutRay has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 5 Karnak Ct Glen Waverley, Glen Waverley, VIC, 3150\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-02-28T18:30:01.156Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(79, NULL, 'new', 'Irving Dela Cruz', 'mr.itdc@yahoo.com', '0403 969 803', 'Keysborough', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1022635', '{\"id\":1022635,\"idLeadSupplier\":2290121,\"name\":\"Irving\",\"lastName\":\"Dela Cruz\",\"phone\":\"0403 969 803\",\"email\":\"mr.itdc@yahoo.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-25 10:35:15\",\"companyName\":\"\",\"address\":\"142 Stanley Rd Keysborough\",\"latitude\":-38.0051399,\"longitude\":145.1665904,\"installationAddressLineOne\":\"142 Stanley Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Keysborough\",\"installationState\":\"VIC\",\"installationPostcode\":3173,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"The property is an investment property so will need to co-ordinate with the real estate agent 0412 822 729 (David) to schedule a time to visit the property.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5kw inverter ModelGW5000-DNS-30Required for: Lowest bills, charge from solar in blackout & easily expandableIrving has verified this phone number\",\"importantNotesSplit\":\"The property is an investment property so will need to co-ordinate with the real estate agent 0412 822 729 (David) to schedule a time to visit the property.::This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Goodwe 5kw inverter ModelGW5000-DNS-30::Required for: Lowest bills, charge from solar in blackout & easily expandable::Irving has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: The property is an investment property so will need to co-ordinate with the real estate agent 0412 822 729 (David) to schedule a time to visit the property.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5kw inverter ModelGW5000-DNS-30Required for: Lowest bills, charge from solar in blackout & easily expandableIrving has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 142 Stanley Rd Keysborough, Keysborough, VIC, 3173\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-28T18:30:01.158Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(80, NULL, 'new', 'Anura Appu Vitharanalage', 'anuragems@yahoo.com', '0435 233 892', 'Glen Waverley', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-01 00:00:01', NULL, '2026-02-28 18:30:01', NULL, '1022550', '{\"id\":1022550,\"idLeadSupplier\":2290015,\"name\":\"Anura\",\"lastName\":\"Appu Vitharanalage\",\"phone\":\"0435 233 892\",\"email\":\"anuragems@yahoo.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-02-25 08:35:16\",\"companyName\":\"\",\"address\":\"4 Nottingham St Glen Waverley\",\"latitude\":-37.8680459,\"longitude\":145.1543031,\"installationAddressLineOne\":\"4 Nottingham St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Here are the my request Solax - battery with 51kwh Dc coupled 20kw hybrid inverterSingle stack Blackout Upgrading meter board  3 phase Full installation Please let me know the price you can do best. Thanks Indy This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Here are the my request Solax - battery with 51kwh Dc coupled 20kw hybrid inverterSingle stack Blackout Upgrading meter board  3 phase Full installation Please let me know the price you can do best. Thanks Indy Required for: Lowest bills, charge from solar in blackout & backups up 3-phase appliancesAnura has verified this phone number\",\"importantNotesSplit\":\"Here are the my request :::Solax - battery with 51kwh :::Dc coupled :::20kw hybrid inverter:::Single stack :::Blackout :::Upgrading meter board  :::3 phase :::Full installation :::Please let me know the price you can do best. :::Thanks ::::Indy ::This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Here are the my request :::Solax - battery with 51kwh :::Dc coupled :::20kw hybrid inverter:::Single stack :::Blackout :::Upgrading meter board  :::3 phase :::Full installation :::Please let me know the price you can do best. :::Thanks ::::Indy ::Required for: Lowest bills, charge from solar in blackout & backups up 3-phase appliances::Anura has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Here are the my request Solax - battery with 51kwh Dc coupled 20kw hybrid inverterSingle stack Blackout Upgrading meter board  3 phase Full installation Please let me know the price you can do best. Thanks Indy This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Here are the my request Solax - battery with 51kwh Dc coupled 20kw hybrid inverterSingle stack Blackout Upgrading meter board  3 phase Full installation Please let me know the price you can do best. Thanks Indy Required for: Lowest bills, charge from solar in blackout & backups up 3-phase appliancesAnura has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 4 Nottingham St Glen Waverley, Glen Waverley, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-02-28T18:30:01.159Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(81, NULL, 'closed_won', 'Friend 1', 'friend1@gmail.com', '4235656875', NULL, NULL, NULL, 'referral', 69, 1, 1, '2026-03-01 12:16:01', '2026-03-01 12:16:01', NULL, '2026-03-01 06:44:41', '2026-03-01 06:46:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(82, NULL, 'new', 'Alfredo Roldan', 'roldan.acchristian@gmail.com', '0481 242 765', 'Junction Village', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025756', '{\"id\":1025756,\"idLeadSupplier\":2295511,\"name\":\"Alfredo\",\"lastName\":\"Roldan\",\"phone\":\"0481 242 765\",\"email\":\"roldan.acchristian@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 13:45:29\",\"companyName\":\"\",\"address\":\"49 Contata Grv Junction Village\",\"latitude\":-38.1324441,\"longitude\":145.289868,\"installationAddressLineOne\":\"49 Contata Grv\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Junction Village\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SAJ R5 series (R5-8k-S2-15)Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutAlfredo  has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: SAJ R5 series (R5-8k-S2-15):Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Alfredo  has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: SAJ R5 series (R5-8k-S2-15)Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutAlfredo  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 49 Contata Grv Junction Village, Junction Village, VIC, 3977\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.725Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(83, NULL, 'new', 'Jagjeet Jawalekar', 'jagjeet28@yahoo.com', '0412 480 754', 'Aspendale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025616', '{\"id\":1025616,\"idLeadSupplier\":2295298,\"name\":\"Jagjeet\",\"lastName\":\"Jawalekar\",\"phone\":\"0412 480 754\",\"email\":\"jagjeet28@yahoo.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 10:25:13\",\"companyName\":\"\",\"address\":\"3 Carinya Ave Aspendale\",\"latitude\":-38.0196785,\"longitude\":145.1031351,\"installationAddressLineOne\":\"3 Carinya Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Aspendale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primoRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Jagjeet has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Fronius primo::Required for: Quickest payback time & almost instant changeover in a blackout::This is an ORIGIN lead.::Jagjeet has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primoRequired for: Quickest payback time & almost instant changeover in a blackoutThis is an ORIGIN lead.Jagjeet has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 3 Carinya Ave Aspendale, Aspendale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.739Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(84, NULL, 'new', 'Edwin Yapp', 'edwin.yapp@outlook.com', '0400 150 118', 'Mont Albert North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025405', '{\"id\":1025405,\"idLeadSupplier\":2295113,\"name\":\"Edwin\",\"lastName\":\"Yapp\",\"phone\":\"0400 150 118\",\"email\":\"edwin.yapp@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 01:26:00\",\"companyName\":\"\",\"address\":\"71 Box Hill Cres Mont Albert North\",\"latitude\":-37.8021916,\"longitude\":145.1152093,\"installationAddressLineOne\":\"71 Box Hill Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mont Albert North\",\"installationState\":\"VIC\",\"installationPostcode\":3129,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate)Existing inverter type: Sungrow SH5.0RSRequired for: Lowest bills & easily expandableEdwin has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate):Existing inverter type: Sungrow SH5.0RS:Required for: Lowest bills & easily expandable:Edwin has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: Sungrow SBR096 (wanting to add 2 x 3.2 kWh modules for federal rebate)Existing inverter type: Sungrow SH5.0RSRequired for: Lowest bills & easily expandableEdwin has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 71 Box Hill Cres Mont Albert North, Mont Albert North, VIC, 3129\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.741Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(85, NULL, 'new', 'Alvin Noveloso', 'alvin.noveloso@gmail.com', '0403 137 531', 'Hallam', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025519', '{\"id\":1025519,\"idLeadSupplier\":2295070,\"name\":\"Alvin\",\"lastName\":\"Noveloso\",\"phone\":\"0403 137 531\",\"email\":\"alvin.noveloso@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-03 22:55:12\",\"companyName\":\"\",\"address\":\"3 Bindi Cl Hallam\",\"latitude\":-38.0125009,\"longitude\":145.276061,\"installationAddressLineOne\":\"3 Bindi Cl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Hallam\",\"installationState\":\"VIC\",\"installationPostcode\":3803,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsThis is an ORIGIN lead.Alvin has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Unknown:Required for: Lowest bills:This is an ORIGIN lead.:Alvin has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsThis is an ORIGIN lead.Alvin has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 3 Bindi Cl Hallam, Hallam, VIC, 3803\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.744Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(86, NULL, 'new', 'Kath Burke', 'kmburke@fastmail.com', '0435 061 979', 'Springvale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025494', '{\"id\":1025494,\"idLeadSupplier\":2295043,\"name\":\"Kath\",\"lastName\":\"Burke\",\"phone\":\"0435 061 979\",\"email\":\"kmburke@fastmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-03 21:25:36\",\"companyName\":\"\",\"address\":\"11 Burden St Springvale\",\"latitude\":-37.9414515,\"longitude\":145.1456521,\"installationAddressLineOne\":\"11 Burden St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Springvale\",\"installationState\":\"VIC\",\"installationPostcode\":3171,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKath has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:Kath has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st call made, but did not pick left a voicemail and a text\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutKath has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 11 Burden St Springvale, Springvale, VIC, 3171\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.748Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(87, NULL, 'new', 'Jeff Hales', 'jehales@bigpond.com', '0425 890 730', 'Mooroolbark', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025474', '{\"id\":1025474,\"idLeadSupplier\":2295026,\"name\":\"Jeff\",\"lastName\":\"Hales\",\"phone\":\"0425 890 730\",\"email\":\"jehales@bigpond.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-03 20:35:08\",\"companyName\":\"\",\"address\":\"5 Ryrie Place Mooroolbark\",\"latitude\":-37.7812159,\"longitude\":145.325434,\"installationAddressLineOne\":\"5 Ryrie Place\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mooroolbark\",\"installationState\":\"VIC\",\"installationPostcode\":3138,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"It is a new unit within a retirement village and is on the lower level of a 2 level building. We understand that electrical conduits to enable installation of solar panels was pre-run to our unit during construction. A Zappi car charger has already been installed in garage. We are moving in on 15/4; installation is to be after this date.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Jeff has verified this phone number\",\"importantNotesSplit\":\"It is a new unit within a retirement village and is on the lower level of a 2 level building. We understand that electrical conduits to enable installation of solar panels was pre-run to our unit during construction. A Zappi car charger has already been installed in garage. We are moving in on 15/4; installation is to be after this date.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout:This is an ORIGIN lead.:Jeff has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Needs a quote as the property will be leased out, the property is a part of retirement village. Need to send a quote but we dont know yet the property details so have to ask all the details over the email.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: It is a new unit within a retirement village and is on the lower level of a 2 level building. We understand that electrical conduits to enable installation of solar panels was pre-run to our unit during construction. A Zappi car charger has already been installed in garage. We are moving in on 15/4; installation is to be after this date.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Jeff has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 5 Ryrie Place Mooroolbark, Mooroolbark, VIC, 3138\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-04T04:30:02.750Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(88, NULL, 'new', 'Richard Van Der Merwe', 'richard.vandermerwe@hotmail.com', '0414 503 037', 'Williamstown', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025406', '{\"id\":1025406,\"idLeadSupplier\":2294922,\"name\":\"Richard\",\"lastName\":\"Van Der Merwe\",\"phone\":\"0414 503 037\",\"email\":\"richard.vandermerwe@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\\nRichard specifically requested a quote from Xtechs Renewables Pty Ltd\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-03 17:50:09\",\"companyName\":\"\",\"address\":\"56 Electra St Williamstown\",\"latitude\":-37.8602269,\"longitude\":144.898438,\"installationAddressLineOne\":\"56 Electra St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Williamstown\",\"installationState\":\"VIC\",\"installationPostcode\":3016,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"battery only as we have a slate roof, so it is not suitable for solar panels. Interested in using free electricity plans in middle of day to charge batteryLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Richard has verified this phone number\",\"importantNotesSplit\":\"battery only as we have a slate roof, so it is not suitable for solar panels. Interested in using free electricity plans in middle of day to charge battery:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Richard has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: battery only as we have a slate roof, so it is not suitable for solar panels. Interested in using free electricity plans in middle of day to charge batteryLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest billsThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Richard has verified this phone number\\n\\nFeatures: Battery System\\nRichard specifically requested a quote from Xtechs Renewables Pty Ltd\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 56 Electra St Williamstown, Williamstown, VIC, 3016\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.752Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(89, NULL, 'new', 'Dominic Elfick', 'domontheroad@live.com', '0409 828 482', 'Emerald', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1025375', '{\"id\":1025375,\"idLeadSupplier\":2294872,\"name\":\"Dominic\",\"lastName\":\"Elfick\",\"phone\":\"0409 828 482\",\"email\":\"domontheroad@live.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-03 16:25:08\",\"companyName\":\"\",\"address\":\"55 Macclesfield Rd Emerald\",\"latitude\":-37.9151587,\"longitude\":145.4700627,\"installationAddressLineOne\":\"55 Macclesfield Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Emerald\",\"installationState\":\"VIC\",\"installationPostcode\":3782,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I would really like to keep my microinverters as they work very well. I would definitely like to be able tyo charge in a blackout and if possible I would like the opportunity to maintain the switch over to generator that I currently have. I would like to get 6the largest system taht I can afford. My peak daily usage last year was around 40KwH. This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: The system is just over 5Kw with micro inverters. I do not know the brand.Required for: Blackout Protection, charge from solar in blackout & easily expandableDominic has verified this phone number\",\"importantNotesSplit\":\"I would really like to keep my microinverters as they work very well. I would definitely like to be able tyo charge in a blackout and if possible I would like the opportunity to maintain the switch over to generator that I currently have. I would like to get 6the largest system taht I can afford. My peak daily usage last year was around 40KwH. :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: The system is just over 5Kw with micro inverters. I do not know the brand.:Required for: Blackout Protection, charge from solar in blackout & easily expandable:Dominic has verified this phone number\",\"requestedQuotes\":3,\"note\":\"2) Site Inspection Details:&#13;\\n&#13;\\nProperty Address : 55 Macclesfield Rd , Emerald VIC 3782, Australia&#13;\\nName : Dominic Elfick&#13;\\nEmail : domontheroad@live.com&#13;\\nContact : 0409 828 482&#13;\\nAppointment Date : 03/03/2026&#13;\\nTime : 11.00am&#13;\\nProperty Details : Single Storey&#13;\\nSite Inspector : Liam&#13;\\n&#13;\\nWants a battery but current panels are installed along with micro inverters. Planning for heat pump and EV in future so also want to future proof but do not want to remove the old micro inverters.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I would really like to keep my microinverters as they work very well. I would definitely like to be able tyo charge in a blackout and if possible I would like the opportunity to maintain the switch over to generator that I currently have. I would like to get 6the largest system taht I can afford. My peak daily usage last year was around 40KwH. This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: The system is just over 5Kw with micro inverters. I do not know the brand.Required for: Blackout Protection, charge from solar in blackout & easily expandableDominic has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 55 Macclesfield Rd Emerald, Emerald, VIC, 3782\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.754Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(90, NULL, 'new', 'Gourab Rout', 'gourab.rout@gmail.com', '411181691', 'Mount Waverley', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 10:00:02', NULL, '2026-03-04 04:30:02', NULL, '1024990', '{\"id\":1024990,\"idLeadSupplier\":2294508,\"name\":\"Gourab\",\"lastName\":\"Rout\",\"phone\":411181691,\"email\":\"gourab.rout@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-03 11:10:09\",\"companyName\":\"\",\"address\":\"44 Alice St Mount Waverley\",\"latitude\":-37.866563,\"longitude\":145.1272612,\"installationAddressLineOne\":\"44 Alice St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mount Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3149,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EVERSOL TL3000Required for: Quickest payback time & easily expandableGourab has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: EVERSOL TL3000::Required for: Quickest payback time & easily expandable:Gourab has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: EVERSOL TL3000Required for: Quickest payback time & easily expandableGourab has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 2\\n\\nAddress: 44 Alice St Mount Waverley, Mount Waverley, VIC, 3149\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T04:30:02.756Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(91, NULL, 'new', 'Jie Sun', 'dasj206@gmail.com', '0430 015 359', 'Narre Warren South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-04 14:00:02', NULL, '2026-03-04 08:30:02', NULL, '1025886', '{\"id\":1025886,\"idLeadSupplier\":2295779,\"name\":\"Jie\",\"lastName\":\"Sun\",\"phone\":\"0430 015 359\",\"email\":\"dasj206@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-04 18:05:24\",\"companyName\":\"\",\"address\":\"12 Fabriano Pl Narre Warren South\",\"latitude\":-38.0564402,\"longitude\":145.3194198,\"installationAddressLineOne\":\"12 Fabriano Pl\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren South\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Jie has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:This is an ORIGIN lead.:Jie has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutThis is an ORIGIN lead.Jie has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 12 Fabriano Pl Narre Warren South, Narre Warren South, VIC, 3805\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-04T08:30:02.239Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(92, NULL, 'new', 'Faye Phillips', 'fmp1257@gmail.com', '0429 964 075', 'Junction Village', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026696', '{\"id\":1026696,\"idLeadSupplier\":2297270,\"name\":\"Faye\",\"lastName\":\"Phillips\",\"phone\":\"0429 964 075\",\"email\":\"fmp1257@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Increase size of existing solar system\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-06 15:05:58\",\"companyName\":\"\",\"address\":\"7 Sherwood Rd Junction Village\",\"latitude\":-38.1366266,\"longitude\":145.2933876,\"installationAddressLineOne\":\"7 Sherwood Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Junction Village\",\"installationState\":\"VIC\",\"installationPostcode\":3977,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashFaye has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Faye has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"Yes\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashFaye has verified this phone number\\n\\nFeatures: Increase size of existing solar system\\n\\nHave Battery: Yes\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 7 Sherwood Rd Junction Village, Junction Village, VIC, 3977\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-06T18:30:01.526Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(93, NULL, 'new', 'Matthew Spears', 'matthew@spearsconstructions.com', '0417 889 008', 'Belgrave South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026692', '{\"id\":1026692,\"idLeadSupplier\":2297260,\"name\":\"Matthew\",\"lastName\":\"Spears\",\"phone\":\"0417 889 008\",\"email\":\"matthew@spearsconstructions.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 15:05:31\",\"companyName\":\"\",\"address\":\"95 Blumm Rd Belgrave South\",\"latitude\":-37.9417008,\"longitude\":145.3753348,\"installationAddressLineOne\":\"95 Blumm Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Belgrave South\",\"installationState\":\"VIC\",\"installationPostcode\":3160,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: l have X2 Fronius Primo 5.5 units So that means l have X2 MPPTRequired for: Blackout Protection, charge from solar in blackout & easily expandableMatthew has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: l have X2 Fronius Primo 5.5 units ::So that means l have X2 MPPT:::Required for: Blackout Protection, charge from solar in blackout & easily expandable:Matthew has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: l have X2 Fronius Primo 5.5 units So that means l have X2 MPPTRequired for: Blackout Protection, charge from solar in blackout & easily expandableMatthew has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 95 Blumm Rd Belgrave South, Belgrave South, VIC, 3160\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-06T18:30:01.535Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(94, NULL, 'new', 'Shourya Ghosh', 'ghosh.shourjyo@gmail.com', '0404 689 098', 'Narre Warren', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026567', '{\"id\":1026567,\"idLeadSupplier\":2297001,\"name\":\"Shourya\",\"lastName\":\"Ghosh\",\"phone\":\"0404 689 098\",\"email\":\"ghosh.shourjyo@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 11:25:28\",\"companyName\":\"\",\"address\":\"7-9 Denise Ct Narre Warren\",\"latitude\":-38.0081524,\"longitude\":145.3108267,\"installationAddressLineOne\":\"7-9 Denise Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & easily expandableShourya has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & easily expandable:Shourya has verified this phone number\",\"requestedQuotes\":3,\"note\":\"needs a site inspection on monday, after 12 so need to plan accordingly&#13;\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & easily expandableShourya has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 7-9 Denise Ct Narre Warren, Narre Warren, VIC, 3805\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-06T18:30:01.538Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(95, NULL, 'new', 'Too Choong', 'toochoong@hotmail.com', '0407 685 070', 'Lysterfield South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026509', '{\"id\":1026509,\"idLeadSupplier\":2296888,\"name\":\"Too\",\"lastName\":\"Choong\",\"phone\":\"0407 685 070\",\"email\":\"toochoong@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 09:35:14\",\"companyName\":\"\",\"address\":\"12 Forrest Hill Grove Lysterfield South\",\"latitude\":-37.9542008,\"longitude\":145.2732978,\"installationAddressLineOne\":\"12 Forrest Hill Grove\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lysterfield South\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: SMARequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutToo has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: SMA:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Too has verified this phone number\",\"requestedQuotes\":3,\"note\":\"monday, Needs in the morning\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: SMARequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutToo has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 12 Forrest Hill Grove Lysterfield South, Lysterfield South, VIC, 3156\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-06T18:30:01.548Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(96, NULL, 'new', 'Anthony Wong', 'anthonyandtammy1229@gmail.com', '0420 428 886', 'Doncaster East', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026431', '{\"id\":1026431,\"idLeadSupplier\":2296758,\"name\":\"Anthony\",\"lastName\":\"Wong\",\"phone\":\"0420 428 886\",\"email\":\"anthonyandtammy1229@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 01:36:01\",\"companyName\":\"\",\"address\":\"9 Rosamond Cres Doncaster East\",\"latitude\":-37.7864458,\"longitude\":145.1639926,\"installationAddressLineOne\":\"9 Rosamond Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Doncaster East\",\"installationState\":\"VIC\",\"installationPostcode\":3109,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: sofar solarRequired for: Lowest bills & charge from solar in blackoutAnthony  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: sofar solar:Required for: Lowest bills & charge from solar in blackout:Anthony  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: sofar solarRequired for: Lowest bills & charge from solar in blackoutAnthony  has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 9 Rosamond Cres Doncaster East, Doncaster East, VIC, 3109\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-06T18:30:01.550Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(97, NULL, 'new', 'Nenad Knezevic', 'gimmealatte@hotmail.com', '0403 216 706', 'Mooroolbark', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026390', '{\"id\":1026390,\"idLeadSupplier\":2296750,\"name\":\"Nenad\",\"lastName\":\"Knezevic\",\"phone\":\"0403 216 706\",\"email\":\"gimmealatte@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-06 01:35:39\",\"companyName\":\"\",\"address\":\"15 Greenbank Dr Mooroolbark\",\"latitude\":-37.7617506,\"longitude\":145.3203574,\"installationAddressLineOne\":\"15 Greenbank Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mooroolbark\",\"installationState\":\"VIC\",\"installationPostcode\":3138,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Nenad has verified this phone number\",\"importantNotesSplit\":\"There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. :This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & easily expandable:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Nenad has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: There is an old sunny boy inverter from the old solar installation that will require removal. Panels have been removed and disposed of. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Nenad has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 15 Greenbank Dr Mooroolbark, Mooroolbark, VIC, 3138\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-06T18:30:01.552Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(98, NULL, 'new', 'Mich Eeves', 'wecanpluck@duck.com', '0430 108 325', 'Ferntree Gully', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026269', '{\"id\":1026269,\"idLeadSupplier\":2296701,\"name\":\"Mich\",\"lastName\":\"Eeves\",\"phone\":\"0430 108 325\",\"email\":\"wecanpluck@duck.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-06 01:20:09\",\"companyName\":\"\",\"address\":\"25 Austin St Ferntree Gully\",\"latitude\":-37.8837646,\"longitude\":145.2855883,\"installationAddressLineOne\":\"25 Austin St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ferntree Gully\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,sTaa.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & easily expandableMich has verified this phone number\",\"importantNotesSplit\":\"More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,s::Taa.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Blackout Protection & easily expandable:Mich has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Have sent him my email will share the details over the email then site inspection\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: More installers please. Have some prerequisetes that will put me in the \'too hard\' bin for many Co,sTaa.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & easily expandableMich has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 25 Austin St Ferntree Gully, Ferntree Gully, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-06T18:30:01.554Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(99, NULL, 'new', 'Jill  Tim DSouza', 'jill_krelle@yahoo.com.au', '0402 431 939', 'Heathmont', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026418', '{\"id\":1026418,\"idLeadSupplier\":2296674,\"name\":\"Jill  Tim\",\"lastName\":\"DSouza\",\"phone\":\"0402 431 939\",\"email\":\"jill_krelle@yahoo.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-05 22:20:07\",\"companyName\":\"\",\"address\":\"17-23 Marlborough Rd Heathmont\",\"latitude\":-37.8355778,\"longitude\":145.2321258,\"installationAddressLineOne\":\"17-23 Marlborough Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Heathmont\",\"installationState\":\"VIC\",\"installationPostcode\":3135,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutJill  Tim  has verified this phone number\",\"importantNotesSplit\":\"Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. :This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:Jill  Tim  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"monday, need to give a time\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Looking for 10-12kw system. Not sure if I want to get a battery at this point but maybe an inverter so I can add a battery later on. This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutJill  Tim  has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 17-23 Marlborough Rd Heathmont, Heathmont, VIC, 3135\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-06T18:30:01.555Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(100, NULL, 'new', 'Anand Shanmugam', 'ananthsua@gmail.com', '0468 468 476', 'Berwick', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 00:00:01', NULL, '2026-03-06 18:30:01', NULL, '1026392', '{\"id\":1026392,\"idLeadSupplier\":2296659,\"name\":\"Anand\",\"lastName\":\"Shanmugam\",\"phone\":\"0468 468 476\",\"email\":\"ananthsua@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-05 21:15:06\",\"companyName\":\"\",\"address\":\"17 Colson Wy Berwick\",\"latitude\":-38.0483117,\"longitude\":145.324672,\"installationAddressLineOne\":\"17 Colson Wy\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Berwick\",\"installationState\":\"VIC\",\"installationPostcode\":3806,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back upsThis lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025Existing inverter type: Solax Power Network TechModel - X1-Boost-5K-G4Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Anand has verified this phone number\",\"importantNotesSplit\":\"I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back ups:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025:Existing inverter type: Solax Power Network Tech::Model - X1-Boost-5K-G4:Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Anand has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: I want to install both Batteries and increase my existing solar with another 10KW with blackout protection and back upsThis lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: 6.6kw Jinko Panels and 5kw Solax inverter installed in Sep 2025Existing inverter type: Solax Power Network TechModel - X1-Boost-5K-G4Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Anand has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 17 Colson Wy Berwick, Berwick, VIC, 3806\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-06T18:30:01.557Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(101, NULL, 'new', 'LAURENCE WALSH', 'lmwalsh8@gmail.com', '0404 098 591', 'Croydon Hills', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 12:00:01', NULL, '2026-03-07 06:30:01', NULL, '1026990', '{\"id\":1026990,\"idLeadSupplier\":2297776,\"name\":\"LAURENCE\",\"lastName\":\"WALSH\",\"phone\":\"0404 098 591\",\"email\":\"lmwalsh8@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-07 12:15:08\",\"companyName\":\"\",\"address\":\"74 Bemboka Rd Croydon Hills\",\"latitude\":-37.7744051,\"longitude\":145.2579883,\"installationAddressLineOne\":\"74 Bemboka Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Croydon Hills\",\"installationState\":\"VIC\",\"installationPostcode\":3136,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Small to medium size battery Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableLAURENCE has verified this phone number\",\"importantNotesSplit\":\"Small to medium size battery :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:LAURENCE has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Small to medium size battery Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableLAURENCE has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 74 Bemboka Rd Croydon Hills, Croydon Hills, VIC, 3136\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-07T06:30:01.873Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(102, NULL, 'new', 'Hamid Rezatofighi', 'hamid.rt63@gmail.com', '0404 518 200', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 12:00:01', NULL, '2026-03-07 06:30:01', NULL, '1026978', '{\"id\":1026978,\"idLeadSupplier\":2297756,\"name\":\"Hamid\",\"lastName\":\"Rezatofighi\",\"phone\":\"0404 518 200\",\"email\":\"hamid.rt63@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 11:45:17\",\"companyName\":\"\",\"address\":\"31 Reservoir Cres Rowville\",\"latitude\":-37.9430964,\"longitude\":145.2500245,\"installationAddressLineOne\":\"31 Reservoir Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutThis is an ORIGIN lead.Hamid has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & almost instant changeover in a blackout:This is an ORIGIN lead.:Hamid has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & almost instant changeover in a blackoutThis is an ORIGIN lead.Hamid has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 31 Reservoir Cres Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-07T06:30:01.883Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(103, NULL, 'new', 'John Forshaw', 'lj_forshaw@hotmail.com', '0438 103 929', 'Langwarrin', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 12:00:01', NULL, '2026-03-07 06:30:01', NULL, '1026935', '{\"id\":1026935,\"idLeadSupplier\":2297699,\"name\":\"John\",\"lastName\":\"Forshaw\",\"phone\":\"0438 103 929\",\"email\":\"lj_forshaw@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-07 10:35:08\",\"companyName\":\"\",\"address\":\"44 Lyppards Rd Langwarrin\",\"latitude\":-38.1320792,\"longitude\":145.2225177,\"installationAddressLineOne\":\"44 Lyppards Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Langwarrin\",\"installationState\":\"VIC\",\"installationPostcode\":3910,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Home back upSingle battery stack Possible to add more panels in the futureAble to handle 15kwh max draw This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutJohn has verified this phone number\",\"importantNotesSplit\":\"Home back up::Single battery stack ::Possible to add more panels in the future::Able to handle 15kwh max draw :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe:Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackout:John has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Home back upSingle battery stack Possible to add more panels in the futureAble to handle 15kwh max draw This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutJohn has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 44 Lyppards Rd Langwarrin, Langwarrin, VIC, 3910\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-07T06:30:01.887Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(104, NULL, 'new', 'Garry Yin', 'garry0228@gmail.com', '0434 500 238', 'Glen Waverley', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 18:00:01', NULL, '2026-03-07 12:30:01', NULL, '1027121', '{\"id\":1027121,\"idLeadSupplier\":2297981,\"name\":\"Garry\",\"lastName\":\"Yin\",\"phone\":\"0434 500 238\",\"email\":\"garry0228@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 18:10:24\",\"companyName\":\"\",\"address\":\"7 Joyce Ave Glen Waverley\",\"latitude\":-37.8905006,\"longitude\":145.1688366,\"installationAddressLineOne\":\"7 Joyce Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest billsGarry has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills:Garry has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest billsGarry has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 7 Joyce Ave Glen Waverley, Glen Waverley, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-07T12:30:01.834Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(105, NULL, 'new', 'Amanda Smith', 'ajsmith33@gmail.com', '0408 537 326', 'Heatherton', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-07 18:00:01', NULL, '2026-03-07 12:30:01', NULL, '1027114', '{\"id\":1027114,\"idLeadSupplier\":2297963,\"name\":\"Amanda\",\"lastName\":\"Smith\",\"phone\":\"0408 537 326\",\"email\":\"ajsmith33@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-07 17:15:08\",\"companyName\":\"\",\"address\":\"30 St Andrews Dr Heatherton\",\"latitude\":-37.9588706,\"longitude\":145.0819048,\"installationAddressLineOne\":\"30 St Andrews Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Heatherton\",\"installationState\":\"VIC\",\"installationPostcode\":3202,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primo 3.5-1 (1)Required for: Lowest billsAmanda has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius primo 3.5-1 (1):Required for: Lowest bills:Amanda has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius primo 3.5-1 (1)Required for: Lowest billsAmanda has verified this phone number\\n\\nFeatures: Battery System\\nIncrease size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 30 St Andrews Dr Heatherton, Heatherton, VIC, 3202\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-07T12:30:01.839Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(106, NULL, 'new', 'Mike Tsakmakis', 'Mike.tsakmakis@gmail.com', '0430 102 602', 'Bulleen', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1029258', '{\"id\":1029258,\"idLeadSupplier\":2301752,\"name\":\"Mike\",\"lastName\":\"Tsakmakis\",\"phone\":\"0430 102 602\",\"email\":\"Mike.tsakmakis@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 23:10:09\",\"companyName\":\"\",\"address\":\"4 Eama Ct Bulleen\",\"latitude\":-37.7739755,\"longitude\":145.0989954,\"installationAddressLineOne\":\"4 Eama Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bulleen\",\"installationState\":\"VIC\",\"installationPostcode\":3105,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Email only please. I won\'t be able to receive calls.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandableThis is an ORIGIN lead.Mike has verified this phone number\",\"importantNotesSplit\":\"Email only please. I won\'t be able to receive calls.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandable:This is an ORIGIN lead.:Mike has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Email only please. I won\'t be able to receive calls.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, backups up 3-phase appliances & easily expandableThis is an ORIGIN lead.Mike has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 2\\n\\nAddress: 4 Eama Ct Bulleen, Bulleen, VIC, 3105\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T18:30:01.320Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(107, NULL, 'new', 'Michael Lazzarini', 'lazzarinim@hotmail.com', '0414 813 111', 'Box Hill South', 15.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1029095', '{\"id\":1029095,\"idLeadSupplier\":2301618,\"name\":\"Michael\",\"lastName\":\"Lazzarini\",\"phone\":\"0414 813 111\",\"email\":\"lazzarinim@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"15 to 20 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 18:25:25\",\"companyName\":\"\",\"address\":\"24 Penrose St Box Hill South\",\"latitude\":-37.8415208,\"longitude\":145.130412,\"installationAddressLineOne\":\"24 Penrose St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Box Hill South\",\"installationState\":\"VIC\",\"installationPostcode\":3128,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I have an existing 1 kw system more than 16 years.Happy to replace or whatever you recommendLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection & almost instant changeover in a blackoutMichael has verified this phone number\",\"importantNotesSplit\":\"I have an existing 1 kw system more than 16 years.::Happy to replace or whatever you recommend:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection & almost instant changeover in a blackout:Michael has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have an existing 1 kw system more than 16 years.Happy to replace or whatever you recommendLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection & almost instant changeover in a blackoutMichael has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 24 Penrose St Box Hill South, Box Hill South, VIC, 3128\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-11T18:30:01.330Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(108, NULL, 'new', 'Gloria Beggs', 'beggs72@gmail.com', '0400 685 889', 'Seaford', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1029086', '{\"id\":1029086,\"idLeadSupplier\":2301603,\"name\":\"Gloria\",\"lastName\":\"Beggs\",\"phone\":\"0400 685 889\",\"email\":\"beggs72@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 18:05:06\",\"companyName\":\"\",\"address\":\"6 Mitchell St Seaford\",\"latitude\":-38.1053121,\"longitude\":145.1305864,\"installationAddressLineOne\":\"6 Mitchell St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Seaford\",\"installationState\":\"VIC\",\"installationPostcode\":3198,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Please call to talk through.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Gloria  has verified this phone number\",\"importantNotesSplit\":\"Please call to talk through.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe:Required for: Lowest bills & charge from solar in blackout:This is an ORIGIN lead.:Gloria  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Please call to talk through.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills & charge from solar in blackoutThis is an ORIGIN lead.Gloria  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 6 Mitchell St Seaford, Seaford, VIC, 3198\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T18:30:01.334Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(109, NULL, 'new', 'Gabriel Szalma', 'gabriel@acgabe.com.au', '0401 754 885', 'Emerald', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1028901', '{\"id\":1028901,\"idLeadSupplier\":2301324,\"name\":\"Gabriel\",\"lastName\":\"Szalma\",\"phone\":\"0401 754 885\",\"email\":\"gabriel@acgabe.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 13:20:16\",\"companyName\":\"\",\"address\":\"13 Holman Rd Emerald\",\"latitude\":-37.8975108,\"longitude\":145.4450303,\"installationAddressLineOne\":\"13 Holman Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Emerald\",\"installationState\":\"VIC\",\"installationPostcode\":3782,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"G\'day,I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.I have three SolarEdge HD-Wave inverters and 16 kWh of solar.Thanks,Gabe(I have 3 off solaredge HD wave inverters and 16kwh solar.)This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 3 off Solaredge 7kw hd wave Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableGabriel has verified this phone number\",\"importantNotesSplit\":\"G\'day,:::I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.:::I have three SolarEdge HD-Wave inverters and 16 kWh of solar.::Thanks,::Gabe::(I have 3 off solaredge HD wave inverters and 16kwh solar.):This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: 3 off Solaredge 7kw hd wave :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Gabriel has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: G\'day,I\'m looking for a price for two stacks of Sigen batteries: Stack 1 — 30 kW controller, 3 × 8 kWh batteries, base; Stack 2 — 25 kW DC charger, 3 × 8 kWh batteries, base. I also need a 3-phase gateway.I have three SolarEdge HD-Wave inverters and 16 kWh of solar.Thanks,Gabe(I have 3 off solaredge HD wave inverters and 16kwh solar.)This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: 3 off Solaredge 7kw hd wave Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableGabriel has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 13 Holman Rd Emerald, Emerald, VIC, 3782\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T18:30:01.336Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(110, NULL, 'new', 'Kylie Blyth', 'kylie@pcts.net.au', '0400 308 745', 'Lysterfield', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1028767', '{\"id\":1028767,\"idLeadSupplier\":2301059,\"name\":\"Kylie\",\"lastName\":\"Blyth\",\"phone\":\"0400 308 745\",\"email\":\"kylie@pcts.net.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"over $2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-11 10:26:00\",\"companyName\":\"\",\"address\":\"4 Regency Terrace Lysterfield\",\"latitude\":-37.9218652,\"longitude\":145.2729148,\"installationAddressLineOne\":\"4 Regency Terrace\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lysterfield\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"We have recently install a pool that has increased our most recent electricity bill quite a lot.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutKylie has verified this phone number\",\"importantNotesSplit\":\"We have recently install a pool that has increased our most recent electricity bill quite a lot.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Kylie has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: We have recently install a pool that has increased our most recent electricity bill quite a lot.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutKylie has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 2\\n\\nAddress: 4 Regency Terrace Lysterfield, Lysterfield, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T18:30:01.337Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(111, NULL, 'new', 'Stephen Patan', 'reflex.games@outlook.com', '0414 660 069', 'Wheelers Hill', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1028722', '{\"id\":1028722,\"idLeadSupplier\":2300958,\"name\":\"Stephen\",\"lastName\":\"Patan\",\"phone\":\"0414 660 069\",\"email\":\"reflex.games@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-11 08:50:24\",\"companyName\":\"\",\"address\":\"20 Garnett Rd Wheelers Hill\",\"latitude\":-37.9116209,\"longitude\":145.1971984,\"installationAddressLineOne\":\"20 Garnett Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wheelers Hill\",\"installationState\":\"VIC\",\"installationPostcode\":3150,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5 KW 1PH DNS-30Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutStephen has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe 5 KW 1PH DNS-30:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Stephen has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe 5 KW 1PH DNS-30Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutStephen has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 20 Garnett Rd Wheelers Hill, Wheelers Hill, VIC, 3150\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-11T18:30:01.339Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(112, NULL, 'new', 'BENJAMIN BOWEN', 'bbowen1987@gmail.com', '0449 586 684', 'Williamstown', 3.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-12 00:00:01', NULL, '2026-03-11 18:30:01', NULL, '1028626', '{\"id\":1028626,\"idLeadSupplier\":2300639,\"name\":\"BENJAMIN\",\"lastName\":\"BOWEN\",\"phone\":\"0449 586 684\",\"email\":\"bbowen1987@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"3 to 5 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-10 22:25:25\",\"companyName\":\"\",\"address\":\"123 Aitken St Williamstown\",\"latitude\":-37.8623621,\"longitude\":144.9012708,\"installationAddressLineOne\":\"123 Aitken St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Williamstown\",\"installationState\":\"VIC\",\"installationPostcode\":3016,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Small roof area, need high generation panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & backups up 3-phase appliancesBENJAMIN has verified this phone number\",\"importantNotesSplit\":\"Small roof area, need high generation panels:::This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & backups up 3-phase appliances:BENJAMIN has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Small roof area, need high generation panelsThis lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & backups up 3-phase appliancesBENJAMIN has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 123 Aitken St Williamstown, Williamstown, VIC, 3016\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-11T18:30:01.341Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(113, NULL, 'new', 'Ellen Xin', 'ellenxin7@hotmail.com', '0409 224 188', 'Kew', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 00:00:01', NULL, '2026-03-12 18:30:01', NULL, '1029803', '{\"id\":1029803,\"idLeadSupplier\":2302849,\"name\":\"Ellen\",\"lastName\":\"Xin\",\"phone\":\"0409 224 188\",\"email\":\"ellenxin7@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 23:40:09\",\"companyName\":\"\",\"address\":\"33 Mont Victor Rd Kew\",\"latitude\":-37.8071891,\"longitude\":145.0576466,\"installationAddressLineOne\":\"33 Mont Victor Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kew\",\"installationState\":\"VIC\",\"installationPostcode\":3101,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"remove the old panels, and install new onesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Sunny Boy SB1700 Required for: Lowest bills & charge from solar in blackoutEllen has verified this phone number\",\"importantNotesSplit\":\"remove the old panels, and install new ones:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Sunny Boy SB1700 :Required for: Lowest bills & charge from solar in blackout:Ellen has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: remove the old panels, and install new onesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Sunny Boy SB1700 Required for: Lowest bills & charge from solar in blackoutEllen has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 33 Mont Victor Rd Kew, Kew, VIC, 3101\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T18:30:01.502Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(114, NULL, 'new', 'Aiden Chan', 'kssangx5@gmail.com', '0472 760 495', 'Lyndhurst', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 00:00:01', NULL, '2026-03-12 18:30:01', NULL, '1029758', '{\"id\":1029758,\"idLeadSupplier\":2302788,\"name\":\"Aiden\",\"lastName\":\"Chan\",\"phone\":\"0472 760 495\",\"email\":\"kssangx5@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-12 20:05:24\",\"companyName\":\"\",\"address\":\"21 Tea Tree Ct Lyndhurst\",\"latitude\":-38.0656147,\"longitude\":145.2488039,\"installationAddressLineOne\":\"21 Tea Tree Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Lyndhurst\",\"installationState\":\"VIC\",\"installationPostcode\":3975,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashAiden has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Aiden has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashAiden has verified this phone number\\n\\nFeatures: On Grid Solar\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 21 Tea Tree Ct Lyndhurst, Lyndhurst, VIC, 3975\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T18:30:01.514Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(115, NULL, 'new', 'Sean Hearn', 'sshearn@hotmail.com', '0419 799 111', 'Bulleen', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 00:00:01', NULL, '2026-03-12 18:30:01', NULL, '1029682', '{\"id\":1029682,\"idLeadSupplier\":2302732,\"name\":\"Sean\",\"lastName\":\"Hearn\",\"phone\":\"0419 799 111\",\"email\":\"sshearn@hotmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 17:45:09\",\"companyName\":\"\",\"address\":\"75 Yarra Valley Blvd Bulleen\",\"latitude\":-37.760986,\"longitude\":145.0902712,\"installationAddressLineOne\":\"75 Yarra Valley Blvd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bulleen\",\"installationState\":\"VIC\",\"installationPostcode\":3105,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Would like installation before 01 May 2026 for battery rebate.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSean has verified this phone number\",\"importantNotesSplit\":\"Would like installation before 01 May 2026 for battery rebate.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Sean has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Would like installation before 01 May 2026 for battery rebate.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableSean has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 3\\n\\nAddress: 75 Yarra Valley Blvd Bulleen, Bulleen, VIC, 3105\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-12T18:30:01.521Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(116, NULL, 'new', 'Cathy Sage', 'cathy@sagewords.com.au', '0400 714 603', 'Kensington', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 00:00:01', NULL, '2026-03-12 18:30:01', NULL, '1029653', '{\"id\":1029653,\"idLeadSupplier\":2302686,\"name\":\"Cathy\",\"lastName\":\"Sage\",\"phone\":\"0400 714 603\",\"email\":\"cathy@sagewords.com.au\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Adding Batteries\\nIncrease size of existing solar system\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-12 16:30:50\",\"companyName\":\"\",\"address\":\"91 McCracken St Kensington\",\"latitude\":-37.7933281,\"longitude\":144.9279465,\"installationAddressLineOne\":\"91 McCracken St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kensington\",\"installationState\":\"VIC\",\"installationPostcode\":3031,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsCathy has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Unknown:Required for: Lowest bills:Cathy has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":[\"Solar System Upgrade\",\"Battery System Upgrade\"],\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: UnknownRequired for: Lowest billsCathy has verified this phone number\\n\\nFeatures: Adding Batteries\\nIncrease size of existing solar system\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 3\\n\\nAddress: 91 McCracken St Kensington, Kensington, VIC, 3031\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-12T18:30:01.528Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(117, NULL, 'new', 'Glynnis Owen', 'glynnis.owen@optusnet.com.au', '0411 469 764', 'Eltham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 12:00:01', NULL, '2026-03-13 06:30:01', NULL, '1030082', '{\"id\":1030082,\"idLeadSupplier\":2303472,\"name\":\"Glynnis\",\"lastName\":\"Owen\",\"phone\":\"0411 469 764\",\"email\":\"glynnis.owen@optusnet.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 13:06:01\",\"companyName\":\"\",\"address\":\"9-11 Grove St Eltham\",\"latitude\":-37.7108116,\"longitude\":145.1535576,\"installationAddressLineOne\":\"9-11 Grove St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Eltham\",\"installationState\":\"VIC\",\"installationPostcode\":3095,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"We have room for the battery to be installed in our garage.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: GoodweRequired for: Quickest payback time, almost instant changeover in a blackout & easily expandableGlynnis has verified this phone number\",\"importantNotesSplit\":\"We have room for the battery to be installed in our garage.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Goodwe:Required for: Quickest payback time, almost instant changeover in a blackout & easily expandable:Glynnis has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Glynnis booked for ash between Monday 1-2pm\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: We have room for the battery to be installed in our garage.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: GoodweRequired for: Quickest payback time, almost instant changeover in a blackout & easily expandableGlynnis has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 9-11 Grove St Eltham, Eltham, VIC, 3095\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T06:30:01.598Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(118, NULL, 'new', 'Kathryn Lowe', 'kathryn.lowe@mac.com', '0414 373 080', 'Rowville', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 12:00:01', NULL, '2026-03-13 06:30:01', NULL, '1029948', '{\"id\":1029948,\"idLeadSupplier\":2303208,\"name\":\"Kathryn\",\"lastName\":\"Lowe\",\"phone\":\"0414 373 080\",\"email\":\"kathryn.lowe@mac.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-13 10:05:33\",\"companyName\":\"\",\"address\":\"179 Murrindal Dr Rowville\",\"latitude\":-37.9091057,\"longitude\":145.2638734,\"installationAddressLineOne\":\"179 Murrindal Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Rowville\",\"installationState\":\"VIC\",\"installationPostcode\":3178,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Currently renovating and are building an extension to which we can also add solar once completed.We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableKathryn has verified this phone number\",\"importantNotesSplit\":\"Currently renovating and are building an extension to which we can also add solar once completed.::We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. :Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills & easily expandable:Kathryn has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Ashley site inspection Monday 10am\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Currently renovating and are building an extension to which we can also add solar once completed.We already have solar on our shed and would like that system assessed with the potential of adding a battery to that in addition to adding solar and battery to our house. Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills & easily expandableKathryn has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 179 Murrindal Dr Rowville, Rowville, VIC, 3178\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-13T06:30:01.608Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(119, NULL, 'new', 'David Kwong', 'kwongdavid@hotmail.com', '0455 451 967', 'Murrumbeena', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 12:00:01', NULL, '2026-03-13 06:30:01', NULL, '1029708', '{\"id\":1029708,\"idLeadSupplier\":2302952,\"name\":\"David\",\"lastName\":\"Kwong\",\"phone\":\"0455 451 967\",\"email\":\"kwongdavid@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 01:45:35\",\"companyName\":\"\",\"address\":\"28 Bute St Murrumbeena\",\"latitude\":-37.8951151,\"longitude\":145.0704236,\"installationAddressLineOne\":\"28 Bute St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Murrumbeena\",\"installationState\":\"VIC\",\"installationPostcode\":3163,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & charge from solar in blackoutThis is an ORIGIN lead.David has verified this phone number\",\"importantNotesSplit\":\"Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Blackout Protection & charge from solar in blackout:This is an ORIGIN lead.:David has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking to install some more solar ~6.6kw as well noting some may be south facing. Currently have about ~5kw installed with ~1.3kw panels taken down due to a renovation. This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Blackout Protection & charge from solar in blackoutThis is an ORIGIN lead.David has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 28 Bute St Murrumbeena, Murrumbeena, VIC, 3163\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T06:30:01.611Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(120, NULL, 'new', 'Awin Stephen', 'awinstephen@gmail.com', '0432 551 768', 'Mooroolbark', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-13 12:00:01', NULL, '2026-03-13 06:30:01', NULL, '1029706', '{\"id\":1029706,\"idLeadSupplier\":2302946,\"name\":\"Awin\",\"lastName\":\"Stephen\",\"phone\":\"0432 551 768\",\"email\":\"awinstephen@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 01:45:15\",\"companyName\":\"\",\"address\":\"5 Devon Walk Mooroolbark\",\"latitude\":-37.7745499,\"longitude\":145.3232157,\"installationAddressLineOne\":\"5 Devon Walk\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mooroolbark\",\"installationState\":\"VIC\",\"installationPostcode\":3138,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking to install before changes to rebates in MayThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW5000 MSRequired for: Quickest payback timeAwin has verified this phone number\",\"importantNotesSplit\":\"Looking to install before changes to rebates in May:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe GW5000 MS:Required for: Quickest payback time:Awin has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Monday 12pm site inspection\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking to install before changes to rebates in MayThis lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW5000 MSRequired for: Quickest payback timeAwin has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 5 Devon Walk Mooroolbark, Mooroolbark, VIC, 3138\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-13T06:30:01.613Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(121, NULL, 'new', 'Markus Wagner', 'solar@acrocon.com', '0488 996 355', 'Springvale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031533', '{\"id\":1031533,\"idLeadSupplier\":2305927,\"name\":\"Markus\",\"lastName\":\"Wagner\",\"phone\":\"0488 996 355\",\"email\":\"solar@acrocon.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-16 13:45:55\",\"companyName\":\"\",\"address\":\"12 Merton St Springvale\",\"latitude\":-37.9492746,\"longitude\":145.1582258,\"installationAddressLineOne\":\"12 Merton St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Springvale\",\"installationState\":\"VIC\",\"installationPostcode\":3171,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Phone: I can normally not pick up the phone but I will call back. Happy to arrange the in-person inspection via email.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesMarkus has verified this phone number\",\"importantNotesSplit\":\"Phone: I can normally not pick up the phone but I will call back. Happy to arrange the in-person inspection via email.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliances:Markus has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Phone: I can normally not pick up the phone but I will call back. Happy to arrange the in-person inspection via email.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesMarkus has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 12 Merton St Springvale, Springvale, VIC, 3171\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.403Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(122, NULL, 'new', 'Paul Gloury', 'paulgloury@gmail.com', '0419 501 629', 'Parkdale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031529', '{\"id\":1031529,\"idLeadSupplier\":2305922,\"name\":\"Paul\",\"lastName\":\"Gloury\",\"phone\":\"0419 501 629\",\"email\":\"paulgloury@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 13:45:35\",\"companyName\":\"\",\"address\":\"16 Foam St Parkdale\",\"latitude\":-37.99738139999,\"longitude\":145.0752338,\"installationAddressLineOne\":\"16 Foam St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Parkdale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"We are currently renovating our home and looking at installing a battery to add to our Enphase Solar Panel system. I also have an Electrical vehicle and we are currently upgrading to 3 Phase power. We are keen to look at Blackout protection but also a built in smart EV charger if possible.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase with microinverters behind each panelRequired for: Quickest payback time, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandablePaul has verified this phone number\",\"importantNotesSplit\":\"We are currently renovating our home and looking at installing a battery to add to our Enphase Solar Panel system. I also have an Electrical vehicle and we are currently upgrading to 3 Phase power. We are keen to look at Blackout protection but also a built in smart EV charger if possible.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase with microinverters behind each panel:Required for: Quickest payback time, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Paul has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: We are currently renovating our home and looking at installing a battery to add to our Enphase Solar Panel system. I also have an Electrical vehicle and we are currently upgrading to 3 Phase power. We are keen to look at Blackout protection but also a built in smart EV charger if possible.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase with microinverters behind each panelRequired for: Quickest payback time, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandablePaul has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 16 Foam St Parkdale, Parkdale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.410Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(123, NULL, 'new', 'Lou Marasco', 'lou@altobmg.com.au', '0439 388 807', 'Carnegie', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031509', '{\"id\":1031509,\"idLeadSupplier\":2305900,\"name\":\"Lou\",\"lastName\":\"Marasco\",\"phone\":\"0439 388 807\",\"email\":\"lou@altobmg.com.au\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 13:35:36\",\"companyName\":\"\",\"address\":\"50 Miller St Carnegie\",\"latitude\":-37.8972144,\"longitude\":145.0515508,\"installationAddressLineOne\":\"50 Miller St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Carnegie\",\"installationState\":\"VIC\",\"installationPostcode\":3163,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Option for EV charger moduleLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & easily expandableLou has verified this phone number\",\"importantNotesSplit\":\"Option for EV charger module:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills & easily expandable:Lou has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Option for EV charger moduleLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & easily expandableLou has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 50 Miller St Carnegie, Carnegie, VIC, 3163\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.412Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(124, NULL, 'new', 'Daniel Busatta', 'buzzaemail@gmail.com', '0413 201 454', 'Narre Warren North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031460', '{\"id\":1031460,\"idLeadSupplier\":2305830,\"name\":\"Daniel\",\"lastName\":\"Busatta\",\"phone\":\"0413 201 454\",\"email\":\"buzzaemail@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 12:35:25\",\"companyName\":\"\",\"address\":\"13 Lombard Ct Narre Warren North\",\"latitude\":-37.9849308,\"longitude\":145.2845908,\"installationAddressLineOne\":\"13 Lombard Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren North\",\"installationState\":\"VIC\",\"installationPostcode\":3804,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: goodweRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableDaniel has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: goodwe:Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandable:Daniel has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: goodweRequired for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & easily expandableDaniel has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 13 Lombard Ct Narre Warren North, Narre Warren North, VIC, 3804\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.414Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(125, NULL, 'new', 'Daniel Martin', 'danielsmartin0000@gmail.com', '401053606', 'Cockatoo', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031257', '{\"id\":1031257,\"idLeadSupplier\":2305743,\"name\":\"Daniel\",\"lastName\":\"Martin\",\"phone\":401053606,\"email\":\"danielsmartin0000@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-16 11:40:11\",\"companyName\":\"\",\"address\":\"1 George St Cockatoo\",\"latitude\":-37.9464796,\"longitude\":145.498311,\"installationAddressLineOne\":\"1 George St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Cockatoo\",\"installationState\":\"VIC\",\"installationPostcode\":3781,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Daniel has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::This customer has indicated that they would like to receive the VIC rebate.::Lead wants to pay cash::Required for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackout::This is an ORIGIN lead.:Daniel has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Daniel has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 1\\n\\nAddress: 1 George St Cockatoo, Cockatoo, VIC, 3781\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.417Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(126, NULL, 'new', 'Matthew Cutajar', 'mcutajarau@gmail.com', '0401 000 869', 'St Helena', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031242', '{\"id\":1031242,\"idLeadSupplier\":2305429,\"name\":\"Matthew\",\"lastName\":\"Cutajar\",\"phone\":\"0401 000 869\",\"email\":\"mcutajarau@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 02:10:59\",\"companyName\":\"\",\"address\":\"45 Maxine Dr St Helena\",\"latitude\":-37.6860121,\"longitude\":145.1327052,\"installationAddressLineOne\":\"45 Maxine Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"St Helena\",\"installationState\":\"VIC\",\"installationPostcode\":3088,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Instalation is to be in the garage. I would also lik to have UPS included.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Goodwe GW5000D-N5Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutMatthew has verified this phone number\",\"importantNotesSplit\":\"Instalation is to be in the garage. I would also lik to have UPS included.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Goodwe GW5000D-N5:Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackout:Matthew has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: Instalation is to be in the garage. I would also lik to have UPS included.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Goodwe GW5000D-N5Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutMatthew has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 45 Maxine Dr St Helena, St Helena, VIC, 3088\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.420Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(127, NULL, 'new', 'Hugh Haley', 'hugh.haley@gmail.com', '0423 625 800', 'Malvern East', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031121', '{\"id\":1031121,\"idLeadSupplier\":2305344,\"name\":\"Hugh\",\"lastName\":\"Haley\",\"phone\":\"0423 625 800\",\"email\":\"hugh.haley@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$1000-$2000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 01:50:38\",\"companyName\":\"\",\"address\":\"76 Brunel St Malvern East\",\"latitude\":-37.8704584,\"longitude\":145.05713,\"installationAddressLineOne\":\"76 Brunel St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Malvern East\",\"installationState\":\"VIC\",\"installationPostcode\":3145,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"Add battery to existing solar This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solaredge Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutHugh has verified this phone number\",\"importantNotesSplit\":\"Add battery to existing solar :This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Solaredge :Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Hugh has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Add battery to existing solar This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solaredge Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutHugh has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 76 Brunel St Malvern East, Malvern East, VIC, 3145\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.421Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(128, NULL, 'new', 'Daniel Zhang', 'dz.mailreceipt@gmail.com', '0407 128 670', 'Ormond', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031103', '{\"id\":1031103,\"idLeadSupplier\":2305322,\"name\":\"Daniel\",\"lastName\":\"Zhang\",\"phone\":\"0407 128 670\",\"email\":\"dz.mailreceipt@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-16 01:45:42\",\"companyName\":\"\",\"address\":\"28A Wheeler St Ormond\",\"latitude\":-37.9060685,\"longitude\":145.0407026,\"installationAddressLineOne\":\"28A Wheeler St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ormond\",\"installationState\":\"VIC\",\"installationPostcode\":3204,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I would only like providers who have the availability to install between 8 April and 1 May. This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeDaniel has verified this phone number\",\"importantNotesSplit\":\"I would only like providers who have the availability to install between 8 April and 1 May. :This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time:Daniel has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: I would only like providers who have the availability to install between 8 April and 1 May. This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeDaniel has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 28A Wheeler St Ormond, Ormond, VIC, 3204\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.422Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(129, NULL, 'new', 'Ross Edwards', 'rossedwards339@gmail.com', '0422 146 157', 'Glen Iris', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031088', '{\"id\":1031088,\"idLeadSupplier\":2305301,\"name\":\"Ross\",\"lastName\":\"Edwards\",\"phone\":\"0422 146 157\",\"email\":\"rossedwards339@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 01:36:17\",\"companyName\":\"\",\"address\":\"4 Ruskin Rd Glen Iris\",\"latitude\":-37.8483706,\"longitude\":145.0722504,\"installationAddressLineOne\":\"4 Ruskin Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Iris\",\"installationState\":\"VIC\",\"installationPostcode\":3146,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutRoss has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Ross has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: GoodweRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutRoss has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 4 Ruskin Rd Glen Iris, Glen Iris, VIC, 3146\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.424Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(130, NULL, 'new', 'Tarco Sibbel', 'tarkosibbel@gmail.com', '0403 843 009', 'Sandringham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031022', '{\"id\":1031022,\"idLeadSupplier\":2305269,\"name\":\"Tarco\",\"lastName\":\"Sibbel\",\"phone\":\"0403 843 009\",\"email\":\"tarkosibbel@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-16 01:30:18\",\"companyName\":\"\",\"address\":\"2 Grange Rd Sandringham\",\"latitude\":-37.9478773,\"longitude\":145.0108268,\"installationAddressLineOne\":\"2 Grange Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Sandringham\",\"installationState\":\"VIC\",\"installationPostcode\":3191,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"We are on 3-phase.Would consider adding more solar panels if appropriate (recent solar install last year).I am after the best way to live more sustainably in an all electric house (gas mains has been removed).Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Symo 8.2-3-MRequired for: Lowest bills, backups up 3-phase appliances & easily expandableTarco has verified this phone number\",\"importantNotesSplit\":\"We are on 3-phase.::Would consider adding more solar panels if appropriate (recent solar install last year).::I am after the best way to live more sustainably in an all electric house (gas mains has been removed).:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius Symo 8.2-3-M:Required for: Lowest bills, backups up 3-phase appliances & easily expandable:Tarco has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: We are on 3-phase.Would consider adding more solar panels if appropriate (recent solar install last year).I am after the best way to live more sustainably in an all electric house (gas mains has been removed).Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius Symo 8.2-3-MRequired for: Lowest bills, backups up 3-phase appliances & easily expandableTarco has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 2 Grange Rd Sandringham, Sandringham, VIC, 3191\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.425Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(131, NULL, 'new', 'Richard Taylor', 'richjamestaylor@icloud.com', '0404 343 219', 'Elwood', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1031017', '{\"id\":1031017,\"idLeadSupplier\":2305028,\"name\":\"Richard\",\"lastName\":\"Taylor\",\"phone\":\"0404 343 219\",\"email\":\"richjamestaylor@icloud.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-15 15:05:08\",\"companyName\":\"\",\"address\":\"20 Coleridge St Elwood\",\"latitude\":-37.8811732,\"longitude\":144.992799,\"installationAddressLineOne\":\"20 Coleridge St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Elwood\",\"installationState\":\"VIC\",\"installationPostcode\":3184,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase inverters to Jinko panelsRequired for: Quickest payback timeRichard has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase inverters to Jinko panels:Required for: Quickest payback time:Richard has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase inverters to Jinko panelsRequired for: Quickest payback timeRichard has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 20 Coleridge St Elwood, Elwood, VIC, 3184\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.426Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(132, NULL, 'new', 'David Kirkland', 'davidkir70@gmail.com', '0410 270 084', 'Ferntree Gully', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030930', '{\"id\":1030930,\"idLeadSupplier\":2304848,\"name\":\"David\",\"lastName\":\"Kirkland\",\"phone\":\"0410 270 084\",\"email\":\"davidkir70@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-15 11:20:34\",\"companyName\":\"\",\"address\":\"18 Holme Rd Ferntree Gully\",\"latitude\":-37.8898357,\"longitude\":145.2663999,\"installationAddressLineOne\":\"18 Holme Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ferntree Gully\",\"installationState\":\"VIC\",\"installationPostcode\":3156,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solis S5-GR3P8KRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Solis S5-GR3P8K:Required for: Quickest payback time & charge from solar in blackout:David has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Solis S5-GR3P8KRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 18 Holme Rd Ferntree Gully, Ferntree Gully, VIC, 3156\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.427Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(133, NULL, 'new', 'Neil Robinson', 'neilsrobinson15664@gmail.com', '0419 537 591', 'Eltham', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030887', '{\"id\":1030887,\"idLeadSupplier\":2304796,\"name\":\"Neil\",\"lastName\":\"Robinson\",\"phone\":\"0419 537 591\",\"email\":\"neilsrobinson15664@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tile\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 09:45:25\",\"companyName\":\"\",\"address\":\"12 Balmoral Cct Eltham\",\"latitude\":-37.6950141,\"longitude\":145.1542016,\"installationAddressLineOne\":\"12 Balmoral Cct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Eltham\",\"installationState\":\"VIC\",\"installationPostcode\":3095,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableNeil has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Neil has verified this phone number\",\"requestedQuotes\":3,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableNeil has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tile\\n\\nStoreys: 1\\n\\nAddress: 12 Balmoral Cct Eltham, Eltham, VIC, 3095\",\"mappedRoofType\":\"Tile (Concrete)\",\"_imported_at\":\"2026-03-17T19:30:01.428Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(134, NULL, 'new', 'Matthew Fayle', 'talkies_decibel.4@icloud.com', '0407 663 964', 'Ashburton', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030879', '{\"id\":1030879,\"idLeadSupplier\":2304782,\"name\":\"Matthew\",\"lastName\":\"Fayle\",\"phone\":\"0407 663 964\",\"email\":\"talkies_decibel.4@icloud.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 09:25:19\",\"companyName\":\"\",\"address\":\"12 High St Rd Ashburton\",\"latitude\":-37.8654725,\"longitude\":145.0910703,\"installationAddressLineOne\":\"12 High St Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ashburton\",\"installationState\":\"VIC\",\"installationPostcode\":3147,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Two storey townhouse with a shared roof area.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Matthew has verified this phone number\",\"importantNotesSplit\":\"Two storey townhouse with a shared roof area.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:This is an ORIGIN lead.:Matthew has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Plan For Wednesday:10am - Matthew Fayle\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Two storey townhouse with a shared roof area.This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Matthew has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 12 High St Rd Ashburton, Ashburton, VIC, 3147\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.432Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(135, NULL, 'new', 'Chris Wignall', 'wignall2000@gmail.com', '0419 595 145', 'Ivanhoe', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030853', '{\"id\":1030853,\"idLeadSupplier\":2304740,\"name\":\"Chris\",\"lastName\":\"Wignall\",\"phone\":\"0419 595 145\",\"email\":\"wignall2000@gmail.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Don\'t know\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":3,\"features\":\"Increase size of existing solar system\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-15 08:30:18\",\"companyName\":\"\",\"address\":\"22 Beatty St Ivanhoe\",\"latitude\":-37.7592294,\"longitude\":145.0425112,\"installationAddressLineOne\":\"22 Beatty St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Ivanhoe\",\"installationState\":\"VIC\",\"installationPostcode\":3079,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I have an existing 2kw system and would like to increase capacity and will charge an EVLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashChris has verified this phone number\",\"importantNotesSplit\":\"I have an existing 2kw system and would like to increase capacity and will charge an EV:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Chris has verified this phone number\",\"requestedQuotes\":3,\"note\":\"He has too much on his plate right now so wants us to call next week. 17/03/2026 13:09\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"waiting_reply\",\"funnelVersion\":3,\"extraInfo\":\"Solar System Upgrade\",\"consolidatedNotes\":\"Important Notes: I have an existing 2kw system and would like to increase capacity and will charge an EVLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashChris has verified this phone number\\n\\nFeatures: Increase size of existing solar system\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 3\\n\\nAddress: 22 Beatty St Ivanhoe, Ivanhoe, VIC, 3079\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.433Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(136, NULL, 'new', 'Anthony Widjaja', 'anthony.widjaja@live.com', '0402 750 930', 'Knoxfield', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030829', '{\"id\":1030829,\"idLeadSupplier\":2304736,\"name\":\"Anthony\",\"lastName\":\"Widjaja\",\"phone\":\"0402 750 930\",\"email\":\"anthony.widjaja@live.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good budget system\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 08:30:10\",\"companyName\":\"\",\"address\":\"21 David St Knoxfield\",\"latitude\":-37.8920105,\"longitude\":145.2508811,\"installationAddressLineOne\":\"21 David St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Knoxfield\",\"installationState\":\"VIC\",\"installationPostcode\":3180,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeThis is an ORIGIN lead.Anthony has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time:This is an ORIGIN lead.:Anthony has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Wednesday:1:30pm - Anthony Widjaja - (Knoxfield)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback timeThis is an ORIGIN lead.Anthony has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 21 David St Knoxfield, Knoxfield, VIC, 3180\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.434Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(137, NULL, 'new', 'David Nguyen', 'qkdn@me.com', '0434 382 676', 'Mont Albert', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030782', '{\"id\":1030782,\"idLeadSupplier\":2304694,\"name\":\"David\",\"lastName\":\"Nguyen\",\"phone\":\"0434 382 676\",\"email\":\"qkdn@me.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"Fill my roof with solar panels\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-15 02:05:55\",\"companyName\":\"\",\"address\":\"15 Leopold Cres Mont Albert\",\"latitude\":-37.8223209,\"longitude\":145.1034873,\"installationAddressLineOne\":\"15 Leopold Cres\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mont Albert\",\"installationState\":\"VIC\",\"installationPostcode\":3127,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time & charge from solar in blackout:David has verified this phone number\",\"requestedQuotes\":2,\"note\":\"Plan For Tuesday: 12:30pm - David Nguyen - (Mont Albert)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time & charge from solar in blackoutDavid has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 15 Leopold Cres Mont Albert, Mont Albert, VIC, 3127\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.435Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(138, NULL, 'new', 'Jovica Torlak', 'torlak@bigpond.com', '0400 057 584', 'Malvern East', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030705', '{\"id\":1030705,\"idLeadSupplier\":2304645,\"name\":\"Jovica\",\"lastName\":\"Torlak\",\"phone\":\"0400 057 584\",\"email\":\"torlak@bigpond.com\",\"supplierId\":14039,\"leadPrice\":55,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nA home currently under construction - frame and roof completed\",\"leadType\":\"On Grid Solar\",\"submittedDate\":\"2026-03-15 01:45:59\",\"companyName\":\"\",\"address\":\"76 Alma St Malvern East\",\"latitude\":-37.88021,\"longitude\":145.0774259,\"installationAddressLineOne\":\"76 Alma St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Malvern East\",\"installationState\":\"VIC\",\"installationPostcode\":3145,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashJovica has verified this phone number\",\"importantNotesSplit\":\"Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).:This lead was submitted via the QuotesV3 form.:This customer has indicated that they do not want the VIC rebate.:Lead wants to pay cash:Jovica has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Wednesday: 8am - Jovica Torlak - (Malvern East)&#13;\\nHave to complete site inspection for 2 properties.\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Hi could you please provide this quote for 2 under construction dwellings (duplex) with a flat metal roof. Each dwelling is to have a 6.6kw system with a 5kw inverter (preferably Fronius or similar quality).This lead was submitted via the QuotesV3 form.This customer has indicated that they do not want the VIC rebate.Lead wants to pay cashJovica has verified this phone number\\n\\nFeatures: On Grid Solar\\nA home currently under construction - frame and roof completed\\n\\nHave Battery: No\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 76 Alma St Malvern East, Malvern East, VIC, 3145\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.436Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(139, NULL, 'new', 'Sharon Song', 'sharonsong23@gmail.com', '0425 260 639', 'Burwood', 5.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030794', '{\"id\":1030794,\"idLeadSupplier\":2304518,\"name\":\"Sharon\",\"lastName\":\"Song\",\"phone\":\"0425 260 639\",\"email\":\"sharonsong23@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"5 to 10 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-14 23:05:08\",\"companyName\":\"\",\"address\":\"16 Wattlebird Ct Burwood\",\"latitude\":-37.8427435,\"longitude\":145.1012891,\"installationAddressLineOne\":\"16 Wattlebird Ct\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Burwood\",\"installationState\":\"VIC\",\"installationPostcode\":3125,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Sharon  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:This is an ORIGIN lead.:Sharon  has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Does not live on Site, as the property is under construction&#13;\\nwants only Fronius Inverter as she has one installed at her property where she currently lives.&#13;\\nPlan For Tuesday: 8am - Sharon Song\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutThis is an ORIGIN lead.Sharon  has verified this phone number\\n\\nFeatures: On Grid Solar\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 16 Wattlebird Ct Burwood, Burwood, VIC, 3125\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.438Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(140, NULL, 'new', 'Neil Horvath', 'knwhorvath@gmail.com', '0449 162 020', 'Vermont South', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030746', '{\"id\":1030746,\"idLeadSupplier\":2304458,\"name\":\"Neil\",\"lastName\":\"Horvath\",\"phone\":\"0449 162 020\",\"email\":\"knwhorvath@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Terracotta\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-14 20:45:07\",\"companyName\":\"\",\"address\":\"16 Warrington Ave Vermont South\",\"latitude\":-37.8560445,\"longitude\":145.1890334,\"installationAddressLineOne\":\"16 Warrington Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Vermont South\",\"installationState\":\"VIC\",\"installationPostcode\":3133,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panelsQuality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutNeil  has verified this phone number\",\"importantNotesSplit\":\"Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panels::Quality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackout:Neil  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"1st Call and dropped a message but no response yet. - 16/03/2026 14:02\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"No\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Replace exitibg panels. Use all subsidies currentlt available. 10 kW inverter with around 12 kW of soalr panelsQuality inverter such as Fronius, solaredge, digenergy or SMA preferred. Minimum 25 year warranty on solar panels.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Quickest payback time, charge from solar in blackout & almost instant changeover in a blackoutNeil  has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nHave Battery: No\\n\\nRoof Type: Terracotta\\n\\nStoreys: 1\\n\\nAddress: 16 Warrington Ave Vermont South, Vermont South, VIC, 3133\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.438Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(141, NULL, 'new', 'Stephen Hooke', 'emailstevehooke@gmail.com', '0421 048 329', 'Nunawading', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030710', '{\"id\":1030710,\"idLeadSupplier\":2304436,\"name\":\"Stephen\",\"lastName\":\"Hooke\",\"phone\":\"0421 048 329\",\"email\":\"emailstevehooke@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 18:40:25\",\"companyName\":\"\",\"address\":\"9 Lemon Grove Nunawading\",\"latitude\":-37.8087243,\"longitude\":145.1837885,\"installationAddressLineOne\":\"9 Lemon Grove\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Nunawading\",\"installationState\":\"VIC\",\"installationPostcode\":3131,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesStephen  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Enphase :Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliances:Stephen  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase Required for: Blackout Protection, charge from solar in blackout, almost instant changeover in a blackout & backups up 3-phase appliancesStephen  has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 9 Lemon Grove Nunawading, Nunawading, VIC, 3131\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.439Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(142, NULL, 'new', 'Gary Wyatt', 'gdw2964@outlook.com', '0437 257 753', 'Wantirna South', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030654', '{\"id\":1030654,\"idLeadSupplier\":2304390,\"name\":\"Gary\",\"lastName\":\"Wyatt\",\"phone\":\"0437 257 753\",\"email\":\"gdw2964@outlook.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 17:05:18\",\"companyName\":\"\",\"address\":\"4 Riverpark Dr Wantirna South\",\"latitude\":-37.8728715,\"longitude\":145.2322395,\"installationAddressLineOne\":\"4 Riverpark Dr\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Wantirna South\",\"installationState\":\"VIC\",\"installationPostcode\":3152,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panelsRequired for: Blackout Protection, charge from solar in blackout & easily expandableGary has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.::Lead wants to pay cash::Existing inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panels::Required for: Blackout Protection, charge from solar in blackout & easily expandable::Gary has verified this phone number\",\"requestedQuotes\":2,\"note\":\"1st Call and dropped a message but no response yet. - 16/03/2026 13:05&#13;\\nPlan For Tuesday: 2pm - Gary Wyatt (Wantirna South)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Enphase s270 Micro Inverters & LG 330 w NeON panelsRequired for: Blackout Protection, charge from solar in blackout & easily expandableGary has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 4 Riverpark Dr Wantirna South, Wantirna South, VIC, 3152\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.440Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(143, NULL, 'new', 'Adriyan Hansopaheluwakan', 'nelizhu88@gmail.com', '0433 753 588', 'Narre Warren', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030641', '{\"id\":1030641,\"idLeadSupplier\":2304370,\"name\":\"Adriyan\",\"lastName\":\"Hansopaheluwakan\",\"phone\":\"0433 753 588\",\"email\":\"nelizhu88@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 16:05:06\",\"companyName\":\"\",\"address\":\"9 Wallaroo Ave Narre Warren\",\"latitude\":-38.0128613,\"longitude\":145.2977055,\"installationAddressLineOne\":\"9 Wallaroo Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Narre Warren\",\"installationState\":\"VIC\",\"installationPostcode\":3805,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I have one quote from other provider.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius 5kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAdriyan has verified this phone number\",\"importantNotesSplit\":\"I have one quote from other provider.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius 5kw:Required for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandable:Adriyan has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Needs a site inspection today, Ash is speaking now to check what time the site inspection can be done. - 16/03/2026 - 12:58\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have one quote from other provider.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Fronius 5kwRequired for: Lowest bills, charge from solar in blackout, almost instant changeover in a blackout, backups up 3-phase appliances & easily expandableAdriyan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 9 Wallaroo Ave Narre Warren, Narre Warren, VIC, 3805\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.441Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(144, NULL, 'new', 'Nick Matlock', 'nbm1981@hotmail.com', '0419 149 311', 'Parkdale', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030639', '{\"id\":1030639,\"idLeadSupplier\":2304365,\"name\":\"Nick\",\"lastName\":\"Matlock\",\"phone\":\"0419 149 311\",\"email\":\"nbm1981@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 15:55:08\",\"companyName\":\"\",\"address\":\"6 Vialls Ave Parkdale\",\"latitude\":-37.9933106,\"longitude\":145.0855745,\"installationAddressLineOne\":\"6 Vialls Ave\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Parkdale\",\"installationState\":\"VIC\",\"installationPostcode\":3195,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sungrow SGR10T 11.4kW Solar PanelsRequired for: Quickest payback time & easily expandableNick has verified this phone number\",\"importantNotesSplit\":\"Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Sungrow SGR10T 11.4kW Solar Panels:Required for: Quickest payback time & easily expandable:Nick has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st Call and dropped a message but no response yet. - 16/03/2026 12:43&#13;\\nPlan For Tuesday: 8:45am - Nick Matlock - (Nick Matlock)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: Looking for a battery 16-20kWh, that’s easily expandable in future, if I was to buy an Electric Vehicle.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Sungrow SGR10T 11.4kW Solar PanelsRequired for: Quickest payback time & easily expandableNick has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 6 Vialls Ave Parkdale, Parkdale, VIC, 3195\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.442Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(145, NULL, 'new', 'Tuan Tran', 'tuanthi@gmail.com', '0412 020 701', 'Bayswater North', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030308', '{\"id\":1030308,\"idLeadSupplier\":2303994,\"name\":\"Tuan\",\"lastName\":\"Tran\",\"phone\":\"0412 020 701\",\"email\":\"tuanthi@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"Less than $500\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":1,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 02:15:19\",\"companyName\":\"\",\"address\":\"26 Bayview Rise Bayswater North\",\"latitude\":-37.8252652,\"longitude\":145.2727398,\"installationAddressLineOne\":\"26 Bayview Rise\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Bayswater North\",\"installationState\":\"VIC\",\"installationPostcode\":3153,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: FroniusRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutTuan has verified this phone number\",\"importantNotesSplit\":\"I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Fronius:Required for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackout:Tuan has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:57&#13;\\nPlan For Tuesday:1pm - Tuan Tran - (Bayswater North)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I\'d like my battery to be upgradeable in the future to charge electric cars if necessary.Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: FroniusRequired for: Lowest bills, charge from solar in blackout & almost instant changeover in a blackoutTuan has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 1\\n\\nAddress: 26 Bayview Rise Bayswater North, Bayswater North, VIC, 3153\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.443Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(146, NULL, 'new', 'Amar Naik', 'amarnaik1@gmail.com', '0422 282 527', 'Carnegie', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030319', '{\"id\":1030319,\"idLeadSupplier\":2303979,\"name\":\"Amar\",\"lastName\":\"Naik\",\"phone\":\"0422 282 527\",\"email\":\"amarnaik1@gmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"In the next 4 weeks\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 02:10:53\",\"companyName\":\"\",\"address\":\"14 Frogmore Rd Carnegie\",\"latitude\":-37.8939362,\"longitude\":145.0636382,\"installationAddressLineOne\":\"14 Frogmore Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Carnegie\",\"installationState\":\"VIC\",\"installationPostcode\":3163,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Zoom call\",\"availableForConversation\":\"\",\"importantNotes\":\"I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW10KAU-DTRequired for: Quickest payback timeAmar has verified this phone number\",\"importantNotesSplit\":\"I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Existing inverter type: Goodwe GW10KAU-DT:Required for: Quickest payback time:Amar has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Tuesday: 10am - Amar Naik - (Carnegie)\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I have 3 phase power and a 13kw solar panel system installed already. I would like to try make the 1 May deadline before the rebates change.This lead was submitted via the QuotesV3 form.Lead wants to pay cashExisting inverter type: Goodwe GW10KAU-DTRequired for: Quickest payback timeAmar has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 14 Frogmore Rd Carnegie, Carnegie, VIC, 3163\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.444Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(147, NULL, 'new', 'Gael McLeod', 'gmc0608@hotmail.com', '0405 156 849', 'Glen Iris', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030117', '{\"id\":1030117,\"idLeadSupplier\":2303884,\"name\":\"Gael\",\"lastName\":\"McLeod\",\"phone\":\"0405 156 849\",\"email\":\"gmc0608@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"Battery System\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-14 01:45:27\",\"companyName\":\"\",\"address\":\"5 Airley Rd Glen Iris\",\"latitude\":-37.8536288,\"longitude\":145.0714871,\"installationAddressLineOne\":\"5 Airley Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Glen Iris\",\"installationState\":\"VIC\",\"installationPostcode\":3146,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"I already have a few quotesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutGael has verified this phone number\",\"importantNotesSplit\":\"I already have a few quotes:Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Required for: Lowest bills & charge from solar in blackout:Gael has verified this phone number\",\"requestedQuotes\":3,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:48&#13;\\n2nd Call and dropped a message but no response yet. - 16/03/2026 12:15\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"\",\"funnelVersion\":3,\"extraInfo\":\"\",\"consolidatedNotes\":\"Important Notes: I already have a few quotesLead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.Lead wants to pay cashRequired for: Lowest bills & charge from solar in blackoutGael has verified this phone number\\n\\nFeatures: Battery System\\n\\nRoof Type: Yes\\n\\nStoreys: 2\\n\\nAddress: 5 Airley Rd Glen Iris, Glen Iris, VIC, 3146\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.445Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(148, NULL, 'new', 'Katherine Hunt', 'katty54@hotmail.com', '0421 335 355', 'Kew', NULL, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030345', '{\"id\":1030345,\"idLeadSupplier\":2303764,\"name\":\"Katherine\",\"lastName\":\"Hunt\",\"phone\":\"0421 335 355\",\"email\":\"katty54@hotmail.com\",\"supplierId\":14039,\"leadPrice\":50,\"claimed\":\"No\",\"size\":\"Not Sure. Please help me decide\",\"systemPriceType\":\"\",\"timeframe\":\"Immediately\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Other\",\"typeOfRoofOther\":\"Other\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":\"\",\"features\":\"Adding Batteries\",\"leadType\":\"Batteries\",\"submittedDate\":\"2026-03-13 22:05:15\",\"companyName\":\"\",\"address\":\"53 Davis St Kew\",\"latitude\":-37.81060799999,\"longitude\":145.0463328,\"installationAddressLineOne\":\"53 Davis St\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Kew\",\"installationState\":\"VIC\",\"installationPostcode\":3101,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"No\",\"availableForConversation\":\"\",\"importantNotes\":\"This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Fronius primo gen24 8.0Required for: Lowest billsThis is an ORIGIN lead.Katherine  has verified this phone number\",\"importantNotesSplit\":\"This lead was submitted via the QuotesV3 form.:Lead wants to pay cash:Customer wants a battery upgrade:Amount of storage required: I don\'t know:Existing battery type: Unknown:Existing inverter type: Fronius primo gen24 8.0:Required for: Lowest bills:This is an ORIGIN lead.:Katherine  has verified this phone number\",\"requestedQuotes\":2,\"note\":\"1st Call and dropped a message but no response yet. - 14/03/2026 14:45&#13;\\nAppointment booked for Tuesday at 11:30\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Battery System Upgrade\",\"consolidatedNotes\":\"Important Notes: This lead was submitted via the QuotesV3 form.Lead wants to pay cashCustomer wants a battery upgradeAmount of storage required: I don\'t knowExisting battery type: UnknownExisting inverter type: Fronius primo gen24 8.0Required for: Lowest billsThis is an ORIGIN lead.Katherine  has verified this phone number\\n\\nFeatures: Adding Batteries\\n\\nRoof Type: Other\\n\\nAddress: 53 Davis St Kew, Kew, VIC, 3101\",\"mappedRoofType\":\"Other\",\"_imported_at\":\"2026-03-17T19:30:01.446Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `leads` (`id`, `company_id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `referred_by_lead_id`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `external_id`, `marketing_payload_json`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `assigned_user_id`) VALUES
(149, NULL, 'new', 'Alison Liyanage', 'alison.liyanage@gmail.com', '0431 239 184', 'Mount Waverley', 10.00, 0.00, 'Solar Quotes', NULL, 0, 0, NULL, '2026-03-18 01:00:01', NULL, '2026-03-17 19:30:01', NULL, '1030340', '{\"id\":1030340,\"idLeadSupplier\":2303761,\"name\":\"Alison\",\"lastName\":\"Liyanage\",\"phone\":\"0431 239 184\",\"email\":\"alison.liyanage@gmail.com\",\"supplierId\":14039,\"leadPrice\":60,\"claimed\":\"No\",\"size\":\"10 to 15 kW\",\"systemPriceType\":\"A good mix of quality and price\",\"timeframe\":\"In the next 3 months\",\"quarterlyBill\":\"$500-$1000\",\"electricityBillPerMonth\":\"\",\"ownTheRoofSpace\":\"Yes\",\"typeOfRoof\":\"Tin / Colourbond\",\"typeOfRoofOther\":\"\",\"minimumTenSquareMetersNorthFacing\":\"I\'m not sure - Please Help Me Out\",\"roofSlope\":\"\",\"shade\":\"\",\"direction\":\"Not Sure\",\"storeys\":2,\"features\":\"On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\",\"leadType\":\"On Grid Solar + Batteries\",\"submittedDate\":\"2026-03-13 22:05:08\",\"companyName\":\"\",\"address\":\"521 Stephensons Rd Mount Waverley\",\"latitude\":-37.895313,\"longitude\":145.1246676,\"installationAddressLineOne\":\"521 Stephensons Rd\",\"installationAddressLineTwo\":\"\",\"installationSuburb\":\"Mount Waverley\",\"installationState\":\"VIC\",\"installationPostcode\":3149,\"installationCountry\":\"Australia\",\"mailingAddressLineOne\":\"\",\"mailingAddressLineTwo\":\"\",\"mailingSuburb\":\"\",\"mailingState\":\"\",\"mailingPostcode\":\"\",\"mailingCountry\":\"\",\"homeVisit\":\"Yes\",\"availableForConversation\":\"\",\"importantNotes\":\"Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliancesThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Alison has verified this phone number\",\"importantNotesSplit\":\"Lead has consented to discussion of energy plans.:This lead was submitted via the QuotesV3 form.:This customer has indicated that they would like to receive the VIC rebate.:Lead wants to pay cash:Required for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliances:This is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').:Alison has verified this phone number\",\"requestedQuotes\":3,\"note\":\"Plan For Wednesday: 8am - Alison Liyanage - 521 Stephensons Rd , Mount Waverley\",\"evExistingSolarSize\":\"\",\"evExistingBattery\":\"\",\"evInstallationType\":\"\",\"evDistanceChargerSwitchboard\":\"\",\"evCarMakeModel\":\"\",\"images\":{\"evChargerImages\":\"\",\"evSwitchboardImages\":\"\",\"evOtherImages\":\"\",\"hwhpLocationImages\":\"\",\"hwhpSwitchboardImages\":\"\",\"hwhpOtherImages\":\"\"},\"hwhpNumberOfResidents\":\"\",\"hwhpExistingSystem\":\"\",\"hwhpLocationAccessibility\":\"\",\"hwhpSwitchboardDistance\":\"\",\"leadStatus\":\"appointment_booked\",\"funnelVersion\":3,\"extraInfo\":\"Micro Inverters / Power Optimisers\",\"consolidatedNotes\":\"Important Notes: Lead has consented to discussion of energy plans.This lead was submitted via the QuotesV3 form.This customer has indicated that they would like to receive the VIC rebate.Lead wants to pay cashRequired for: Blackout Protection, almost instant changeover in a blackout & backups up 3-phase appliancesThis is a CHOICE lead. Choice currently recommend JA, Tindo, Trina, Jinko & Winaico (panels that achieve 80% or more \'CHOICE Expert rating\').Alison has verified this phone number\\n\\nFeatures: On Grid Solar\\nMicro Inverters or Power Optimisers\\nBattery System\\n\\nRoof Type: Tin / Colourbond\\n\\nStoreys: 2\\n\\nAddress: 521 Stephensons Rd Mount Waverley, Mount Waverley, VIC, 3149\",\"mappedRoofType\":\"Tin (Colorbond)\",\"_imported_at\":\"2026-03-17T19:30:01.447Z\"}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
  `scheduled_at` datetime DEFAULT NULL,
  `roof_type` varchar(60) DEFAULT NULL,
  `roof_pitch_deg` decimal(5,2) DEFAULT NULL,
  `house_storey` enum('single','double','triple') DEFAULT NULL,
  `meter_phase` enum('single','three') DEFAULT NULL,
  `inverter_location` varchar(255) DEFAULT NULL,
  `msb_condition` text DEFAULT NULL,
  `shading` enum('none','light','moderate','heavy') DEFAULT NULL,
  `additional_notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(5, 5, 7, 'hi', '2026-03-09 05:04:00');

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
('attendance', 'Attendance', '2026-02-23 20:18:58'),
('installation', 'Installation Day', '2026-03-12 16:49:19'),
('leads', 'Leads', '2026-02-23 20:18:58'),
('messages', 'Messages', '2026-02-23 20:18:58'),
('on_field', 'On Field', '2026-02-23 20:18:58'),
('operations', 'Operations', '2026-02-23 20:18:58'),
('projects', 'Projects', '2026-02-23 20:18:58'),
('referrals', 'Referrals', '2026-02-23 20:18:58'),
('support', 'Support Tickets', '2026-03-06 18:51:38');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_details`
--

CREATE TABLE `payroll_details` (
  `id` int(10) UNSIGNED NOT NULL,
  `payroll_run_id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `regular_hours` decimal(8,2) DEFAULT 0.00,
  `overtime_hours` decimal(8,2) DEFAULT 0.00,
  `hourly_rate` decimal(8,2) DEFAULT 0.00,
  `overtime_rate` decimal(8,2) DEFAULT 0.00,
  `gross_pay` decimal(10,2) DEFAULT 0.00,
  `deductions` decimal(10,2) DEFAULT 0.00,
  `net_pay` decimal(10,2) DEFAULT 0.00,
  `tax_deductions` decimal(10,2) DEFAULT 0.00,
  `other_deductions` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_runs`
--

CREATE TABLE `payroll_runs` (
  `id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `period_type` enum('weekly','fortnightly','monthly') NOT NULL DEFAULT 'monthly',
  `status` enum('draft','processed','paid') NOT NULL DEFAULT 'draft',
  `total_payroll_amount` decimal(12,2) DEFAULT 0.00,
  `total_employees` int(10) UNSIGNED DEFAULT 0,
  `total_hours` decimal(10,2) DEFAULT 0.00,
  `overtime_hours` decimal(10,2) DEFAULT 0.00,
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payroll_runs`
--

INSERT INTO `payroll_runs` (`id`, `company_id`, `period_start`, `period_end`, `period_type`, `status`, `total_payroll_amount`, `total_employees`, `total_hours`, `overtime_hours`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-02-28', '2026-03-30', 'monthly', 'draft', 0.00, 0, 0.00, 0.00, 7, '2026-03-17 20:03:36', '2026-03-17 20:03:36');

-- --------------------------------------------------------

--
-- Table structure for table `payslips`
--

CREATE TABLE `payslips` (
  `id` int(10) UNSIGNED NOT NULL,
  `payroll_detail_id` int(10) UNSIGNED NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `emailed_at` timestamp NULL DEFAULT NULL
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
(1, '*', '*', 'All permissions (super admin)', '2026-02-10 05:02:56'),
(2, 'overview', 'view', 'View dashboard overview', '2026-02-10 05:02:56'),
(3, 'profile', 'view', 'View own profile', '2026-02-10 05:02:56'),
(4, 'profile', 'edit', 'Edit own profile', '2026-02-10 05:02:56'),
(5, 'companies', 'view', 'List companies', '2026-02-10 05:02:56'),
(6, 'companies', 'create', 'Create company (tenant)', '2026-02-10 05:02:56'),
(7, 'leads', 'view', 'View leads', '2026-02-10 05:02:56'),
(8, 'leads', 'create', 'Create leads', '2026-02-10 05:02:56'),
(9, 'leads', 'edit', 'Edit leads', '2026-02-10 05:02:56'),
(10, 'projects', 'view', 'View projects', '2026-02-10 05:02:56'),
(11, 'projects', 'create', 'Create projects', '2026-02-10 05:02:56'),
(12, 'projects', 'edit', 'Edit projects', '2026-02-10 05:02:56'),
(13, 'on_field', 'view', 'View on-field', '2026-02-10 05:02:56'),
(14, 'on_field', 'edit', 'Edit on-field', '2026-02-10 05:02:56'),
(15, 'operations', 'view', 'View operations', '2026-02-10 05:02:56'),
(16, 'operations', 'edit', 'Edit operations', '2026-02-10 05:02:56'),
(17, 'attendance', 'view', 'View attendance', '2026-02-10 05:02:56'),
(18, 'attendance', 'edit', 'Edit attendance', '2026-02-10 05:02:56'),
(19, 'referrals', 'view', 'View referrals', '2026-02-10 05:02:56'),
(20, 'referrals', 'edit', 'Edit referrals', '2026-02-10 05:02:56'),
(21, 'messages', 'view', 'View messages', '2026-02-10 05:02:56'),
(22, 'messages', 'edit', 'Edit messages', '2026-02-10 05:02:56'),
(23, 'settings', 'view', 'View settings', '2026-02-10 05:02:56'),
(24, 'settings', 'manage', 'Manage settings', '2026-02-10 05:02:56'),
(25, 'roles', 'view', 'View roles', '2026-02-10 05:02:56'),
(26, 'roles', 'manage', 'Create/edit roles and assign permissions', '2026-02-10 05:02:56'),
(27, 'support', 'view', 'View support tickets', '2026-03-06 18:50:07'),
(28, 'support', 'edit', 'Reply to and manage support tickets', '2026-03-06 18:50:07');

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
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

--
-- Dumping data for table `referral_bonuses`
--

INSERT INTO `referral_bonuses` (`id`, `referral_lead_id`, `bonus_amount`, `bonus_paid_at`, `created_at`, `updated_at`) VALUES
(1, 70, 0.00, '2026-02-23 00:00:00', '2026-02-23 07:45:44', '2026-02-23 07:45:44');

-- --------------------------------------------------------

--
-- Table structure for table `referral_settings`
--

CREATE TABLE `referral_settings` (
  `id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `settings_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`settings_json`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `referral_settings`
--

INSERT INTO `referral_settings` (`id`, `settings_json`, `created_at`, `updated_at`) VALUES
(1, '{\"solar\":150,\"battery\":150,\"solar+battery\":250,\"ev-charger\":200}', '2026-02-20 09:24:39', '2026-02-20 09:24:39');

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
(15, 5, 'd7fd9e413e411c14483518195a74c41998ba3821ba4f6bc1b8c56d7c34241811', '2026-02-18 10:39:32', '2026-02-11 10:39:32'),
(55, 8, '603ba3b6cf9d4ad0c69bc24b4d7c95722820af5b013a3cc960a23862b66ca585', '2026-03-15 00:41:40', '2026-03-08 00:41:40'),
(56, 7, '77cf028bbff6c1fea71cd8faf2d86e93ba89349a5bdd144fee1350a4ed923ec3', '2026-03-15 00:41:55', '2026-03-08 00:41:55'),
(57, 7, '143685559e559266edf4ca526686607c868b282a8534907553c24b229254beab', '2026-03-15 00:43:42', '2026-03-08 00:43:42'),
(58, 7, '8451e871d243db0a3d75035b1df39bd74de54ac238d382a080773993fa2b9b3f', '2026-03-15 11:17:11', '2026-03-08 11:17:11'),
(59, 7, '1e83e8f4a791441fb49be9fbb2cee10b5753fb6b0f95bd7d2e660b443ba6f9a5', '2026-03-16 10:33:47', '2026-03-09 10:33:47'),
(60, 8, 'f403b39264d78a94fe887125895a3fc3c7ecee22bc935d9bccaf9ce9d2035b1a', '2026-03-16 11:21:27', '2026-03-09 11:21:27'),
(61, 8, 'b7be01ad0746677c38a6d5cc94ca46bbc8eb64b47ffdb9569e25847c715e87ff', '2026-03-16 11:22:52', '2026-03-09 11:22:52'),
(62, 8, '4152cc9f99170a8cde4cd09dbcf867f5e0ac3970ceea93aa7e28eb2c4ed72e01', '2026-03-16 11:23:29', '2026-03-09 11:23:29'),
(63, 7, '97f4f687ba65bae8d13b1cf260a0a41140530380580b0cc593bd7ba072ea0cc2', '2026-03-16 11:23:47', '2026-03-09 11:23:47'),
(64, 7, '0b35ff9a87249ff2f3e0a369df720ce39ca805719efcd9ffc7f078de657fd862', '2026-03-16 14:03:46', '2026-03-09 14:03:46'),
(65, 7, 'bc42b9cc6ed079f40d8c2d87cd33caf5faa4de5d2cbdbe64af9df4ba98fd2bf5', '2026-03-18 23:17:52', '2026-03-11 23:17:52'),
(66, 8, '17515cd2407cd577ee6e819e9e9b737b846090e9440fccdc3b08b01b62b35d52', '2026-03-18 23:18:36', '2026-03-11 23:18:36'),
(67, 7, 'f9905a6892e109fbd919adb2f805d1f5d18f7bd1867b1de142e4a20a017e473d', '2026-03-19 09:41:04', '2026-03-12 09:41:04'),
(68, 8, '76a58398afcc47a1be09068038a8c1ad013869d50c1447ef6efd83db8df03db3', '2026-03-19 09:41:32', '2026-03-12 09:41:32'),
(69, 7, 'c380a7a5c2e2d84d840f9f536c9c8b3a22d2011c0ee76e9fa152973d061402d9', '2026-03-19 23:58:12', '2026-03-12 23:58:12'),
(70, 7, 'cf330112f5540dcff76f4749196d9813f8816d198e813f76dd3cba3246a8e571', '2026-03-20 11:36:28', '2026-03-13 11:36:28'),
(71, 8, '35fa67203a406d84bb185ea3b4e301741d30e2e8312461c3b1d00e088e166c54', '2026-03-20 11:38:39', '2026-03-13 11:38:39'),
(72, 7, '328936bcad807d3debdfc220f42a45554a49d83c27a4a4aebc76d86a8afdbb7e', '2026-03-25 00:46:07', '2026-03-18 00:46:07'),
(73, 7, 'b086f0dca3b927596f45d78df91196a5ff1a219def8dd196d448d59e94606831', '2026-03-25 10:30:21', '2026-03-18 10:30:21');

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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 'super_admin', 'Platform-wide admin', '2026-02-08 16:53:57'),
(2, 'company_admin', 'Company-level admin', '2026-02-08 16:53:57'),
(3, 'manager', 'Team/region manager', '2026-02-08 16:53:57'),
(4, 'field_agent', 'Field operations', '2026-02-08 16:53:57');

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
(1, 1, '2026-02-10 05:02:57'),
(2, 2, '2026-02-10 05:02:57'),
(2, 3, '2026-02-10 05:02:57'),
(2, 4, '2026-02-10 05:02:57'),
(2, 7, '2026-02-10 05:02:57'),
(2, 8, '2026-02-10 05:02:57'),
(2, 9, '2026-02-10 05:02:57'),
(2, 10, '2026-02-10 05:02:57'),
(2, 11, '2026-02-10 05:02:57'),
(2, 12, '2026-02-10 05:02:57'),
(2, 13, '2026-02-10 05:02:57'),
(2, 14, '2026-02-10 05:02:57'),
(2, 15, '2026-02-10 05:02:57'),
(2, 16, '2026-02-10 05:02:57'),
(2, 17, '2026-02-10 05:02:57'),
(2, 18, '2026-02-10 05:02:57'),
(2, 19, '2026-02-10 05:02:57'),
(2, 20, '2026-02-10 05:02:57'),
(2, 21, '2026-02-10 05:02:57'),
(2, 22, '2026-02-10 05:02:57'),
(2, 23, '2026-02-10 05:02:57'),
(2, 24, '2026-02-10 05:02:57'),
(2, 25, '2026-02-10 05:02:57'),
(2, 26, '2026-02-10 05:02:57'),
(3, 2, '2026-02-10 05:02:57'),
(3, 3, '2026-02-10 05:02:57'),
(3, 4, '2026-02-10 05:02:57'),
(3, 7, '2026-02-10 05:02:57'),
(3, 8, '2026-02-10 05:02:57'),
(3, 9, '2026-02-10 05:02:57'),
(3, 10, '2026-02-10 05:02:57'),
(3, 11, '2026-02-10 05:02:57'),
(3, 12, '2026-02-10 05:02:57'),
(3, 13, '2026-02-10 05:02:57'),
(3, 14, '2026-02-10 05:02:57'),
(3, 15, '2026-02-10 05:02:57'),
(3, 17, '2026-02-10 05:02:57'),
(3, 18, '2026-02-10 05:02:57'),
(3, 19, '2026-02-10 05:02:57'),
(3, 21, '2026-02-10 05:02:57'),
(3, 22, '2026-02-10 05:02:57'),
(3, 23, '2026-02-10 05:02:57'),
(4, 2, '2026-02-10 05:02:57'),
(4, 3, '2026-02-10 05:02:57'),
(4, 4, '2026-02-10 05:02:57'),
(4, 10, '2026-02-10 05:02:57'),
(4, 13, '2026-02-10 05:02:57'),
(4, 14, '2026-02-10 05:02:57'),
(4, 17, '2026-02-10 05:02:57'),
(4, 18, '2026-02-10 05:02:57'),
(4, 21, '2026-02-10 05:02:57'),
(4, 22, '2026-02-10 05:02:57');

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
('V001__multi_tenant', 'Company types, modules, and tenant columns', '2026-03-12 00:15:06', 26),
('V002__rbac', 'Permissions, role_permissions, custom_roles', '2026-03-12 00:15:06', 3),
('V003__user_profile', 'User profile and notification columns', '2026-03-12 00:15:06', 4),
('V004__solarquotes', 'External ID and marketing payload on leads', '2026-03-12 00:15:06', 3),
('V005__attendance', 'Employee attendance table', '2026-03-12 00:15:06', 1),
('V006__attendance_edit_requests', 'Attendance edit request table', '2026-03-12 00:15:06', 1),
('V007__leave', 'Leave balances and requests', '2026-03-12 00:15:06', 1),
('V008__expenses', 'Expense claims table', '2026-03-12 00:15:06', 1);

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` int(10) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `category` enum('installation','referral','others') NOT NULL DEFAULT 'installation',
  `category_other` varchar(255) DEFAULT NULL,
  `body` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed','withdrawn') NOT NULL DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `assigned_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_tickets`
--

INSERT INTO `support_tickets` (`id`, `lead_id`, `company_id`, `subject`, `category`, `category_other`, `body`, `status`, `priority`, `assigned_user_id`, `created_at`, `updated_at`) VALUES
(1, 69, NULL, 'asdsd', 'installation', NULL, 'asdsd', 'open', 'high', NULL, '2026-03-06 18:41:17', '2026-03-06 18:41:17'),
(2, 69, NULL, 'ghfdhgf', 'installation', NULL, 'dsfdsf', 'in_progress', 'medium', NULL, '2026-03-06 18:47:48', '2026-03-06 18:58:39');

-- --------------------------------------------------------

--
-- Table structure for table `support_ticket_replies`
--

CREATE TABLE `support_ticket_replies` (
  `id` int(10) UNSIGNED NOT NULL,
  `ticket_id` int(10) UNSIGNED NOT NULL,
  `author_type` enum('customer','staff') NOT NULL,
  `author_lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `author_user_id` int(10) UNSIGNED DEFAULT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_ticket_replies`
--

INSERT INTO `support_ticket_replies` (`id`, `ticket_id`, `author_type`, `author_lead_id`, `author_user_id`, `body`, `created_at`) VALUES
(1, 1, 'customer', 69, NULL, 'asdsd', '2026-03-06 18:41:17'),
(2, 2, 'customer', 69, NULL, 'dsfdsf', '2026-03-06 18:47:48'),
(3, 2, 'staff', NULL, NULL, 'sfdsdf', '2026-03-06 18:56:53'),
(4, 2, 'customer', 69, NULL, 'sdfssdfsd', '2026-03-06 18:57:06'),
(5, 2, 'customer', 69, NULL, 'sdf', '2026-03-06 18:58:39');

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
  `status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `failed_attempts` int(11) NOT NULL DEFAULT 0,
  `lock_until` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `notify_email` tinyint(1) NOT NULL DEFAULT 1,
  `notify_sms` tinyint(1) NOT NULL DEFAULT 0,
  `must_change_password` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `company_id`, `role_id`, `custom_role_id`, `email`, `password_hash`, `name`, `status`, `last_login_at`, `created_at`, `updated_at`, `failed_attempts`, `lock_until`, `password_changed_at`, `phone`, `department`, `image_url`, `notify_email`, `notify_sms`, `must_change_password`) VALUES
(2, 1, 2, NULL, 'admin@xyz.com', '$2a$12$5G1XgK6/jh8U7dGIywYHi.tuA9Kt.lJFLduCsyhxn6cdGsPR545/y', 'Jane test', 'active', NULL, '2026-02-09 03:34:20', '2026-02-09 03:34:20', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0),
(4, 3, 2, NULL, 'adsfghjh@gm.cp', '$2a$12$ocIOpqCBQPCJuUc2P9cGKeqomi1hLJQqgHHrmf5AesLsjwAKRUBBK', '23456576', 'active', NULL, '2026-02-09 07:06:50', '2026-02-09 07:06:50', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0),
(5, 4, 2, NULL, 'qwerty@gmail.com', '$2a$12$knNyXogLhimg3.AzwnD9y.IVhXbscsj0CI8m5Gmb9XZTOmw8eRZbS', 'Web Admin', 'active', '2026-02-11 05:09:32', '2026-02-11 05:09:18', '2026-02-11 05:09:32', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0),
(6, 5, 2, NULL, 'test1@gmail.com', '$2a$12$R97RTJsc9mXj1m9eEl6MLu94iBIGuFTbYoGkFCIvu0ZzUPRLU3UxK', 'Lorum Ipsum', 'active', NULL, '2026-02-17 08:34:44', '2026-02-17 08:34:44', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0),
(7, 1, 1, NULL, 'admin@xvrythng.com', '$2a$12$lpKQL0jCjGsitDuX6fOlmuhhAlvAx8V.KzlgWHSHDDrURNQbgYJ.O', 'Super Admin', 'active', '2026-03-18 05:00:21', '2026-02-20 06:45:28', '2026-03-18 05:00:21', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0),
(8, 1, 4, NULL, 'soumikpathak0@gmail.com', '$2a$10$ZWdw9Juz5vymFmZ76izbDuBk.MVDy8BlynimpXgqifsX7tu4TTSsK', 'Soumik Pathak', 'active', '2026-03-13 06:08:39', '2026-03-07 19:10:31', '2026-03-13 06:08:39', 0, NULL, NULL, NULL, NULL, NULL, 1, 0, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_company_created` (`company_id`,`created_at`),
  ADD KEY `idx_activity_lead_created` (`lead_id`,`created_at`),
  ADD KEY `idx_activity_user_created` (`user_id`,`created_at`);

--
-- Indexes for table `approval_activity`
--
ALTER TABLE `approval_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_approval_activity_company` (`company_id`),
  ADD KEY `idx_approval_activity_target` (`approval_type`,`approval_id`),
  ADD KEY `idx_approval_activity_employee` (`employee_id`),
  ADD KEY `idx_approval_activity_actor` (`actor_user_id`);

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
-- Indexes for table `company_payroll_settings`
--
ALTER TABLE `company_payroll_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_company_payroll_settings_company` (`company_id`);

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
  ADD KEY `idx_departments_company` (`company_id`);

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
-- Indexes for table `installation_checklist_items`
--
ALTER TABLE `installation_checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ici_company` (`company_id`),
  ADD KEY `idx_ici_section` (`section`);

--
-- Indexes for table `installation_checklist_responses`
--
ALTER TABLE `installation_checklist_responses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_icr_job_item` (`job_id`,`item_id`),
  ADD KEY `idx_icr_job` (`job_id`),
  ADD KEY `idx_icr_item` (`item_id`);

--
-- Indexes for table `installation_jobs`
--
ALTER TABLE `installation_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ij_company` (`company_id`),
  ADD KEY `idx_ij_project` (`project_id`),
  ADD KEY `idx_ij_retailer` (`retailer_project_id`),
  ADD KEY `idx_ij_date` (`scheduled_date`),
  ADD KEY `idx_ij_status` (`status`);

--
-- Indexes for table `installation_job_assignees`
--
ALTER TABLE `installation_job_assignees`
  ADD PRIMARY KEY (`job_id`,`employee_id`),
  ADD KEY `idx_ija_company` (`company_id`),
  ADD KEY `idx_ija_employee` (`employee_id`);

--
-- Indexes for table `installation_photos`
--
ALTER TABLE `installation_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ip_job` (`job_id`),
  ADD KEY `idx_ip_company` (`company_id`);

--
-- Indexes for table `installation_photo_requirements`
--
ALTER TABLE `installation_photo_requirements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_ipr_company_section` (`company_id`,`section`);

--
-- Indexes for table `installation_signoffs`
--
ALTER TABLE `installation_signoffs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `job_id` (`job_id`),
  ADD KEY `idx_is_job` (`job_id`);

--
-- Indexes for table `installation_time_records`
--
ALTER TABLE `installation_time_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_itr_job` (`job_id`),
  ADD KEY `idx_itr_company` (`company_id`),
  ADD KEY `idx_itr_event` (`event`);

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
  ADD KEY `idx_leads_referred_by` (`referred_by_lead_id`),
  ADD KEY `idx_leads_company` (`company_id`),
  ADD KEY `idx_leads_assigned` (`assigned_user_id`);

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
-- Indexes for table `payroll_details`
--
ALTER TABLE `payroll_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payroll_details_run` (`payroll_run_id`),
  ADD KEY `idx_payroll_details_employee` (`employee_id`);

--
-- Indexes for table `payroll_runs`
--
ALTER TABLE `payroll_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payroll_runs_company` (`company_id`),
  ADD KEY `idx_payroll_runs_period` (`period_start`,`period_end`),
  ADD KEY `idx_payroll_runs_status` (`status`),
  ADD KEY `fk_payroll_runs_created_by` (`created_by`);

--
-- Indexes for table `payslips`
--
ALTER TABLE `payslips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payslips_detail` (`payroll_detail_id`);

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
-- Indexes for table `project_schedules`
--
ALTER TABLE `project_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_project` (`project_id`),
  ADD KEY `idx_company_project` (`company_id`,`project_id`);

--
-- Indexes for table `referral_bonuses`
--
ALTER TABLE `referral_bonuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_referral_lead_id` (`referral_lead_id`),
  ADD KEY `idx_bonus_paid_at` (`bonus_paid_at`);

--
-- Indexes for table `referral_settings`
--
ALTER TABLE `referral_settings`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_support_tickets_lead` (`lead_id`),
  ADD KEY `idx_support_tickets_company` (`company_id`),
  ADD KEY `idx_support_tickets_assigned` (`assigned_user_id`),
  ADD KEY `idx_support_tickets_status` (`status`),
  ADD KEY `idx_support_tickets_created` (`created_at`);

--
-- Indexes for table `support_ticket_replies`
--
ALTER TABLE `support_ticket_replies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_replies_ticket` (`ticket_id`),
  ADD KEY `idx_replies_created` (`ticket_id`,`created_at`),
  ADD KEY `author_lead_id` (`author_lead_id`),
  ADD KEY `author_user_id` (`author_user_id`);

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
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_activity`
--
ALTER TABLE `approval_activity`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_edit_requests`
--
ALTER TABLE `attendance_edit_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `company_payroll_settings`
--
ALTER TABLE `company_payroll_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `company_types`
--
ALTER TABLE `company_types`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `conversation_participants`
--
ALTER TABLE `conversation_participants`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

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
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employment_types`
--
ALTER TABLE `employment_types`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `expense_claims`
--
ALTER TABLE `expense_claims`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inspection_templates`
--
ALTER TABLE `inspection_templates`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `installation_checklist_items`
--
ALTER TABLE `installation_checklist_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `installation_checklist_responses`
--
ALTER TABLE `installation_checklist_responses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_jobs`
--
ALTER TABLE `installation_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_photos`
--
ALTER TABLE `installation_photos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_photo_requirements`
--
ALTER TABLE `installation_photo_requirements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_signoffs`
--
ALTER TABLE `installation_signoffs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `installation_time_records`
--
ALTER TABLE `installation_time_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_roles`
--
ALTER TABLE `job_roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

--
-- AUTO_INCREMENT for table `lead_communications`
--
ALTER TABLE `lead_communications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_details`
--
ALTER TABLE `payroll_details`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_runs`
--
ALTER TABLE `payroll_runs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `payslips`
--
ALTER TABLE `payslips`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `project_schedules`
--
ALTER TABLE `project_schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `referral_bonuses`
--
ALTER TABLE `referral_bonuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `retailer_projects`
--
ALTER TABLE `retailer_projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `retailer_project_schedules`
--
ALTER TABLE `retailer_project_schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `support_ticket_replies`
--
ALTER TABLE `support_ticket_replies`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_activity_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_activity_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `approval_activity`
--
ALTER TABLE `approval_activity`
  ADD CONSTRAINT `approval_activity_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approval_activity_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approval_activity_ibfk_3` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `fk_companies_type` FOREIGN KEY (`company_type_id`) REFERENCES `company_types` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `company_payroll_settings`
--
ALTER TABLE `company_payroll_settings`
  ADD CONSTRAINT `fk_company_payroll_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `fk_departments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employee_attendance`
--
ALTER TABLE `employee_attendance`
  ADD CONSTRAINT `fk_attendance_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_checklist_responses`
--
ALTER TABLE `installation_checklist_responses`
  ADD CONSTRAINT `fk_icr_item` FOREIGN KEY (`item_id`) REFERENCES `installation_checklist_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_icr_job` FOREIGN KEY (`job_id`) REFERENCES `installation_jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_jobs`
--
ALTER TABLE `installation_jobs`
  ADD CONSTRAINT `fk_ij_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ij_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ij_retailer_project` FOREIGN KEY (`retailer_project_id`) REFERENCES `retailer_projects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `installation_job_assignees`
--
ALTER TABLE `installation_job_assignees`
  ADD CONSTRAINT `fk_ija_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ija_job` FOREIGN KEY (`job_id`) REFERENCES `installation_jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_photos`
--
ALTER TABLE `installation_photos`
  ADD CONSTRAINT `fk_ip_job` FOREIGN KEY (`job_id`) REFERENCES `installation_jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_photo_requirements`
--
ALTER TABLE `installation_photo_requirements`
  ADD CONSTRAINT `fk_ipr_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_signoffs`
--
ALTER TABLE `installation_signoffs`
  ADD CONSTRAINT `fk_is_job` FOREIGN KEY (`job_id`) REFERENCES `installation_jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `installation_time_records`
--
ALTER TABLE `installation_time_records`
  ADD CONSTRAINT `fk_itr_job` FOREIGN KEY (`job_id`) REFERENCES `installation_jobs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_roles`
--
ALTER TABLE `job_roles`
  ADD CONSTRAINT `fk_jobrole_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_assigned` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_leads_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;

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
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_details`
--
ALTER TABLE `payroll_details`
  ADD CONSTRAINT `fk_payroll_details_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payroll_details_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_runs`
--
ALTER TABLE `payroll_runs`
  ADD CONSTRAINT `fk_payroll_runs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payroll_runs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payslips`
--
ALTER TABLE `payslips`
  ADD CONSTRAINT `fk_payslips_detail` FOREIGN KEY (`payroll_detail_id`) REFERENCES `payroll_details` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `support_tickets_ibfk_3` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `support_ticket_replies`
--
ALTER TABLE `support_ticket_replies`
  ADD CONSTRAINT `support_ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `support_ticket_replies_ibfk_2` FOREIGN KEY (`author_lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `support_ticket_replies_ibfk_3` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
