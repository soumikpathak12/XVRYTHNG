ALTER TABLE `leads`
  ADD COLUMN IF NOT EXISTS `pv_panel_model` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pv_panel_quantity` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pv_inverter_model` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pv_inverter_series` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pv_inverter_power_kw` decimal(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `pv_inverter_quantity` int(11) DEFAULT NULL;

