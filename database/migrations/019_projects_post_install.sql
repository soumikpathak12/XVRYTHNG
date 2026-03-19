ALTER TABLE `projects`
  ADD COLUMN IF NOT EXISTS `post_install_reference_no` VARCHAR(100) DEFAULT NULL AFTER `expected_completion_date`;

