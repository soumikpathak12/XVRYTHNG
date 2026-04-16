import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import * as expenseService from '../services/expenseService.js';
import * as attendanceService from '../services/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const RECEIPT_MAX_BYTES = Number(process.env.EXPENSE_RECEIPT_MAX_BYTES || 15 * 1024 * 1024);
const RECEIPT_MAX_MB = Math.max(1, Math.round(RECEIPT_MAX_BYTES / (1024 * 1024)));

// Multer setup — receipts → src/uploads/receipts/<companyId>/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      return cb(e);
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  if (allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase().replace('.', ''))) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF receipts are allowed.'));
  }
};

export const receiptUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES },
});

export function uploadReceiptMiddleware(req, res, next) {
  receiptUpload.single('receipt')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `Receipt file is too large. Max allowed size is ${RECEIPT_MAX_MB}MB.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid receipt upload.',
    });
  });
}

function resolveCompanyId(req) {
  const fromTenant = req.tenantId != null ? Number(req.tenantId) : null;
  const fromQuery  = req.query.companyId != null ? Number(req.query.companyId) : null;
  const fromHeader = req.headers['x-tenant-id']
    ? Number(req.headers['x-tenant-id'])
    : req.headers['x-company-id']
    ? Number(req.headers['x-company-id'])
    : null;
  return fromTenant ?? fromQuery ?? fromHeader ?? null;
}

// POST /api/employees/expenses  (multipart/form-data with "receipt" file)
export async function submitExpense(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);

    const receiptPath = req.file ? `/uploads/receipts/${req.file.filename}` : null;
    const { projectName, category, amount, expenseDate, description, installationJobId } = req.body;

    const data = await expenseService.submitExpense(companyId, employeeId, {
      projectName, category, amount, expenseDate, description, installationJobId,
    }, receiptPath);

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/employees/expenses/my
export async function myExpenses(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    let employeeId = null;
    try {
      employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    } catch (err) {
      // Some roles (e.g. admin/company users) do not have an employees row.
      // For "my expenses" list we return empty instead of failing the whole page.
      if ((err?.message || '').toLowerCase().includes('employee not found or inactive')) {
        return res.status(200).json({ success: true, data: [] });
      }
      throw err;
    }
    const installationJobId = req.query.installationJobId != null && String(req.query.installationJobId).trim() !== ''
      ? Number(req.query.installationJobId)
      : null;
    const data = await expenseService.getMyExpenses(
      companyId,
      employeeId,
      Number.isFinite(installationJobId) && installationJobId > 0
        ? { installationJobId }
        : {}
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/employees/expenses/job/:jobId — all expenses for a specific installation job
export async function jobExpenses(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const jobId = Number(req.params.jobId);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid job ID' });
    }
    const data = await expenseService.getJobExpenses(companyId, jobId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// GET /api/employees/expenses/pending
export async function pendingExpenses(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const data = await expenseService.getPendingExpenses(companyId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// PATCH /api/employees/expenses/:id/review
export async function reviewExpense(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const { action, reviewerNote } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required.' });
    const data = await expenseService.reviewExpense(companyId, Number(req.params.id), req.user.id, action, reviewerNote || '');
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// DELETE /api/employees/expenses/:id/cancel
export async function cancelExpense(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'Missing company context' });
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await expenseService.cancelExpense(companyId, employeeId, Number(req.params.id));
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
