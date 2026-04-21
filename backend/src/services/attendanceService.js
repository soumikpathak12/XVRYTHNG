import db from '../config/db.js';

const ATTENDANCE_BUSINESS_TZ = (
  String(process.env.ATTENDANCE_BUSINESS_TIMEZONE || 'Australia/Melbourne').trim() ||
  'Australia/Melbourne'
);

/**
 * Calendar date (YYYY-MM-DD) for attendance "today" / row `date` column.
 * Uses IANA timezone so it matches staff wall clocks (not MySQL CURDATE() in UTC).
 */
function attendanceBusinessDateYmd(refDate = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(refDate);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !d) {
    throw new Error('Unable to resolve attendance business date.');
  }
  return `${y}-${m}-${d}`;
}

function normalizeCoordinate(value, kind) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${kind} is required for attendance location capture.`);
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid ${kind} value.`);
  }

  if (kind === 'lat' && (n < -90 || n > 90)) {
    throw new Error('Latitude must be between -90 and 90.');
  }
  if (kind === 'lng' && (n < -180 || n > 180)) {
    throw new Error('Longitude must be between -180 and 180.');
  }

  return n;
}

function normalizeLunchBreakMinutes(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Invalid lunch break minutes value.');
  }

  return Math.min(Math.round(n), 480);
}

export async function getEmployeeIdByUserId(companyId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM employees WHERE company_id = ? AND user_id = ? AND status = "active" LIMIT 1',
    [companyId, userId]
  );
  if (rows && rows.length > 0) {
    return rows[0].id;
  }

  // Fallback: legacy data may have active employees without user_id linkage.
  // In that case, link by same-company email to allow attendance APIs to work.
  const [[user]] = await db.query(
    'SELECT id, company_id, email, name, status FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  const email = String(user?.email ?? '').trim().toLowerCase();
  const tenantCompanyId = Number(companyId ?? 0) || null;
  const userCompanyId = Number(user?.company_id ?? 0) || null;
  if (!email || !tenantCompanyId) {
    throw new Error('Employee not found or inactive');
  }

  const candidateCompanyIds = userCompanyId && userCompanyId !== tenantCompanyId
    ? [tenantCompanyId, userCompanyId]
    : [tenantCompanyId];

  for (const candidateCompanyId of candidateCompanyIds) {
    const [emailRows] = await db.query(
      `SELECT id, user_id
         FROM employees
        WHERE company_id = ?
          AND status = "active"
          AND LOWER(TRIM(email)) = ?
          AND (user_id IS NULL OR user_id = 0 OR user_id = ?)
        ORDER BY id DESC
        LIMIT 2`,
      [candidateCompanyId, email, userId]
    );

    if (!emailRows || emailRows.length !== 1) {
      continue;
    }

    const employeeId = Number(emailRows[0].id);
    await db.query(
      'UPDATE employees SET user_id = ? WHERE id = ? AND company_id = ? AND (user_id IS NULL OR user_id = 0)',
      [userId, employeeId, candidateCompanyId]
    );

    return employeeId;
  }

  const userStatus = String(user?.status ?? '').trim().toLowerCase();
  if (userStatus === 'active') {
    const rawName = String(user?.name ?? '').trim();
    const nameParts = rawName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.length ? nameParts[0] : 'User';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Account';

    const [created] = await db.query(
      `INSERT INTO employees (company_id, user_id, first_name, last_name, email, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [tenantCompanyId, userId, firstName, lastName, email]
    );

    return created.insertId;
  }

  throw new Error('Employee not found or inactive');
}

export async function getTodayStatus(companyId, employeeId) {
  const todayYmd = attendanceBusinessDateYmd();
  const [openRows] = await db.query(
    `SELECT * FROM employee_attendance
     WHERE company_id = ? AND employee_id = ? AND check_out_time IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId, employeeId]
  );
  if (openRows.length) return openRows[0];

  const [rows] = await db.query(
    'SELECT * FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
    [companyId, employeeId, todayYmd]
  );
  return rows.length ? rows[0] : null;
}

