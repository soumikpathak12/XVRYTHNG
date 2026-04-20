
INSERT IGNORE INTO `modules` (`key_name`, `display_name`) VALUES
('attendance_history', 'Team attendance roster');

INSERT IGNORE INTO `company_type_modules` (`company_type_id`, `module_key`) VALUES
(1, 'attendance_history'),
(3, 'attendance_history');

