-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 25, 2026 at 05:27 AM
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
(2, 1, 4, '', 'testing', 'testing', '0000-00-00', '', 'lenguyennhutminh44@gmail.com', '61433193725', '', '', '', '', '', '', 1, 1, 1, '2025-09-09', NULL, 'hourly', 250.00, 'active', '', '2026-02-25 00:41:49', '2026-02-25 00:41:49');

--
-- Indexes for dumped tables
--

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
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_emp_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_emp_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_emptype` FOREIGN KEY (`employment_type_id`) REFERENCES `employment_types` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_jobrole` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
