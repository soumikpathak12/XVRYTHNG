-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 19, 2026 at 03:11 AM
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
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `suburb` varchar(150) DEFAULT NULL,
  `system_size_kw` decimal(10,2) DEFAULT NULL,
  `value_amount` decimal(14,2) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
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
  `owner_doc_reminders_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leads`
--

INSERT INTO `leads` (`id`, `stage`, `customer_name`, `email`, `phone`, `suburb`, `system_size_kw`, `value_amount`, `source`, `is_closed`, `is_won`, `won_lost_at`, `last_activity_at`, `site_inspection_date`, `created_at`, `updated_at`, `system_type`, `house_storey`, `roof_type`, `meter_phase`, `access_to_second_storey`, `access_to_inverter`, `pre_approval_reference_no`, `energy_retailer`, `energy_distributor`, `solar_vic_eligibility`, `nmi_number`, `meter_number`, `contacted_at`, `last_inbound_email_at`, `last_outbound_email_at`, `followup_first_sent_at`, `followup_second_sent_at`, `flagged_for_review_at`, `auto_close_nonresponsive`, `lost_reason`, `owner_doc_last_sent_at`, `owner_doc_reminders_count`) VALUES
(1, 'new', 'MInwerwe', '', '', 'test', 1000.00, NULL, NULL, 0, 0, NULL, '2026-02-19 08:50:49', NULL, '2026-02-11 01:52:35', '2026-02-19 01:50:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-02-19 08:50:49', 22);

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
  ADD KEY `idx_leads_suburb` (`suburb`),
  ADD KEY `idx_leads_site_inspection_date` (`site_inspection_date`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
