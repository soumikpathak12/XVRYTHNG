import db from '../config/db.js';
import {
  calculateAustralianPaygPeriodScale2,
  calculateSuperGuarantee,
  calculateLeaveAccrualHours,
} from './australianPayrollService.js';

async function getCompanyPayrollSettings(companyId) {
  const [[row]] = await db.query(
    `SELECT
       flat_tax_rate,
       weekly_threshold,
       fortnight_threshold,
       overtime_multiplier,
       payroll_region,
       super_guarantee_rate,
       au_annual_leave_weeks,
       au_personal_leave_weeks
     FROM company_payroll_settings
     WHERE company_id = ?
     LIMIT 1`,
    [companyId]
  );

  return {
    flatTaxRate: Number(row?.flat_tax_rate ?? 0.20),
    weeklyThreshold: Number(row?.weekly_threshold ?? 40),
    fortnightThreshold: Number(row?.fortnight_threshold ?? 80),
    overtimeMultiplier: Number(row?.overtime_multiplier ?? 1.5),
    payrollRegion: String(row?.payroll_region ?? 'AU').toUpperCase() === 'OTHER' ? 'OTHER' : 'AU',
    superGuaranteeRate: Number(row?.super_guarantee_rate ?? 0.12),
    auAnnualLeaveWeeks: Number(row?.au_annual_leave_weeks ?? 4),
    auPersonalLeaveWeeks: Number(row?.au_personal_leave_weeks ?? 2),
  };
}

// Calculate payroll for a period
export async function calculatePayroll(companyId, periodStart, periodEnd, periodType = 'monthly') {
  const settings = await getCompanyPayrollSettings(companyId);
  // Get all active employees for the company
  const [employees] = await db.query(
    `SELECT id, first_name, last_name, rate_type, rate_amount, au_payg_scale, super_fund_name
     FROM employees WHERE company_id = ? AND status = "active"`,
    [companyId]
  );

  const payrollDetails = [];

  for (const employee of employees) {
    const detail = await calculateEmployeePayroll(employee, companyId, periodStart, periodEnd, periodType, settings);
    if (detail) {
      payrollDetails.push(detail);
    }
  }

  // Calculate totals
  const totalPayrollAmount = payrollDetails.reduce((sum, d) => sum + parseFloat(d.net_pay), 0);
  const totalEmployees = payrollDetails.length;
  const totalHours = payrollDetails.reduce((sum, d) => sum + parseFloat(d.regular_hours), 0);
  const overtimeHours = payrollDetails.reduce((sum, d) => sum + parseFloat(d.overtime_hours), 0);

  return {
    periodStart,
    periodEnd,
    periodType,
    totalPayrollAmount,
    totalEmployees,
    totalHours,
    overtimeHours,
    details: payrollDetails
  };
}

// Calculate payroll for a single employee
async function calculateEmployeePayroll(employee, companyId, periodStart, periodEnd, periodType, settings) {
  // Get attendance records for the period
  const [attendanceRecords] = await db.query(
    `SELECT date, hours_worked
     FROM employee_attendance
     WHERE company_id = ? AND employee_id = ? AND date BETWEEN ? AND ?
     ORDER BY date`,
    [companyId, employee.id, periodStart, periodEnd]
  );

  if (attendanceRecords.length === 0) {
    return null; // No attendance records for this employee
  }

  let totalHours = 0;
  let overtimeHours = 0;

  // Calculate total hours and overtime based on period type
  if (periodType === 'weekly') {
    // Group by week
    const weeklyHours = {};
    attendanceRecords.forEach(record => {
      const weekStart = getWeekStart(record.date);
      if (!weeklyHours[weekStart]) weeklyHours[weekStart] = 0;
      weeklyHours[weekStart] += parseFloat(record.hours_worked || 0);
    });

    for (const week of Object.values(weeklyHours)) {
      totalHours += Math.min(week, settings.weeklyThreshold);
      overtimeHours += Math.max(0, week - settings.weeklyThreshold);
    }
  } else if (periodType === 'fortnightly') {
    // Group by fortnight
    const fortnightHours = {};
    attendanceRecords.forEach(record => {
      const fortnightStart = getFortnightStart(record.date);
      if (!fortnightHours[fortnightStart]) fortnightHours[fortnightStart] = 0;
      fortnightHours[fortnightStart] += parseFloat(record.hours_worked || 0);
    });

    for (const fortnight of Object.values(fortnightHours)) {
      totalHours += Math.min(fortnight, settings.fortnightThreshold);
      overtimeHours += Math.max(0, fortnight - settings.fortnightThreshold);
    }
  } else {
    // Monthly - no overtime calculation for now
    totalHours = attendanceRecords.reduce((sum, record) => sum + parseFloat(record.hours_worked || 0), 0);
    overtimeHours = 0;
  }

  // Calculate rates
  let hourlyRate = 0;
  let overtimeRate = 0;

  if (employee.rate_type === 'hourly') {
    hourlyRate = parseFloat(employee.rate_amount);
    overtimeRate = hourlyRate * settings.overtimeMultiplier;
  } else if (employee.rate_type === 'daily') {
    // Assume 8 hours per day
    hourlyRate = parseFloat(employee.rate_amount) / 8;
    overtimeRate = hourlyRate * settings.overtimeMultiplier;
  } else if (employee.rate_type === 'monthly') {
    // Assume 160 hours per month (20 days * 8 hours)
    hourlyRate = parseFloat(employee.rate_amount) / 160;
    overtimeRate = hourlyRate * settings.overtimeMultiplier;
  } else if (employee.rate_type === 'annual') {
    // Assume 2080 hours per year (52 weeks * 40 hours)
    hourlyRate = parseFloat(employee.rate_amount) / 2080;
    overtimeRate = hourlyRate * settings.overtimeMultiplier;
  }

  // Calculate pay
  const regularPay = totalHours * hourlyRate;
  const overtimePay = overtimeHours * overtimeRate;
  const grossPay = regularPay + overtimePay;

  const ordinaryTimeEarnings = regularPay;
  const otherDeductions = 0;

  let taxDeductions = 0;
  let superGuaranteeAmount = 0;
  let annualLeaveAccruedHours = 0;
  let personalLeaveAccruedHours = 0;

  if (settings.payrollRegion === 'AU') {
    const scale = Number(employee.au_payg_scale ?? 2);
    if (scale === 2) {
      taxDeductions = calculateAustralianPaygPeriodScale2(grossPay, periodStart, periodEnd);
    } else {
      taxDeductions = grossPay * settings.flatTaxRate;
    }
    superGuaranteeAmount = calculateSuperGuarantee(ordinaryTimeEarnings, settings.superGuaranteeRate);
    const leave = calculateLeaveAccrualHours(
      totalHours,
      settings.auAnnualLeaveWeeks,
      settings.auPersonalLeaveWeeks
    );
    annualLeaveAccruedHours = leave.annual;
    personalLeaveAccruedHours = leave.personal;
  } else {
    taxDeductions = grossPay * settings.flatTaxRate;
  }

  const netPay = grossPay - taxDeductions - otherDeductions;

  return {
    employeeId: employee.id,
    employeeName: `${employee.first_name} ${employee.last_name}`,
    regularHours: totalHours,
    overtimeHours,
    hourlyRate,
    overtimeRate,
    grossPay,
    ordinaryTimeEarnings,
    superGuaranteeAmount,
    annualLeaveAccruedHours,
    personalLeaveAccruedHours,
    deductions: taxDeductions + otherDeductions,
    taxDeductions,
    otherDeductions,
    netPay,
    payrollRegion: settings.payrollRegion,
  };
}

