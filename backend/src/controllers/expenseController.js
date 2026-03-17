import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import * as expenseService from '../services/expenseService.js';
import * as attendanceService from '../services/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Multer setup — receipts → src/uploads/receipts/<companyId>/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
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

export const receiptUpload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

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
    const { projectName, category, amount, expenseDate, description } = req.body;

    const data = await expenseService.submitExpense(companyId, employeeId, {
      projectName, category, amount, expenseDate, description,
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
    const employeeId = await attendanceService.getEmployeeIdByUserId(companyId, req.user.id);
    const data = await expenseService.getMyExpenses(companyId, employeeId);
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
