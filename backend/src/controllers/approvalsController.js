/**
 * Unified Approvals controller.
 * Aggregates leave_requests, expense_claims, and attendance_edit_requests
 * into a single paginated, filterable list.
 *
 * Routes:
 *   GET  /api/approvals          ?type=leave|expense|attendance  &status=pending|approved|rejected
 *   GET  /api/approvals/count    → { pending: N, by_type: { leave, expense, attendance } }
 */
import db from '../config/db.js';
import * as leaveService from '../services/leaveService.js';
import * as expenseService from '../services/expenseService.js';
import * as attendanceEditService from '../services/attendanceEditService.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  return fromTenant ?? fromHeader ?? null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function queryLeave(companyId, status) {
  const conditions = ['1=1'];
  const params = [];
  if (companyId) { conditions.push('lr.company_id = ?'); params.push(companyId); }
  if (status)    { conditions.push('lr.status = ?');     params.push(status); }

  const [rows] = await db.query(
    `SELECT lr.*,
            'leave' AS _type,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            c.name AS company_name
     FROM leave_requests lr
     JOIN employees  e ON e.id = lr.employee_id
     JOIN companies  c ON c.id = lr.company_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY lr.created_at DESC`,
    params
  );
  return rows;
}

async function queryExpenses(companyId, status) {
  const conditions = ['1=1'];
  const params = [];
  if (companyId) { conditions.push('ec.company_id = ?'); params.push(companyId); }
  if (status)    { conditions.push('ec.status = ?');     params.push(status); }

  const [rows] = await db.query(
    `SELECT ec.*,
            'expense' AS _type,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            c.name AS company_name
     FROM expense_claims ec
     JOIN employees  e ON e.id = ec.employee_id
     JOIN companies  c ON c.id = ec.company_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ec.created_at DESC`,
    params
  );
  return rows;
}

async function queryAttendance(companyId, status) {
  const conditions = ['1=1'];
  const params = [];
  if (companyId) { conditions.push('aer.company_id = ?'); params.push(companyId); }
  if (status)    { conditions.push('aer.status = ?');      params.push(status); }

  const [rows] = await db.query(
    `SELECT aer.*,
            'attendance' AS _type,
            CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            e.employee_code,
            c.name AS company_name
     FROM attendance_edit_requests aer
     JOIN employees  e ON e.id = aer.employee_id
     JOIN companies  c ON c.id = aer.company_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY aer.created_at DESC`,
    params
  );
  return rows;
}

// ─── GET /api/approvals ───────────────────────────────────────────────────────

