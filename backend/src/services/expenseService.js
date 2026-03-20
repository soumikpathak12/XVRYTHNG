import db from '../config/db.js';

const CATEGORIES = ['travel', 'materials', 'equipment', 'other'];

/** Stable label stored in `project_name` for installation-day expenses (matches filter from job id). */
export function installationJobProjectLabel(jobId) {
  const n = Number(jobId);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Installation job #${n}`;
}

/* ─── Employee: submit ─── */
export async function submitExpense(companyId, employeeId, fields, receiptPath) {
  let { projectName, category, amount, expenseDate, description, installationJobId } = fields;
  const installLabel =
    installationJobId != null && String(installationJobId).trim() !== ''
      ? installationJobProjectLabel(installationJobId)
      : null;
  if (installLabel) projectName = installLabel;
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category.');
  if (!amount || Number(amount) <= 0) throw new Error('Amount must be positive.');
  if (!expenseDate) throw new Error('expense date is required.');
  if (!description?.trim()) throw new Error('Description is required.');
  if (!receiptPath) throw new Error('Receipt upload is required.');

  const [result] = await db.query(
    `INSERT INTO expense_claims
       (company_id, employee_id, project_name, category, amount, currency, expense_date, description, receipt_path)
     VALUES (?, ?, ?, ?, ?, 'AUD', ?, ?, ?)`,
    [companyId, employeeId, projectName || null, category, Number(amount), expenseDate, description, receiptPath]
  );
  return { id: result.insertId };
}

/* ─── Employee: own list ─── */
export async function getMyExpenses(companyId, employeeId, options = {}) {
  const { installationJobId } = options;
  const label = installationJobId != null ? installationJobProjectLabel(installationJobId) : null;

  const where = ['company_id = ?', 'employee_id = ?'];
  const params = [companyId, employeeId];
  if (label) {
    where.push('project_name = ?');
    params.push(label);
  }

  const [rows] = await db.query(
    `SELECT * FROM expense_claims
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC`,
    params
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

/** Date filter on expense_claims.expense_date (aligned with PM dashboard range). */
export function expenseDateRangeWhere({ range, from, to } = {}) {
  if (range === 'custom' && from && to) {
    return { where: ' AND expense_date BETWEEN ? AND ? ', params: [from, to] };
  }
  if (range === '30d') {
    return { where: ' AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ', params: [] };
  }
  if (range === '90d') {
    return { where: ' AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) ', params: [] };
  }
  if (range === 'fy') {
    return {
      where:
        ' AND YEAR(expense_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL (MONTH(CURDATE())<7) YEAR)) ',
      params: [],
    };
  }
  return { where: '', params: [] };
}

/** Sum approved claims for tenant (or all companies if companyId is null). */
export async function sumApprovedExpensesForCompany(companyId, rangeOpts = {}) {
  const { where, params } = expenseDateRangeWhere(rangeOpts);
  let sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM expense_claims WHERE status = 'approved'`;
  const queryParams = [];
  if (companyId != null && Number.isFinite(Number(companyId))) {
    sql += ' AND company_id = ?';
    queryParams.push(Number(companyId));
  }
  sql += where;
  queryParams.push(...params);
  const [[row]] = await db.query(sql, queryParams);
  return Number(row?.total) || 0;
}

export async function sumApprovedExpensesMatchingNames(companyId, names) {
  const unique = [...new Set((names || []).map((s) => String(s).trim()).filter(Boolean))];
  if (!unique.length) return 0;
  if (companyId == null || !Number.isFinite(Number(companyId))) return 0;
  const ph = unique.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expense_claims
     WHERE company_id = ? AND status = 'approved' AND project_name IN (${ph})`,
    [Number(companyId), ...unique]
  );
  return Number(row?.total) || 0;
}

export async function collectExpenseMatchNamesForRetailerProject(companyId, retailerProjectId) {
  const [[row]] = await db.query(
    'SELECT code, customer_name, client_name FROM retailer_projects WHERE id = ? AND company_id = ? LIMIT 1',
    [Number(retailerProjectId), Number(companyId)]
  );
  if (!row) return [];
  const names = [];
  for (const k of ['code', 'customer_name', 'client_name']) {
    if (row[k]) names.push(String(row[k]).trim());
  }
  const [jobs] = await db.query(
    'SELECT id FROM installation_jobs WHERE company_id = ? AND retailer_project_id = ?',
    [Number(companyId), Number(retailerProjectId)]
  );
  for (const j of jobs || []) {
    const label = installationJobProjectLabel(j.id);
    if (label) names.push(label);
  }
  return [...new Set(names)];
}

export async function collectExpenseMatchNamesForClassicProject(companyId, projectId) {
  const [[proj]] = await db.query(
    `SELECT p.*, l.customer_name AS lead_customer_name
     FROM projects p
     LEFT JOIN leads l ON l.id = p.lead_id
     WHERE p.id = ?
     LIMIT 1`,
    [Number(projectId)]
  );
  if (!proj) return [];
  const names = [];
  const keys = ['project_code', 'project_name', 'customer_name'];
  for (const k of keys) {
    if (proj[k]) names.push(String(proj[k]).trim());
  }
  if (proj.lead_customer_name) names.push(String(proj.lead_customer_name).trim());

  let jobSql = 'SELECT id FROM installation_jobs WHERE project_id = ?';
  const jobParams = [Number(projectId)];
  if (companyId != null && Number.isFinite(Number(companyId))) {
    jobSql += ' AND company_id = ?';
    jobParams.push(Number(companyId));
  }
  const [jobs] = await db.query(jobSql, jobParams);
  for (const j of jobs || []) {
    const label = installationJobProjectLabel(j.id);
    if (label) names.push(label);
  }
  return [...new Set(names)];
}

export async function approvedExpenseTotalForRetailerProject(companyId, retailerProjectId) {
  const names = await collectExpenseMatchNamesForRetailerProject(companyId, retailerProjectId);
  return sumApprovedExpensesMatchingNames(companyId, names);
}

export async function approvedExpenseTotalForClassicProject(companyId, projectId) {
  const names = await collectExpenseMatchNamesForClassicProject(companyId, projectId);
  return sumApprovedExpensesMatchingNames(companyId, names);
}
