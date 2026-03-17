
ALTER TABLE `leads`
  ADD COLUMN IF NOT EXISTS `system_type`               VARCHAR(100)  DEFAULT NULL,
  -- Property
  ADD COLUMN IF NOT EXISTS `house_storey`              VARCHAR(50)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `roof_type`                 VARCHAR(100)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `meter_phase`               VARCHAR(20)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `access_to_second_storey`   TINYINT(1)    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `access_to_inverter`        TINYINT(1)    DEFAULT NULL,
  -- Utility
  ADD COLUMN IF NOT EXISTS `pre_approval_reference_no` VARCHAR(100)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `energy_retailer`           VARCHAR(120)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `energy_distributor`        VARCHAR(120)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `solar_vic_eligibility`     TINYINT(1)    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `nmi_number`                VARCHAR(50)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `meter_number`              VARCHAR(50)   DEFAULT NULL;

