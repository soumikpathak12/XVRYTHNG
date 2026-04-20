ALTER TABLE employee_attendance
ADD COLUMN lunch_break_minutes SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0
AFTER hours_worked;