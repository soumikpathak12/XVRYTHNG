
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { fileURLToPath } from 'url';

const router = Router({ mergeParams: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Multer storage: /uploads/lead-<id>/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const leadId = String(req.params.leadId);
    const dir = path.join(uploadsDir, `lead-${leadId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safe);
  },
});

const upload = multer({ storage });

/**
 * GET /api/leads/:leadId/documents-simple
 * 
 */
router.get('/', async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const [rows] = await db.execute(
      `SELECT id, filename, storage_url, created_at
       FROM lead_documents
       WHERE lead_id = ?
       ORDER BY created_at DESC`,
      [leadId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[DOC] LIST ERROR', err);
    res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});

/**
 * POST /api/leads/:leadId/documents-simple/upload
 * body: form-data { file }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Missing file' });
    }

    const filename = req.file.filename;
    const storage_url = `/uploads/lead-${leadId}/${filename}`;

  
  await db.execute(
    `INSERT INTO lead_documents (lead_id, status, filename, storage_url, created_at)    
      VALUES (?, 'received', ?, ?, NOW())`,
      [leadId, filename, storage_url]
    );


    res.json({ success: true });
  } catch (err) {
    console.error('[DOC] UPLOAD ERROR', err);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

export default router;
