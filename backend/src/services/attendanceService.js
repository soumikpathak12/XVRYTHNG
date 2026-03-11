import db from '../config/db.js';

export async function getEmployeeIdByUserId(companyId, userId) {
  const [rows] = await db.query(
    'SELECT id FROM employees WHERE company_id = ? AND user_id = ? AND status = "active" LIMIT 1',
    [companyId, userId]
  );
  if (!rows || rows.length === 0) {
    throw new Error('Employee not found or inactive');
  }
  return rows[0].id;
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

  const [result] = await db.query(
    `INSERT INTO employee_attendance 
      (company_id, employee_id, check_in_time, check_in_lat, check_in_lng, date) 
     VALUES (?, ?, NOW(), ?, ?, CURDATE())`,
    [companyId, employeeId, lat || null, lng || null]
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

  await db.query(
    `UPDATE employee_attendance 
     SET check_out_time = NOW(), check_out_lat = ?, check_out_lng = ?, hours_worked = ? 
     WHERE id = ?`,
    [lat || null, lng || null, hoursWorked, attendanceId]
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
