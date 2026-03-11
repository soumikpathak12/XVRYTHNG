import db from '../config/db.js';

const CATEGORIES = ['travel', 'materials', 'equipment', 'other'];

/* ─── Employee: submit ─── */
export async function submitExpense(companyId, employeeId, fields, receiptPath) {
  const { projectName, category, amount, expenseDate, description } = fields;
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category.');
  if (!amount || Number(amount) <= 0) throw new Error('Amount must be positive.');
  if (!expenseDate) throw new Error('expense date is required.');
  if (!description?.trim()) throw new Error('Description is required.');
  if (!receiptPath) throw new Error('Receipt upload is required.');

  const [result] = await db.query(
    `INSERT INTO expense_claims
       (company_id, employee_id, project_name, category, amount, expense_date, description, receipt_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, employeeId, projectName || null, category, Number(amount), expenseDate, description, receiptPath]
  );
  return { id: result.insertId };
}

/* ─── Employee: own list ─── */
export async function getMyExpenses(companyId, employeeId) {
  const [rows] = await db.query(
    `SELECT * FROM expense_claims
     WHERE company_id = ? AND employee_id = ?
     ORDER BY created_at DESC`,
    [companyId, employeeId]
  );
  return rows;
}

/* ─── Manager / Admin: pending ─── */
export async function getPendingExpenses(companyId) {
  const [rows] = companyId
    ? await db.query(
        `SELECT ec.*,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM expense_claims ec
         JOIN employees e ON e.id = ec.employee_id
         JOIN companies c ON c.id = ec.company_id
         WHERE ec.company_id = ? AND ec.status = 'pending'
         ORDER BY ec.created_at ASC`,
        [companyId]
      )
    : await db.query(
        `SELECT ec.*,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.employee_code,
                c.name AS company_name
         FROM expense_claims ec
         JOIN employees e ON e.id = ec.employee_id
         JOIN companies c ON c.id = ec.company_id
         WHERE ec.status = 'pending'
         ORDER BY ec.created_at ASC`
      );
  return rows;
}

/* ─── Manager / Admin: approve or reject ─── */
export async function reviewExpense(companyId, expenseId, reviewerId, action, reviewerNote = '') {
  if (!['approved', 'rejected'].includes(action)) throw new Error('Invalid action.');

  const [[req]] = companyId
    ? await db.query(
        `SELECT * FROM expense_claims WHERE id = ? AND company_id = ? AND status = 'pending' LIMIT 1`,
        [expenseId, companyId]
      )
    : await db.query(
        `SELECT * FROM expense_claims WHERE id = ? AND status = 'pending' LIMIT 1`,
        [expenseId]
      );
  if (!req) throw new Error('Pending expense not found.');

  await db.query(
    `UPDATE expense_claims
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reviewer_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [action, reviewerId, reviewerNote || null, expenseId]
  );

  return { success: true, action };
}

/* ─── Employee: cancel own pending ─── */
export async function cancelExpense(companyId, employeeId, expenseId) {
  const [[req]] = await db.query(
    `SELECT * FROM expense_claims WHERE id = ? AND company_id = ? AND employee_id = ? AND status = 'pending' LIMIT 1`,
    [expenseId, companyId, employeeId]
  );
  if (!req) throw new Error('Pending expense not found.');
  await db.query(`UPDATE expense_claims SET status = 'cancelled', updated_at = NOW() WHERE id = ?`, [expenseId]);
  return { success: true };
}

/* ─── Project summary for profitability ─── */
export async function getProjectExpenseSummary(companyId, projectName) {
  const [[row]] = await db.query(
    `SELECT
       COUNT(*)               AS total_claims,
       SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) AS approved_total,
       SUM(CASE WHEN status = 'pending'  THEN amount ELSE 0 END) AS pending_total
     FROM expense_claims
     WHERE company_id = ? AND project_name = ?`,
    [companyId, projectName]
  );
  return row;
}
