import db from '../config/db.js';

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
  const [rows] = await db.query(
    'SELECT * FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = CURDATE() ORDER BY created_at DESC LIMIT 1',
    [companyId, employeeId]
  );
  return rows.length ? rows[0] : null;
}

export async function checkIn(companyId, employeeId, lat, lng) {
  // Check if there's an open check-in today
  const [existing] = await db.query(
    'SELECT * FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = CURDATE() AND check_out_time IS NULL LIMIT 1',
    [companyId, employeeId]
  );
  if (existing.length > 0) {
    throw new Error('Already checked in without checking out.');
  }

  // Keep behavior consistent across Attendance and On Field:
  // once a day is checked out, do not allow another check-in for the same date.
  const [completedToday] = await db.query(
    'SELECT id FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = CURDATE() AND check_out_time IS NOT NULL LIMIT 1',
    [companyId, employeeId]
  );
  if (completedToday.length > 0) {
    throw new Error('You already checked out today. Check-in is locked for this day.');
  }

  const checkInLat = normalizeCoordinate(lat, 'lat');
  const checkInLng = normalizeCoordinate(lng, 'lng');

  const [result] = await db.query(
    `INSERT INTO employee_attendance 
      (company_id, employee_id, check_in_time, check_in_lat, check_in_lng, date) 
     VALUES (?, ?, NOW(), ?, ?, CURDATE())`,
    [companyId, employeeId, checkInLat, checkInLng]
  );
  return { id: result.insertId };
}

export async function checkOut(companyId, employeeId, lat, lng) {
  // Find open check-in
  const [existing] = await db.query(
    'SELECT * FROM employee_attendance WHERE company_id = ? AND employee_id = ? AND date = CURDATE() AND check_out_time IS NULL ORDER BY created_at DESC LIMIT 1',
    [companyId, employeeId]
  );
  
  if (!existing.length) {
    throw new Error('No open check-in found for today.');
  }
  
  const attendanceId = existing[0].id;
  const checkInTime = new Date(existing[0].check_in_time);
  const now = new Date();
  const hoursWorked = (now - checkInTime) / (1000 * 60 * 60);

  const checkOutLat = normalizeCoordinate(lat, 'lat');
  const checkOutLng = normalizeCoordinate(lng, 'lng');

  await db.query(
    `UPDATE employee_attendance 
     SET check_out_time = NOW(), check_out_lat = ?, check_out_lng = ?, hours_worked = ? 
     WHERE id = ?`,
    [checkOutLat, checkOutLng, hoursWorked, attendanceId]
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
