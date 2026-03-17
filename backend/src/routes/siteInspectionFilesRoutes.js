// backend/src/routes/siteInspectionFilesRoutes.js
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router({ mergeParams: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '..', 'uploads');

// /uploads/lead-<id>/site-inspection[/<section>]
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const leadId = String(req.params.leadId || '').trim();
      const section = String(req.body?.section || '').trim(); // optional
      const dir = section
        ? path.join(uploadsRoot, `lead-${leadId}`, 'site-inspection', section)
        : path.join(uploadsRoot, `lead-${leadId}`, 'site-inspection');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) { cb(e); }
  },
  filename(_req, file, cb) {
    const safe = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, safe);
  },
});
const upload = multer({ storage });

/**
 * POST /api/leads/:leadId/site-inspection/files/upload
 * form-data: file=<binary> ; section=<optional string>
 * -> { success:true, data:{ filename, storage_url } }
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Missing file' });
    const leadId = String(req.params.leadId || '').trim();
    const section = String(req.body?.section || '').trim();
    const filename = req.file.filename;
    const base = section
      ? `/uploads/lead-${leadId}/site-inspection/${section}/${filename}`
      : `/uploads/lead-${leadId}/site-inspection/${filename}`;
    res.json({ success: true, data: { filename, storage_url: base } });
  } catch (e) {
    console.error('[SI-FILES] upload error:', e);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

export default router;