-- 021_retailer_projects_add_system_type_fields.sql
-- Add PV / EV / Battery + Utility fields to retailer_projects
-- so the retailer project can save details similarly to Leads.

ALTER TABLE `retailer_projects`
  ADD COLUMN `pv_system_size_kw` decimal(10,2) DEFAULT NULL,
  ADD COLUMN `pv_inverter_size_kw` decimal(10,2) DEFAULT NULL,
  ADD COLUMN `pv_inverter_brand` varchar(120) DEFAULT NULL,
  ADD COLUMN `pv_panel_brand` varchar(120) DEFAULT NULL,
  ADD COLUMN `pv_panel_module_watts` int(11) DEFAULT NULL,
  ADD COLUMN `ev_charger_brand` varchar(120) DEFAULT NULL,
  ADD COLUMN `ev_charger_model` varchar(120) DEFAULT NULL,
  ADD COLUMN `battery_size_kwh` decimal(10,2) DEFAULT NULL,
  ADD COLUMN `battery_brand` varchar(120) DEFAULT NULL,
  ADD COLUMN `battery_model` varchar(120) DEFAULT NULL,
  ADD COLUMN `pre_approval_reference_no` varchar(100) DEFAULT NULL,
  ADD COLUMN `energy_retailer` varchar(120) DEFAULT NULL,
  ADD COLUMN `energy_distributor` varchar(120) DEFAULT NULL,
  ADD COLUMN `solar_vic_eligibility` tinyint(1) DEFAULT NULL,
  ADD COLUMN `nmi_number` varchar(50) DEFAULT NULL,
  ADD COLUMN `meter_number` varchar(50) DEFAULT NULL;

