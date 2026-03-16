import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import db from '../config/db.js';

// Ensure payslips directory exists
const payslipsDir = path.join(process.cwd(), 'uploads', 'payslips');
if (!fs.existsSync(payslipsDir)) {
  fs.mkdirSync(payslipsDir, { recursive: true });
}

async function getYtdTotals(companyId, employeeId, periodEnd) {
  const yearStart = new Date(periodEnd);
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearStartStr = yearStart.toISOString().slice(0, 10);

  const [rows] = await db.query(
    `SELECT
       SUM(pd.regular_hours)  AS ytd_regular_hours,
       SUM(pd.overtime_hours) AS ytd_overtime_hours,
       SUM(pd.gross_pay)      AS ytd_gross_pay,
       SUM(pd.deductions)     AS ytd_deductions,
       SUM(pd.net_pay)        AS ytd_net_pay
     FROM payroll_details pd
     JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
     WHERE pr.company_id = ?
       AND pd.employee_id = ?
       AND pr.period_end >= ?
       AND pr.period_end <= ?`,
    [companyId, employeeId, yearStartStr, periodEnd]
  );

  const y = rows[0] || {};
  return {
    regularHours: Number(y.ytd_regular_hours || 0),
    overtimeHours: Number(y.ytd_overtime_hours || 0),
    grossPay: Number(y.ytd_gross_pay || 0),
    deductions: Number(y.ytd_deductions || 0),
    netPay: Number(y.ytd_net_pay || 0),
  };
}

