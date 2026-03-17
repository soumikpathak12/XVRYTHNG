import db from '../config/db.js';

/**
 * Employee: submit a request to correct their attendance for a specific record.
 */
export async function submitEditRequest(companyId, employeeId, attendanceId, { reqCheckIn, reqCheckOut, reason }) {
  // Fetch original record
  const [[orig]] = await db.query(
    'SELECT * FROM employee_attendance WHERE id = ? AND company_id = ? AND employee_id = ? LIMIT 1',
    [attendanceId, companyId, employeeId]
  );
  if (!orig) throw new Error('Attendance record not found.');

  // Prevent duplicate pending request for same record
  const [[existing]] = await db.query(
    `SELECT id FROM attendance_edit_requests
     WHERE attendance_id = ? AND status = 'pending' LIMIT 1`,
    [attendanceId]
  );
  if (existing) throw new Error('A pending edit request already exists for this record.');

  const [result] = await db.query(
    `INSERT INTO attendance_edit_requests
       (company_id, employee_id, attendance_id,
        orig_check_in, orig_check_out, orig_hours,
        req_check_in, req_check_out, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId, employeeId, attendanceId,
      orig.check_in_time || null,
      orig.check_out_time || null,
      orig.hours_worked || null,
      reqCheckIn,
      reqCheckOut,
      reason,
    ]
  );
  return { id: result.insertId };
}

/**
 * Employee: list their own edit requests.
 */
export async function getMyEditRequests(companyId, employeeId) {
  const [rows] = await db.query(
    `SELECT aer.*, 
            ea.date AS attendance_date
     FROM attendance_edit_requests aer
     JOIN employee_attendance ea ON ea.id = aer.attendance_id
     WHERE aer.company_id = ? AND aer.employee_id = ?
     ORDER BY aer.created_at DESC`,
    [companyId, employeeId]
  );
  return rows;
}

/**
 * Manager/Admin: list pending edit requests for the whole company.
 * If companyId is null (super admin), returns all pending across all companies.
 */
export async function getPendingEditRequests(companyId) {
  const [rows] = companyId
    ? await db.query(
        `SELECT aer.*,
                ea.date AS attendance_date,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM attendance_edit_requests aer
         JOIN employee_attendance ea ON ea.id = aer.attendance_id
         JOIN employees e            ON e.id  = aer.employee_id
         JOIN companies c            ON c.id  = aer.company_id
         WHERE aer.company_id = ? AND aer.status = 'pending'
         ORDER BY aer.created_at ASC`,
        [companyId]
      )
    : await db.query(
        `SELECT aer.*,
                ea.date AS attendance_date,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM attendance_edit_requests aer
         JOIN employee_attendance ea ON ea.id = aer.attendance_id
         JOIN employees e            ON e.id  = aer.employee_id
         JOIN companies c            ON c.id  = aer.company_id
         WHERE aer.status = 'pending'
         ORDER BY aer.created_at ASC`
      );
  return rows;
}

/**
 * Manager/Admin: approve or reject a request.
 */
export async function reviewEditRequest(companyId, requestId, reviewerId, action, reviewerNote = '') {
  if (!['approved', 'rejected'].includes(action)) throw new Error('Invalid action.');

  // Super admin passes null companyId — skip company filter
  const [[req]] = companyId
    ? await db.query(
        `SELECT * FROM attendance_edit_requests WHERE id = ? AND company_id = ? AND status = 'pending' LIMIT 1`,
        [requestId, companyId]
      )
    : await db.query(
        `SELECT * FROM attendance_edit_requests WHERE id = ? AND status = 'pending' LIMIT 1`,
        [requestId]
      );
  if (!req) throw new Error('Pending edit request not found.');

  await db.query(
    `UPDATE attendance_edit_requests
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reviewer_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [action, reviewerId, reviewerNote || null, requestId]
  );

  // If approved → apply the corrected times to the attendance record
  if (action === 'approved') {
    const checkIn  = new Date(req.req_check_in);
    const checkOut = new Date(req.req_check_out);
    const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);

    await db.query(
      `UPDATE employee_attendance
       SET check_in_time = ?, check_out_time = ?, hours_worked = ?, updated_at = NOW()
       WHERE id = ?`,
      [req.req_check_in, req.req_check_out, parseFloat(hoursWorked.toFixed(4)), req.attendance_id]
    );
  }

  return { success: true, action };
}
