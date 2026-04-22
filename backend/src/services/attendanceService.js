import db from '../config/db.js';
import { DateTime } from 'luxon';

const ATTENDANCE_BUSINESS_TZ = (
  String(process.env.ATTENDANCE_BUSINESS_TIMEZONE || 'Australia/Melbourne').trim() ||
  'Australia/Melbourne'
);

/**
 * How MySQL DATETIME strings from `dateStrings: true` should be interpreted.
 * Typical cloud DBs store session time as UTC — use `UTC` (default).
 * If your server writes local wall time in the business zone, set e.g. `Australia/Melbourne`.
 */
const ATTENDANCE_MYSQL_TZ_RAW = (
  String(process.env.ATTENDANCE_MYSQL_TIMEZONE || 'UTC').trim() || 'UTC'
);

function luxonZoneForMysql(raw) {
  const l = String(raw).trim().toLowerCase();
  if (l === 'utc' || l === 'gmt' || l === 'z') return 'utc';
  return String(raw).trim();
}

const ATTENDANCE_MYSQL_ZONE = luxonZoneForMysql(ATTENDANCE_MYSQL_TZ_RAW);

/**
 * Public: wall-clock zone used for attendance "today" and roster display.
 */
export function getAttendanceBusinessTimeZone() {
  return ATTENDANCE_BUSINESS_TZ;
}

/**
 * Roster/API: convert naïve MySQL datetime to UTC ISO + business-zone label for clients.
 */
function formatAttendanceInstantFields(naiveStr) {
  if (naiveStr == null) {
    return {
      isoUtc: null,
      display: null,
    };
  }
  const trimmed = String(naiveStr).trim();
  if (trimmed === '') {
    return { isoUtc: null, display: null };
  }

  let dt = DateTime.fromSQL(trimmed, { zone: ATTENDANCE_MYSQL_ZONE });
  if (!dt.isValid) {
    dt = DateTime.fromISO(trimmed.replace(' ', 'T'), { zone: ATTENDANCE_MYSQL_ZONE });
  }
  if (!dt.isValid) {
    return { isoUtc: null, display: null };
  }

  const business = dt.setZone(ATTENDANCE_BUSINESS_TZ);
  return {
    isoUtc: dt.toUTC().toISO(),
    display: business.toLocaleString(DateTime.DATETIME_SHORT, { locale: 'en-AU' }),
  };
}

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

function parseEnvNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnvInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Set ATTENDANCE_AUTO_CHECKOUT_ENABLED=false to disable the hourly cron job. */
const ATTENDANCE_AUTO_CHECKOUT_ENABLED =
  String(process.env.ATTENDANCE_AUTO_CHECKOUT_ENABLED ?? 'true').trim().toLowerCase() !== 'false';

/**
 * One standard shift: paid work hours (default 8) + lunch minutes (default 30).
 * Auto checkout runs when wall time since check-in >= (work + lunch/60), e.g. 8h + 30m = 8.5h open.
 */
const ATTENDANCE_AUTO_WORK_HOURS = Math.max(
  0.5,
  parseEnvNumber('ATTENDANCE_AUTO_CHECKOUT_WORK_HOURS', 8),
);

/** Lunch minutes deducted from the span for hours_worked (default 30). */
const ATTENDANCE_AUTO_LUNCH_MINUTES = Math.min(
  480,
  Math.max(0, parseEnvInt('ATTENDANCE_AUTO_CHECKOUT_LUNCH_MINUTES', 30)),
);

/** Wall-clock hours from check-in before auto-close (= work + lunch as hours). */
const ATTENDANCE_AUTO_SHIFT_OPEN_HOURS =
  ATTENDANCE_AUTO_WORK_HOURS + ATTENDANCE_AUTO_LUNCH_MINUTES / 60;

const ATTENDANCE_AUTO_SHIFT_SPAN_MINUTES = Math.round(
  ATTENDANCE_AUTO_WORK_HOURS * 60 + ATTENDANCE_AUTO_LUNCH_MINUTES,
);

function isOpenShiftReadyForAutoCheckout(row, now = new Date()) {
  const checkIn = new Date(row.check_in_time);
  if (Number.isNaN(checkIn.getTime())) return false;

  const hoursOpen = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  return hoursOpen >= ATTENDANCE_AUTO_SHIFT_OPEN_HOURS;
}

/**
 * Auto-close open shifts after a full standard shift on the clock (default 8h work + 30m lunch = 8h30).
 * check_out_time = check_in + that span; hours_worked = work hours; lunch_break_minutes as configured.
 */