export async function checkIn(companyId, employeeId, lat, lng, lunchBreakMinutes = 0) {
  const todayYmd = attendanceBusinessDateYmd();
  // Any open shift blocks a new check-in (covers legacy rows with wrong `date` vs business TZ).
  const [existing] = await db.query(
    'SELECT id FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND check_out_time IS NULL LIMIT 1',
    [companyId, employeeId]
  );
  if (existing.length > 0) {
    throw new Error('Already checked in without checking out.');
  }

  // Keep behavior consistent across Attendance and On Field:
  // once a day is checked out, do not allow another check-in for the same date.
  const [completedToday] = await db.query(
    'SELECT id FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = ? AND check_out_time IS NOT NULL LIMIT 1',
    [companyId, employeeId, todayYmd]
  );
  if (completedToday.length > 0) {
    throw new Error('You already checked out today. Check-in is locked for this day.');
  }

  const checkInLat = normalizeCoordinate(lat, 'lat');
  const checkInLng = normalizeCoordinate(lng, 'lng');
  const lunchBreakMinutesValue = normalizeLunchBreakMinutes(lunchBreakMinutes);

  const [result] = await db.query(
    `INSERT INTO employee_attendance 
      (company_id, employee_id, check_in_time, check_in_lat, check_in_lng, lunch_break_minutes, date) 
     VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
    [companyId, employeeId, checkInLat, checkInLng, lunchBreakMinutesValue, todayYmd]
  );
  return { id: result.insertId };
}

export async function checkOut(companyId, employeeId, lat, lng, lunchBreakMinutes = null) {
  const [existing] = await db.query(
    `SELECT * FROM employee_attendance
     WHERE company_id = ? AND employee_id = ? AND check_out_time IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId, employeeId]
  );

  if (!existing.length) {
    throw new Error('No open check-in found for today.');
  }
  
  const attendanceId = existing[0].id;
  const checkInTime = new Date(existing[0].check_in_time);
  const now = new Date();
  const storedLunchBreakMinutes = normalizeLunchBreakMinutes(existing[0].lunch_break_minutes);
  const requestedLunchBreakMinutes =
    lunchBreakMinutes === null || lunchBreakMinutes === undefined || lunchBreakMinutes === ''
      ? null
      : normalizeLunchBreakMinutes(lunchBreakMinutes);
  const appliedLunchBreakMinutes = requestedLunchBreakMinutes ?? storedLunchBreakMinutes;
  const hoursWorked = Math.max(
    0,
    (now - checkInTime) / (1000 * 60 * 60) - appliedLunchBreakMinutes / 60,
  );

  const checkOutLat = normalizeCoordinate(lat, 'lat');
  const checkOutLng = normalizeCoordinate(lng, 'lng');

  await db.query(
    `UPDATE employee_attendance 
     SET check_out_time = NOW(), check_out_lat = ?, check_out_lng = ?, lunch_break_minutes = ?, hours_worked = ? 
     WHERE id = ?`,
    [checkOutLat, checkOutLng, appliedLunchBreakMinutes, hoursWorked, attendanceId]
  );

  return { id: attendanceId, hoursWorked };
}

export async function getHistory(companyId, employeeId, limit = 30) {
  const [rows] = await db.query(
    'SELECT * FROM employee_attendance WHERE company_id = ? AND employee_id = ? ORDER BY date DESC, check_in_time DESC LIMIT ?',
    [companyId, employeeId, limit]
  );
  return rows;
}

/** All employees for a company on one calendar day, with latest attendance row if any. */
export async function listCompanyAttendanceForDate(companyId, dateStr) {
  const [rows] = await db.query(
    `SELECT
       e.id AS employee_id,
       e.employee_code,
       e.first_name,
       e.last_name,
       e.email,
       e.status AS employee_status,
       ea.id AS attendance_id,
       ea.check_in_time,
       ea.check_out_time,
       ea.hours_worked,
       ea.lunch_break_minutes,
       ea.date AS attendance_date
     FROM employees e
     LEFT JOIN (
       SELECT a.*
         FROM employee_attendance a
         INNER JOIN (
           SELECT employee_id, MAX(id) AS max_id
             FROM employee_attendance
            WHERE company_id = ? AND date = ?
            GROUP BY employee_id
         ) pick ON pick.max_id = a.id
     ) ea ON ea.employee_id = e.id
    WHERE e.company_id = ?
    ORDER BY e.last_name ASC, e.first_name ASC`,
    [companyId, dateStr, companyId]
  );
  return rows;
}
