-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 11, 2026 at 04:09 AM
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
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `stage` enum('new','contacted','qualified','inspection_booked','inspection_completed','proposal_sent','negotiation','closed_won','closed_lost') NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `is_won` tinyint(1) NOT NULL DEFAULT 0,
  `won_lost_at` datetime DEFAULT NULL,
  `last_activity_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `stage`, `customer_name`, `suburb`, `system_size_kw`, `value_amount`, `source`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `created_at`, `updated_at`) VALUES
(1, 'new', 'test', 'test', 1000.00, NULL, NULL, 0, 0, NULL, '2026-02-11 08:52:35', '2026-02-11 01:52:35', NULL),
(2, 'new', 'test', 'test', 1000.00, NULL, NULL, 0, 0, NULL, '2026-02-11 08:52:45', '2026-02-11 01:52:45', NULL),
(3, 'new', 'test', 'test', 100.00, 200.00, 'test', 0, 0, NULL, '2026-02-11 08:55:40', '2026-02-11 01:55:40', NULL),
(4, 'closed_won', 'test', 'test', 100.00, 123.00, '123', 1, 1, '2026-02-11 09:27:31', '2026-02-11 09:27:31', '2026-02-11 01:55:57', '2026-02-11 02:27:31'),
(5, 'new', 'test', 'test', 100.00, 100.00, 'Web', 0, 0, NULL, '2026-02-11 09:45:20', '2026-02-11 02:45:20', NULL),
(6, 'new', 'Minh', 'Minh', 5.00, 5.00, 'gg', 0, 0, NULL, '2026-02-11 10:04:12', '2026-02-11 02:46:32', '2026-02-11 03:04:12');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_leads_board` (`stage`,`updated_at`),
  ADD KEY `idx_leads_stage_count` (`stage`),
  ADD KEY `idx_leads_value` (`value_amount`),
  ADD KEY `idx_leads_text` (`customer_name`),
  ADD KEY `idx_leads_suburb` (`suburb`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