export async function listApprovals(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const { type, status } = req.query;

    const validTypes   = ['leave', 'expense', 'attendance'];
    const validStatus  = ['pending', 'approved', 'rejected', 'cancelled'];

    const filterType   = validTypes.includes(type)   ? type   : null;
    const filterStatus = validStatus.includes(status) ? status : null;

    const fetchers = [];
    if (!filterType || filterType === 'leave')       fetchers.push(queryLeave(companyId, filterStatus));
    if (!filterType || filterType === 'expense')     fetchers.push(queryExpenses(companyId, filterStatus));
    if (!filterType || filterType === 'attendance')  fetchers.push(queryAttendance(companyId, filterStatus));

    const results = await Promise.all(fetchers);
    const all = results.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, data: all, total: all.length });
  } catch (err) {
    console.error('[approvalsController.listApprovals]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── GET /api/approvals/count ─────────────────────────────────────────────────

export async function getPendingCount(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const cond = companyId ? 'company_id = ? AND status = \'pending\'' : 'status = \'pending\'';
    const p    = companyId ? [companyId] : [];

    // Avoid SQL reserved words as column aliases (`leave` breaks MariaDB).
    const [[{ leave_cnt }]] = await db.query(
      `SELECT COUNT(*) AS leave_cnt FROM leave_requests WHERE ${cond}`, p
    );
    const [[{ expense_cnt }]] = await db.query(
      `SELECT COUNT(*) AS expense_cnt FROM expense_claims WHERE ${cond}`, p
    );
    const [[{ attendance_cnt }]] = await db.query(
      `SELECT COUNT(*) AS attendance_cnt FROM attendance_edit_requests WHERE ${cond}`, p
    );

    const byType = {
      leave:      Number(leave_cnt),
      expense:    Number(expense_cnt),
      attendance: Number(attendance_cnt),
    };
    const pending = byType.leave + byType.expense + byType.attendance;

    return res.json({ success: true, pending, by_type: byType });
  } catch (err) {
    console.error('[approvalsController.getPendingCount]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PATCH /api/approvals/:type/:id/decision ──────────────────────────────────
// Body: { action: 'approved'|'rejected', comment: string }
export async function decideApproval(req, res) {
  try {
    const companyId = resolveCompanyId(req); // null allowed for super_admin
    const type = String(req.params.type || '').toLowerCase();
    const id = Number(req.params.id);
    const action = String(req.body?.action || '').toLowerCase();
    const comment = String(req.body?.comment ?? '').trim();

    if (!['leave', 'expense', 'attendance'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid approval type.' });
    }
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid approval id.' });
    }
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }
    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment is required.' });
    }

    // Resolve employee + company from the underlying record (needed for notification + history)
    const tableMap = {
      leave: 'leave_requests',
      expense: 'expense_claims',
      attendance: 'attendance_edit_requests',
    };
    const table = tableMap[type];
    const [[row]] = companyId
      ? await db.query(`SELECT id, company_id, employee_id, status FROM ${table} WHERE id = ? AND company_id = ? LIMIT 1`, [id, companyId])
      : await db.query(`SELECT id, company_id, employee_id, status FROM ${table} WHERE id = ? LIMIT 1`, [id]);

    if (!row) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (String(row.status || '').toLowerCase() !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be decided.' });
    }

    // Execute the decision (updates underlying record)
    if (type === 'leave') {
      await leaveService.reviewLeaveRequest(companyId, id, req.user.id, action, comment);
    } else if (type === 'expense') {
      await expenseService.reviewExpense(companyId, id, req.user.id, action, comment);
    } else if (type === 'attendance') {
      await attendanceEditService.reviewEditRequest(companyId, id, req.user.id, action, comment);
    }

    // Log activity (best-effort; don't fail the decision if logging fails)
    try {
      await db.query(
        `INSERT INTO approval_activity
           (company_id, approval_type, approval_id, employee_id, actor_user_id, action, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.company_id, type, id, row.employee_id, req.user.id, action, comment]
      );
    } catch (e) {
      console.warn('[approvalsController.decideApproval] activity log failed:', e.message);
    }

    // Notify employee via internal chat DM (best-effort)
    try {
      const [[emp]] = await db.query(
        `SELECT e.user_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name
         FROM employees e
         WHERE e.id = ? AND e.company_id = ?
         LIMIT 1`,
        [row.employee_id, row.company_id]
      );

      const employeeUserId = emp?.user_id ? Number(emp.user_id) : null;
      if (employeeUserId) {
        const decisionText = action === 'approved' ? 'Approved' : 'Rejected';
        const messageBody =
          `✅ ${decisionText}: Your ${type.replace('_', ' ')} request (ID ${id}).\n` +
          `Comment: ${comment}`;

        const conversationId = await getOrCreateDmConversation(row.company_id, req.user.id, employeeUserId);
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)`,
          [conversationId, req.user.id, messageBody]
        );
      }
    } catch (e) {
      console.warn('[approvalsController.decideApproval] notify failed:', e.message);
    }

    return res.json({ success: true, data: { type, id, action } });
  } catch (err) {
    console.error('[approvalsController.decideApproval]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getOrCreateDmConversation(companyId, userA, userB) {
  const a = Number(userA);
  const b = Number(userB);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);

  // Find existing DM (2 participants) within company
  const [[existing]] = await db.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
     JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
     WHERE c.type = 'dm' AND c.company_id = ?
     LIMIT 1`,
    [lo, hi, companyId]
  );
  if (existing?.id) return Number(existing.id);

  const [convRes] = await db.query(
    `INSERT INTO conversations (company_id, type) VALUES (?, 'dm')`,
    [companyId]
  );
  const convId = Number(convRes.insertId);

  await db.query(
    `INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
    [convId, a, convId, b]
  );

  return convId;
}
