import * as payrollService from '../services/payrollService.js';
import * as payslipService from '../services/payslipService.js';

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