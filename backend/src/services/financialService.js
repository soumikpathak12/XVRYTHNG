import db from '../config/db.js';

function toDateString(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function getProfitLossAdjustments({ companyId, fromDate, toDate }) {
  if (!companyId) {
    throw new Error('Company context required');
  }

  const from = toDateString(fromDate);
  const to = toDateString(toDate);

  const payrollWhere = ['pr.company_id = ?'];
  const payrollParams = [companyId];

  if (from) {
    payrollWhere.push('pr.period_end >= ?');
    payrollParams.push(from);
  }
  if (to) {
    payrollWhere.push('pr.period_start <= ?');
    payrollParams.push(to);
  }

  const taxSql = `
    SELECT COALESCE(SUM(pd.tax_deductions), 0) AS total_tax
    FROM payroll_details pd
    INNER JOIN payroll_runs pr ON pr.id = pd.payroll_run_id
    WHERE ${payrollWhere.join(' AND ')}
  `;

  let tax = 0;
  try {
    const [[taxRow]] = await db.execute(taxSql, payrollParams);
    tax = Number(taxRow?.total_tax || 0);
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  const referralWhere = ['l.company_id = ?'];
  const referralParams = [companyId];

  if (from) {
    referralWhere.push('DATE(rb.bonus_paid_at) >= ?');
    referralParams.push(from);
  }
  if (to) {
    referralWhere.push('DATE(rb.bonus_paid_at) <= ?');
    referralParams.push(to);
  }

  const otherIncomeSql = `
    SELECT COALESCE(SUM(rb.bonus_amount), 0) AS total_other_income
    FROM referral_bonuses rb
    INNER JOIN leads l ON l.id = rb.referral_lead_id
    WHERE rb.bonus_paid_at IS NOT NULL
      AND ${referralWhere.join(' AND ')}
  `;

  let otherIncome = 0;
  try {
    const [[otherIncomeRow]] = await db.execute(otherIncomeSql, referralParams);
    otherIncome = Number(otherIncomeRow?.total_other_income || 0);
  } catch (err) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  return {
    tax,
    other_income: otherIncome,
    from_date: from,
    to_date: to,
  };
}
