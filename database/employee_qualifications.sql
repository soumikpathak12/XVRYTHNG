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
-- Table structure for table `employee_qualifications`
--

CREATE TABLE `employee_qualifications` (
  `employee_id` int(10) UNSIGNED NOT NULL,
  `qualification_id` int(10) UNSIGNED NOT NULL,
  `obtained_date` date DEFAULT NULL,
  `expires_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `employee_qualifications`
--
ALTER TABLE `employee_qualifications`
  ADD PRIMARY KEY (`employee_id`,`qualification_id`),
  ADD KEY `fk_eq_qual` (`qualification_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `employee_qualifications`
--
ALTER TABLE `employee_qualifications`
  ADD CONSTRAINT `fk_eq_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eq_qual` FOREIGN KEY (`qualification_id`) REFERENCES `qualifications` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
