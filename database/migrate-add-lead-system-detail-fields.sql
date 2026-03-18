-- Add PV / EV / Battery detail columns to leads
ALTER TABLE `leads`
  ADD COLUMN `pv_system_size_kw`       decimal(10,2) DEFAULT NULL AFTER `system_size_kw`,
  ADD COLUMN `pv_inverter_size_kw`     decimal(10,2) DEFAULT NULL AFTER `pv_system_size_kw`,
  ADD COLUMN `pv_inverter_brand`       varchar(120)  DEFAULT NULL AFTER `pv_inverter_size_kw`,
  ADD COLUMN `pv_panel_brand`          varchar(120)  DEFAULT NULL AFTER `pv_inverter_brand`,
  ADD COLUMN `pv_panel_module_watts`   int(11)       DEFAULT NULL AFTER `pv_panel_brand`,
  ADD COLUMN `ev_charger_brand`        varchar(120)  DEFAULT NULL AFTER `pv_panel_module_watts`,
  ADD COLUMN `ev_charger_model`        varchar(120)  DEFAULT NULL AFTER `ev_charger_brand`,
  ADD COLUMN `battery_size_kwh`        decimal(10,2) DEFAULT NULL AFTER `ev_charger_model`,
  ADD COLUMN `battery_brand`           varchar(120)  DEFAULT NULL AFTER `battery_size_kwh`,
  ADD COLUMN `battery_model`           varchar(120)  DEFAULT NULL AFTER `battery_brand`;

