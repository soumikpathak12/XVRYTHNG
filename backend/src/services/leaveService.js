import db from '../config/db.js';

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'unpaid'];

// Default allocations per year for new employees
const DEFAULT_BALANCES = { annual: 20, sick: 10, personal: 5, unpaid: 999 };

/* ─── helpers ──────────────────────────────────────── */

function businessDays(startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/* ─── Balances ─────────────────────────────────────── */

/**
 * Ensure balances exist for an employee for the current year.
 * Called lazily the first time a balance is requested.
 */
export async function ensureBalances(companyId, employeeId) {
  const year = new Date().getFullYear();
  const [existing] = await db.query(
    'SELECT id FROM leave_balances WHERE company_id = ? AND employee_id = ? AND year = ? LIMIT 1',
    [companyId, employeeId, year]
  );
  if (existing.length > 0) return;

  const inserts = LEAVE_TYPES.map(t =>
    db.query(
      `INSERT IGNORE INTO leave_balances (company_id, employee_id, leave_type, total_days, used_days, year)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [companyId, employeeId, t, DEFAULT_BALANCES[t], year]
    )
  );
  await Promise.all(inserts);
}

/**
 * Get all balances for an employee for the current year.
 */
export async function getBalances(companyId, employeeId) {
  await ensureBalances(companyId, employeeId);
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    'SELECT * FROM leave_balances WHERE company_id = ? AND employee_id = ? AND year = ? ORDER BY leave_type',
    [companyId, employeeId, year]
  );
  return rows.map(r => ({
    ...r,
    remaining: parseFloat((Number(r.total_days) - Number(r.used_days)).toFixed(1)),
  }));
}

/* ─── Leave Requests ───────────────────────────────── */

/**
 * Submit a leave request. Validates balance.
 */
export async function submitLeaveRequest(companyId, employeeId, { leaveType, startDate, endDate, reason }) {
  if (!LEAVE_TYPES.includes(leaveType)) throw new Error('Invalid leave type.');
  if (!startDate || !endDate || !reason) throw new Error('startDate, endDate, and reason are required.');
  if (new Date(endDate) < new Date(startDate)) throw new Error('End date must be on or after start date.');

  const daysCount = businessDays(startDate, endDate);
  if (daysCount <= 0) throw new Error('Selected dates contain no working days.');

  // Check balance (skip for unpaid)
  await ensureBalances(companyId, employeeId);
  if (leaveType !== 'unpaid') {
    const year = new Date(startDate).getFullYear();
    const [[bal]] = await db.query(
      'SELECT total_days, used_days FROM leave_balances WHERE company_id = ? AND employee_id = ? AND leave_type = ? AND year = ? LIMIT 1',
      [companyId, employeeId, leaveType, year]
    );
    if (!bal) throw new Error('Leave balance not found.');
    const remaining = Number(bal.total_days) - Number(bal.used_days);
    if (daysCount > remaining) {
      throw new Error(`Insufficient balance. You have ${remaining} day(s) remaining for ${leaveType} leave.`);
    }
  }

  // Check overlapping pending/approved requests
  const [overlaps] = await db.query(
    `SELECT id FROM leave_requests
     WHERE company_id = ? AND employee_id = ?
       AND status IN ('pending','approved')
       AND start_date <= ? AND end_date >= ?
     LIMIT 1`,
    [companyId, employeeId, endDate, startDate]
  );
  if (overlaps.length > 0) throw new Error('You already have a leave request overlapping these dates.');

  const [result] = await db.query(
    `INSERT INTO leave_requests
       (company_id, employee_id, leave_type, start_date, end_date, days_count, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [companyId, employeeId, leaveType, startDate, endDate, daysCount, reason]
  );

  return { id: result.insertId, daysCount };
}

/**
 * Employee: list own leave requests.
 */
export async function getMyLeaveRequests(companyId, employeeId) {
  const [rows] = await db.query(
    `SELECT * FROM leave_requests
     WHERE company_id = ? AND employee_id = ?
     ORDER BY created_at DESC`,
    [companyId, employeeId]
  );
  return rows;
}

/**
 * Manager/Admin: pending leave requests for company.
 * null companyId = super admin (all).
 */
export async function getPendingLeaveRequests(companyId) {
  const [rows] = companyId
    ? await db.query(
        `SELECT lr.*,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         JOIN companies c ON c.id = lr.company_id
         WHERE lr.company_id = ? AND lr.status = 'pending'
         ORDER BY lr.created_at ASC`,
        [companyId]
      )
    : await db.query(
        `SELECT lr.*,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
         JOIN companies c ON c.id = lr.company_id
         WHERE lr.status = 'pending'
         ORDER BY lr.created_at ASC`
      );
  return rows;
}

/**
 * Manager/Admin: approve or reject a leave request.
 * On approval → deduct from balance.
 */
export async function reviewLeaveRequest(companyId, requestId, reviewerId, action, reviewerNote = '') {
  if (!['approved', 'rejected'].includes(action)) throw new Error('Invalid action.');

  const [[req]] = companyId
    ? await db.query(
        `SELECT * FROM leave_requests WHERE id = ? AND company_id = ? AND status = 'pending' LIMIT 1`,
        [requestId, companyId]
      )
    : await db.query(
        `SELECT * FROM leave_requests WHERE id = ? AND status = 'pending' LIMIT 1`,
        [requestId]
      );
  if (!req) throw new Error('Pending leave request not found.');

  await db.query(
    `UPDATE leave_requests
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reviewer_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [action, reviewerId, reviewerNote || null, requestId]
  );

  // If approved → deduct from balance
  if (action === 'approved' && req.leave_type !== 'unpaid') {
    const year = new Date(req.start_date).getFullYear();
    await db.query(
      `UPDATE leave_balances
       SET used_days = used_days + ?, updated_at = NOW()
       WHERE company_id = ? AND employee_id = ? AND leave_type = ? AND year = ?`,
      [Number(req.days_count), req.company_id, req.employee_id, req.leave_type, year]
    );
  }

  return { success: true, action };
}

/**
 * Employee: cancel own pending request.
 */
export async function cancelLeaveRequest(companyId, employeeId, requestId) {
  const [[req]] = await db.query(
    `SELECT * FROM leave_requests WHERE id = ? AND company_id = ? AND employee_id = ? AND status = 'pending' LIMIT 1`,
    [requestId, companyId, employeeId]
  );
  if (!req) throw new Error('Pending leave request not found.');

  await db.query(
    `UPDATE leave_requests SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
    [requestId]
  );
  return { success: true };
}