// Generate payslip PDF for a single employee
export async function generatePayslip(payrollRunId, employeeId, companyId) {
  // Get payroll run details
  const [runRows] = await db.query(
    'SELECT * FROM payroll_runs WHERE id = ? AND company_id = ?',
    [payrollRunId, companyId]
  );

  if (runRows.length === 0) {
    throw new Error('Payroll run not found');
  }

  const run = runRows[0];

  // Get employee payroll details
  const [detailRows] = await db.query(
    `SELECT pd.*, e.first_name, e.last_name, e.email
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     WHERE pd.payroll_run_id = ? AND pd.employee_id = ?`,
    [payrollRunId, employeeId]
  );

  if (detailRows.length === 0) {
    throw new Error('Employee payroll details not found');
  }

  const detail = detailRows[0];
  // Coerce numeric fields to numbers to avoid .toFixed on strings/null
  const regularHours   = Number(detail.regular_hours   ?? 0);
  const overtimeHours  = Number(detail.overtime_hours  ?? 0);
  const hourlyRate     = Number(detail.hourly_rate     ?? 0);
  const overtimeRate   = Number(detail.overtime_rate   ?? 0);
  const grossPay       = Number(detail.gross_pay       ?? 0);
  const taxDeductions  = Number(detail.tax_deductions  ?? 0);
  const otherDeductions= Number(detail.other_deductions?? 0);
  const netPay         = Number(detail.net_pay         ?? 0);
  const ytd = await getYtdTotals(companyId, employeeId, run.period_end);

  // Generate PDF
  const fileName = `payslip_${run.id}_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(payslipsDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text('PAYSLIP', { align: 'center' });
  doc.moveDown();

  // Company info (placeholder)
  doc.fontSize(12).text('XVRYTHNG Solar', { align: 'center' });
  doc.text('Company Address', { align: 'center' });
  doc.text('Phone: (123) 456-7890', { align: 'center' });
  doc.moveDown();

  // Period and Employee info
  doc.fontSize(14).text(`Pay Period: ${run.period_start} to ${run.period_end}`, { align: 'left' });
  doc.text(`Employee: ${detail.first_name} ${detail.last_name}`, { align: 'left' });
  doc.text(`Employee ID: ${employeeId}`, { align: 'left' });
  doc.moveDown();

  // Earnings table
  doc.fontSize(12).text('Earnings:', { underline: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const tableLeft = 50;
  const colWidth = 150;

  // Table headers
  doc.fontSize(10);
  doc.text('Description', tableLeft, tableTop);
  doc.text('Hours', tableLeft + colWidth, tableTop);
  doc.text('Rate', tableLeft + colWidth * 2, tableTop);
  doc.text('Amount', tableLeft + colWidth * 3, tableTop);

  // Table rows
  let y = tableTop + 20;
  doc.text('Regular Hours', tableLeft, y);
  doc.text(regularHours.toFixed(2), tableLeft + colWidth, y);
  doc.text(`$${hourlyRate.toFixed(2)}`, tableLeft + colWidth * 2, y);
  doc.text(`$${(regularHours * hourlyRate).toFixed(2)}`, tableLeft + colWidth * 3, y);

  if (overtimeHours > 0) {
    y += 15;
    doc.text('Overtime Hours', tableLeft, y);
    doc.text(overtimeHours.toFixed(2), tableLeft + colWidth, y);
    doc.text(`$${overtimeRate.toFixed(2)}`, tableLeft + colWidth * 2, y);
    doc.text(`$${(overtimeHours * overtimeRate).toFixed(2)}`, tableLeft + colWidth * 3, y);
  }

  // Totals for period
  y += 30;
  doc.fontSize(12).text('Gross Pay:', tableLeft, y);
  doc.text(`$${grossPay.toFixed(2)}`, tableLeft + colWidth * 3, y);

  y += 20;
  doc.text('Deductions:', tableLeft, y, { underline: true });

  y += 15;
  doc.fontSize(10).text('Tax', tableLeft, y);
  doc.text(`$${taxDeductions.toFixed(2)}`, tableLeft + colWidth * 3, y);

  if (otherDeductions > 0) {
    y += 15;
    doc.text('Other Deductions', tableLeft, y);
    doc.text(`$${otherDeductions.toFixed(2)}`, tableLeft + colWidth * 3, y);
  }

  y += 20;
  doc.fontSize(12).text('Net Pay (this period):', tableLeft, y);
  doc.text(`$${netPay.toFixed(2)}`, tableLeft + colWidth * 3, y);

  // YTD totals
  y += 30;
  doc.fontSize(12).text('Year-to-Date Totals:', tableLeft, y, { underline: true });
  y += 18;
  doc.fontSize(10);
  doc.text('Hours (regular + overtime)', tableLeft, y);
  doc.text(
    (ytd.regularHours + ytd.overtimeHours).toFixed(2),
    tableLeft + colWidth * 3,
    y
  );
  y += 14;
  doc.text('Gross Pay', tableLeft, y);
  doc.text(`$${ytd.grossPay.toFixed(2)}`, tableLeft + colWidth * 3, y);
  y += 14;
  doc.text('Deductions', tableLeft, y);
  doc.text(`$${ytd.deductions.toFixed(2)}`, tableLeft + colWidth * 3, y);
  y += 14;
  doc.text('Net Pay', tableLeft, y);
  doc.text(`$${ytd.netPay.toFixed(2)}`, tableLeft + colWidth * 3, y);

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).text('This is a computer-generated payslip.', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.end();

  // Wait for PDF to finish writing
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Save to database
  await db.query(
    `INSERT INTO payslips (payroll_detail_id, file_path, file_name)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), file_name = VALUES(file_name)`,
    [detail.id, `payslips/${fileName}`, fileName]
  );

  return `payslips/${fileName}`;
}

// Generate payslips for all employees in a payroll run
export async function generateAllPayslips(payrollRunId, companyId) {
  // Get all payroll details for this run
  const [detailRows] = await db.query(
    `SELECT pd.id, pd.employee_id, e.first_name, e.last_name
     FROM payroll_details pd
     JOIN employees e ON pd.employee_id = e.id
     JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
     WHERE pd.payroll_run_id = ? AND pr.company_id = ?`,
    [payrollRunId, companyId]
  );

  if (detailRows.length === 0) {
    throw new Error('No payroll details found for this run/company – cannot generate payslips ZIP');
  }

  // Generate individual PDFs
  const pdfPaths = [];
  for (const detail of detailRows) {
    try {
      const pdfPath = await generatePayslip(payrollRunId, detail.employee_id, companyId);
      pdfPaths.push({
        path: path.join(process.cwd(), 'uploads', pdfPath),
        name: `payslip_${detail.first_name}_${detail.last_name}.pdf`
      });
    } catch (error) {
      console.error(`Failed to generate payslip for employee ${detail.employee_id}:`, error);
    }
  }

  // Create ZIP file
  const zipFileName = `payslips_${payrollRunId}_${Date.now()}.zip`;
  const zipPath = path.join(payslipsDir, zipFileName);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(`payslips/${zipFileName}`));
    archive.on('error', reject);

    archive.pipe(output);

    pdfPaths.forEach(pdf => {
      archive.file(pdf.path, { name: pdf.name });
    });

    archive.finalize();
  });
}

// Get payslip file path
export async function getPayslipPath(payrollRunId, employeeId, companyId) {
  const [rows] = await db.query(
    `SELECT p.file_path
     FROM payslips p
     JOIN payroll_details pd ON p.payroll_detail_id = pd.id
     JOIN payroll_runs pr ON pd.payroll_run_id = pr.id
     WHERE pd.payroll_run_id = ? AND pd.employee_id = ? AND pr.company_id = ?`,
    [payrollRunId, employeeId, companyId]
  );

  if (rows.length === 0) {
    return null;
  }

  return path.join(process.cwd(), 'uploads', rows[0].file_path);
}

// Get payslips ZIP path (generate if not exists)
export async function getPayslipsZipPath(payrollRunId, companyId) {
  // Always (re)generate ZIP so it reflects the latest payslips
  const relPath = await generateAllPayslips(payrollRunId, companyId); // e.g. 'payslips/xyz.zip'
  return path.join(process.cwd(), 'uploads', relPath);
}