export async function autoCheckoutStaleOpenShifts() {
  if (!ATTENDANCE_AUTO_CHECKOUT_ENABLED) {
    return { processed: 0, disabled: true };
  }

  const lunchM = ATTENDANCE_AUTO_LUNCH_MINUTES;
  const workH = ATTENDANCE_AUTO_WORK_HOURS;
  const spanMinutes = ATTENDANCE_AUTO_SHIFT_SPAN_MINUTES;
  const hoursWorkedRounded = Math.round(workH * 100) / 100;

  const [openRows] = await db.query(
    'SELECT * FROM employee_attendance WHERE check_out_time IS NULL ORDER BY id ASC'
  );

  const now = new Date();
  let processed = 0;
  const ids = [];

  for (const row of openRows) {
    if (!isOpenShiftReadyForAutoCheckout(row, now)) continue;

    const [result] = await db.query(
      `UPDATE employee_attendance
       SET check_out_time = DATE_ADD(check_in_time, INTERVAL ? MINUTE),
           check_out_lat = check_in_lat,
           check_out_lng = check_in_lng,
           lunch_break_minutes = ?,
           hours_worked = ?
       WHERE id = ? AND check_out_time IS NULL`,
      [spanMinutes, lunchM, hoursWorkedRounded, row.id]
    );

    if (result.affectedRows === 1) {
      processed += 1;
      ids.push(row.id);
    }
  }

  if (processed > 0) {
    console.log(
      '[Attendance] auto-checkout:',
      processed,
      'shift(s) past',
      ATTENDANCE_AUTO_SHIFT_OPEN_HOURS,
      'h open; ids=',
      ids.length > 30 ? `${ids.slice(0, 30).join(',')}…` : ids.join(','),
    );
  }

  return { processed, ids };
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
  const checkOutLat = normalizeCoordinate(lat, 'lat');
  const checkOutLng = normalizeCoordinate(lng, 'lng');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [openRows] = await conn.query(
      `SELECT * FROM employee_attendance
       WHERE company_id = ? AND employee_id = ? AND check_out_time IS NULL
       ORDER BY created_at ASC`,
      [companyId, employeeId]
    );

    if (!openRows.length) {
      throw new Error('No open check-in found for today.');
    }

    // More than one open row (stale/duplicate state) used to require multiple Check Out taps.
    // Close older rows as zero-hour corrections; the newest open row is the active shift.
    const primary = openRows[openRows.length - 1];
    const orphans = openRows.slice(0, -1);

    for (const row of orphans) {
      await conn.query(
        `UPDATE employee_attendance
         SET check_out_time = DATE_ADD(check_in_time, INTERVAL 1 SECOND),
             check_out_lat = ?, check_out_lng = ?,
             lunch_break_minutes = 0, hours_worked = 0
         WHERE id = ?`,
        [checkOutLat, checkOutLng, row.id]
      );
    }

    const attendanceId = primary.id;
    const checkInTime = new Date(primary.check_in_time);
    const now = new Date();
    const storedLunchBreakMinutes = normalizeLunchBreakMinutes(primary.lunch_break_minutes);
    const requestedLunchBreakMinutes =
      lunchBreakMinutes === null || lunchBreakMinutes === undefined || lunchBreakMinutes === ''
        ? null
        : normalizeLunchBreakMinutes(lunchBreakMinutes);
    const appliedLunchBreakMinutes = requestedLunchBreakMinutes ?? storedLunchBreakMinutes;
    const hoursWorked = Math.max(
      0,
      (now - checkInTime) / (1000 * 60 * 60) - appliedLunchBreakMinutes / 60,
    );

    await conn.query(
      `UPDATE employee_attendance 
       SET check_out_time = NOW(), check_out_lat = ?, check_out_lng = ?, lunch_break_minutes = ?, hours_worked = ? 
       WHERE id = ?`,
      [checkOutLat, checkOutLng, appliedLunchBreakMinutes, hoursWorked, attendanceId]
    );

    await conn.commit();
    return { id: attendanceId, hoursWorked };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
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
  return rows.map((r) => {
    const inF = formatAttendanceInstantFields(r.check_in_time);
    const outF = formatAttendanceInstantFields(r.check_out_time);
    return {
      ...r,
      check_in_time: inF.isoUtc ?? r.check_in_time,
      check_out_time: outF.isoUtc ?? r.check_out_time,
      check_in_time_display: inF.display,
      check_out_time_display: outF.display,
    };
  });
}
