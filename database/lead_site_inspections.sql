-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 21, 2026 at 09:32 AM
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
-- Table structure for table `lead_site_inspections`
--

CREATE TABLE `lead_site_inspections` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
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
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_lead` (`lead_id`),
  ADD KEY `idx_lead` (`lead_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `lead_site_inspections`
--
ALTER TABLE `lead_site_inspections`
  ADD CONSTRAINT `fk_siteinsp_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