// Helper functions
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function getFortnightStart(date) {
  const d = new Date(date);
  const dayOfMonth = d.getDate();
  const fortnight = Math.floor((dayOfMonth - 1) / 14) + 1;
  const startDay = (fortnight - 1) * 14 + 1;
  return new Date(d.getFullYear(), d.getMonth(), startDay).toISOString().split('T')[0];
}

// Save payroll run
export async function savePayrollRun(companyId, payrollData, createdBy) {
  const [result] = await db.query(
    `INSERT INTO payroll_runs
     (company_id, period_start, period_end, period_type, status, total_payroll_amount, total_employees, total_hours, overtime_hours, created_by)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    [
      companyId,
      payrollData.periodStart,
      payrollData.periodEnd,
      payrollData.periodType,
      payrollData.totalPayrollAmount,
      payrollData.totalEmployees,
      payrollData.totalHours,
      payrollData.overtimeHours,
      createdBy
    ]
  );

  const payrollRunId = result.insertId;

  // Save payroll details
  for (const detail of payrollData.details) {
    await db.query(
      `INSERT INTO payroll_details
       (payroll_run_id, employee_id, regular_hours, overtime_hours, hourly_rate, overtime_rate,
        gross_pay, ordinary_time_earnings, deductions, net_pay, tax_deductions, other_deductions,
        super_guarantee_amount, annual_leave_accrued_hours, personal_leave_accrued_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payrollRunId,
        detail.employeeId,
        detail.regularHours,
        detail.overtimeHours,
        detail.hourlyRate,
        detail.overtimeRate,
        detail.grossPay,
        detail.ordinaryTimeEarnings ?? detail.regularHours * detail.hourlyRate,
        detail.deductions,
        detail.netPay,
        detail.taxDeductions,
        detail.otherDeductions,
        detail.superGuaranteeAmount ?? 0,
        detail.annualLeaveAccruedHours ?? 0,
        detail.personalLeaveAccruedHours ?? 0,
      ]
    );
  }

  return payrollRunId;
}

// Get payroll runs for a company
export async function getPayrollRuns(companyId, limit = 50) {
  const [rows] = await db.query(
    'SELECT * FROM payroll_runs WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
    [companyId, limit]
  );
  return rows;
}

// Get payroll run details
export async function getPayrollRunDetails(payrollRunId, companyId) {
  // Get run info
  const [runRows] = await db.query(
    'SELECT * FROM payroll_runs WHERE id = ? AND company_id = ?',
    [payrollRunId, companyId]
  );

  if (runRows.length === 0) {
    throw new Error('Payroll run not found');
  }

  const run = runRows[0];

  // Get details
  const [detailRows] = await db.query(
    `SELECT pd.*, e.first_name, e.last_name
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     WHERE pd.payroll_run_id = ?
     ORDER BY e.last_name, e.first_name`,
    [payrollRunId]
  );

  return {
    ...run,
    details: detailRows
  };
}