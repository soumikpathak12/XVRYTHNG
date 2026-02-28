// backend/src/routes/employeeDocumentRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

async function resolveCompanyId(req, employeeId) {
  if (req.query.companyId) {
    const c = Number(req.query.companyId);
    if (!Number.isNaN(c) && c > 0) return c;
  }
  if (req.user?.company_id) {
    return Number(req.user.company_id);
  }
  const [[row]] = await db.execute(
    'SELECT company_id FROM employees WHERE id = ? LIMIT 1',
    [Number(employeeId)]
  );
  return row?.company_id ?? null;
}

function ensureValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Validation error');
    err.status = 422;
    err.body = { errors: errors.array() };
    throw err;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { id } = req.params;
    const now = new Date();
    const dir = path.join(
      process.cwd(),
      'uploads',
      `employee-${id}`,
      'documents',
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0')
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).slice(0, 80).replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /pdf|png|jpg|jpeg|gif|webp|doc|docx|xls|xlsx|csv|txt/i.test(file.mimetype)
      || /\.(pdf|png|jpg|jpeg|gif|webp|doc|docx|xls|xlsx|csv|txt)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Unsupported file type'));
    cb(null, true);
  }
});

// ---------- List ----------
router.get(
  '/employees/:id/documents',
  requireAuth,
  [param('id').isInt({ min: 1 }), query('companyId').optional().isInt({ min: 1 })],
  async (req, res, next) => {
    try {
      ensureValid(req);
      const employeeId = Number(req.params.id);
      const companyId = await resolveCompanyId(req, employeeId);
      if (!companyId) {
        const err = new Error('companyId is required'); err.status = 400; throw err;
      }

      const [rows] = await db.execute(
        `SELECT id, employee_id, company_id, filename, storage_url, mime_type, size_bytes, label, notes, uploaded_by, created_at
         FROM employee_documents
         WHERE company_id = ? AND employee_id = ?
         ORDER BY created_at DESC`,
        [companyId, employeeId]
      );
      res.json({ success: true, data: rows });
    } catch (e) { next(e); }
  }
);

// ---------- Upload ----------
router.post(
  '/employees/:id/documents',
  requireAuth,
  upload.single('file'),
  [
    param('id').isInt({ min: 1 }),
    query('companyId').optional().isInt({ min: 1 }),
    body('label').optional().isString().isLength({ max: 150 }),
    body('notes').optional().isString(),
  ],
  async (req, res, next) => {
    try {
      console.log('[EMP ROUTER] POST /api/employees/%s/documents', req.params.id);
      ensureValid(req);

      const employeeId = Number(req.params.id);
      const companyId = await resolveCompanyId(req, employeeId);
      if (!companyId) {
        const err = new Error('companyId is required'); err.status = 400; throw err;
      }
      if (!req.file) {
        const err = new Error('File is required'); err.status = 400; throw err;
      }

      const storagePath = req.file.path.replace(process.cwd(), '').replace(/\\/g, '/');

      const label = typeof req.body.label === 'string' ? req.body.label : null;
      const notes = typeof req.body.notes === 'string' ? req.body.notes : null;
      const uploadedBy = req.user?.id ?? null;

      const [result] = await db.execute(
        `INSERT INTO employee_documents
           (employee_id, company_id, filename, storage_url, mime_type, size_bytes, label, notes, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          employeeId,
          companyId,
          req.file.originalname,
          storagePath,
          req.file.mimetype ?? null,
          Number(req.file.size) ?? null,
          label,
          notes,
          uploadedBy,
        ]
      );

      res.json({
        success: true,
        data: {
          id: result.insertId,
          employee_id: employeeId,
          company_id: companyId,
          filename: req.file.originalname,
          storage_url: storagePath,
          mime_type: req.file.mimetype ?? null,
          size_bytes: Number(req.file.size) ?? null,
          label, notes,
        }
      });
    } catch (e) { next(e); }
  }
);

// ---------- Download ----------
router.get(
  '/employees/:id/documents/:docId/download',
  requireAuth,
  [param('id').isInt({ min: 1 }), param('docId').isInt({ min: 1 }), query('companyId').optional().isInt({ min: 1 })],
  async (req, res, next) => {
    try {
      ensureValid(req);
      const employeeId = Number(req.params.id);
      const docId = Number(req.params.docId);
      const companyId = await resolveCompanyId(req, employeeId);
      if (!companyId) { const err = new Error('companyId is required'); err.status = 400; throw err; }

      const [[doc]] = await db.execute(
        `SELECT * FROM employee_documents WHERE id = ? AND employee_id = ? AND company_id = ?`,
        [docId, employeeId, companyId]
      );
      if (!doc) { const err = new Error('Document not found'); err.status = 404; throw err; }

      const absPath = path.join(process.cwd(), doc.storage_url);
      if (!fs.existsSync(absPath)) { const err = new Error('File missing on server'); err.status = 410; throw err; }

      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.filename)}"`);
      fs.createReadStream(absPath).pipe(res);
    } catch (e) { next(e); }
  }
);

// ---------- Delete ----------
router.delete(
  '/employees/:id/documents/:docId',
  requireAuth,
  [param('id').isInt({ min: 1 }), param('docId').isInt({ min: 1 }), query('companyId').optional().isInt({ min: 1 })],
  async (req, res, next) => {
    try {
      ensureValid(req);
      const employeeId = Number(req.params.id);
      const docId = Number(req.params.docId);
      const companyId = await resolveCompanyId(req, employeeId);
      if (!companyId) { const err = new Error('companyId is required'); err.status = 400; throw err; }

      const [[doc]] = await db.execute(
        `SELECT * FROM employee_documents WHERE id = ? AND employee_id = ? AND company_id = ?`,
        [docId, employeeId, companyId]
      );
      if (!doc) { const err = new Error('Document not found'); err.status = 404; throw err; }

      await db.execute(`DELETE FROM employee_documents WHERE id = ?`, [docId]);

      const absPath = path.join(process.cwd(), doc.storage_url);
      fs.promises.unlink(absPath).catch(() => {});

      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

export default router;