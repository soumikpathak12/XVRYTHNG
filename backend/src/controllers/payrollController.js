import * as payrollService from '../services/payrollService.js';
import * as payslipService from '../services/payslipService.js';
import * as emailService from '../services/emailService.js';
import db from '../config/db.js';

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  return fromTenant ?? fromQuery ?? fromHeader ?? null;
}

// Calculate payroll summary for a period
export async function calculatePayroll(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { periodStart, periodEnd, periodType = 'monthly' } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: 'Period start and end dates are required' });
    }

    const payrollData = await payrollService.calculatePayroll(companyId, periodStart, periodEnd, periodType);

    return res.status(200).json({ success: true, data: payrollData });
  } catch (err) {
    console.error('Payroll calculation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Save payroll run
export async function savePayrollRun(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollData } = req.body;

    if (!payrollData) {
      return res.status(400).json({ success: false, message: 'Payroll data is required' });
    }

    const payrollRunId = await payrollService.savePayrollRun(companyId, payrollData, req.user.id);

    return res.status(201).json({ success: true, data: { payrollRunId } });
  } catch (err) {
    console.error('Save payroll run error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Get payroll runs
export async function getPayrollRuns(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const limit = parseInt(req.query.limit) || 50;
    const runs = await payrollService.getPayrollRuns(companyId, limit);

    return res.status(200).json({ success: true, data: runs });
  } catch (err) {
    console.error('Get payroll runs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Get payroll run details
export async function getPayrollRunDetails(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { id } = req.params;
    const details = await payrollService.getPayrollRunDetails(id, companyId);

    return res.status(200).json({ success: true, data: details });
  } catch (err) {
    console.error('Get payroll run details error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Generate payslip for employee
export async function generatePayslip(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollRunId, employeeId } = req.params;

    const payslipPath = await payslipService.generatePayslip(payrollRunId, employeeId, companyId);

    return res.status(200).json({ success: true, data: { payslipPath } });
  } catch (err) {
    console.error('Generate payslip error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Generate payslips for all employees in payroll run
export async function generateAllPayslips(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollRunId } = req.params;

    const zipPath = await payslipService.generateAllPayslips(payrollRunId, companyId);

    return res.status(200).json({ success: true, data: { zipPath } });
  } catch (err) {
    console.error('Generate all payslips error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Download payslip
export async function downloadPayslip(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollRunId, employeeId } = req.params;

    const filePath = await payslipService.getPayslipPath(payrollRunId, employeeId, companyId);

    if (!filePath) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    res.download(filePath);
  } catch (err) {
    console.error('Download payslip error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Download all payslips as ZIP
export async function downloadAllPayslips(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollRunId } = req.params;

    const zipPath = await payslipService.getPayslipsZipPath(payrollRunId, companyId);

    if (!zipPath) {
      return res.status(404).json({ success: false, message: 'Payslips ZIP not found' });
    }

    res.download(zipPath);
  } catch (err) {
    console.error('Download all payslips error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Email payslips for all employees in a payroll run
export async function emailAllPayslips(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });

    const { payrollRunId } = req.params;

    // Load run + details (with employee email)
    const [runRows] = await db.query(
      'SELECT * FROM payroll_runs WHERE id = ? AND company_id = ? LIMIT 1',
      [payrollRunId, companyId]
    );
    if (runRows.length === 0) return res.status(404).json({ success: false, message: 'Payroll run not found' });
    const run = runRows[0];

    const [rows] = await db.query(
      `SELECT pd.id AS payroll_detail_id, pd.employee_id, pd.net_pay, e.first_name, e.last_name, e.email
       FROM payroll_details pd
       JOIN employees e ON e.id = pd.employee_id
       WHERE pd.payroll_run_id = ?`,
      [payrollRunId]
    );

    const results = { sent: 0, skipped: 0, failed: 0, failures: [] };

    for (const r of rows) {
      const to = r.email;
      if (!emailService.isValidEmail(to)) {
        results.skipped++;
        continue;
      }

      // Ensure payslip exists, then email
      try {
        await payslipService.generatePayslip(payrollRunId, r.employee_id, companyId);
        const filePath = await payslipService.getPayslipPath(payrollRunId, r.employee_id, companyId);
        await emailService.sendPayslipEmail({
          to,
          employeeName: `${r.first_name} ${r.last_name}`.trim(),
          companyName: 'XVRYTHNG',
          periodStart: run.period_start,
          periodEnd: run.period_end,
          netPay: r.net_pay,
          attachmentPath: filePath,
          attachmentFilename: `payslip_${payrollRunId}_${r.employee_id}.pdf`,
          headers: { 'X-Payroll-Run-Id': String(payrollRunId) },
        });
        await db.query(
          'UPDATE payslips SET emailed_at = NOW() WHERE payroll_detail_id = ?',
          [r.payroll_detail_id]
        );
        results.sent++;
      } catch (e) {
        results.failed++;
        results.failures.push({ employee_id: r.employee_id, email: to, error: e.message });
      }
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Email payslips error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}