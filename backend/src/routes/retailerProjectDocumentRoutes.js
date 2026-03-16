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

// Multer storage: /uploads/retailer-project-<id>/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const projectId = String(req.params.id);
    const dir = path.join(uploadsDir, `retailer-project-${projectId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safe);
  },
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const [rows] = await db.execute(
      `SELECT id, filename, storage_url, created_at, uploaded_by
       FROM retailer_project_documents
       WHERE project_id = ?
       ORDER BY created_at DESC`,
      [projectId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[RETAILER PROJECT DOC] LIST ERROR', err);
    res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.user?.id || null;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Missing file' });
    }

    const filename = req.file.filename;
    const storage_url = `/uploads/retailer-project-${projectId}/${filename}`;

    await db.execute(
      `INSERT INTO retailer_project_documents (project_id, filename, storage_url, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [projectId, filename, storage_url, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[RETAILER PROJECT DOC] UPLOAD ERROR', err);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

export default router;
