-- Employee 19, company 1 — working days only (Mon–Fri in range), 8h/day.
-- Dates: 2026-04-07 .. 2026-04-14 excluding Sat 11 & Sun 12.
-- Adjust times if your business uses different shifts.

INSERT INTO employee_attendance
  (company_id, employee_id, check_in_time, check_out_time, hours_worked, `date`)
VALUES
  (1, 19, '2026-04-07 09:00:00', '2026-04-07 17:00:00', 8.00, '2026-04-07'),
  (1, 19, '2026-04-08 09:00:00', '2026-04-08 17:00:00', 8.00, '2026-04-08'),
  (1, 19, '2026-04-09 09:00:00', '2026-04-09 17:00:00', 8.00, '2026-04-09'),
  (1, 19, '2026-04-10 09:00:00', '2026-04-10 17:00:00', 8.00, '2026-04-10'),
  (1, 19, '2026-04-13 09:00:00', '2026-04-13 17:00:00', 8.00, '2026-04-13'),
  (1, 19, '2026-04-14 09:00:00', '2026-04-14 17:00:00', 8.00, '2026-04-14');
