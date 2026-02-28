-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 25, 2026 at 05:28 AM
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

--
-- Indexes for dumped tables
--

--
-- Indexes for table `job_role_modules`
--
ALTER TABLE `job_role_modules`
  ADD PRIMARY KEY (`job_role_id`,`module_key`),
  ADD KEY `fk_jrm_module` (`module_key`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `job_role_modules`
--
ALTER TABLE `job_role_modules`
  ADD CONSTRAINT `fk_jrm_module` FOREIGN KEY (`module_key`) REFERENCES `modules` (`key_name`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jrm_role` FOREIGN KEY (`job_role_id`) REFERENCES `job_roles` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
