import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import * as resourceLibraryController from '../controllers/resourceLibraryController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const companyId = String(req.user?.companyId ?? 'shared');
    const dir = path.join(uploadsDir, `resource-library-${companyId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safe = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype);
    if (!ok) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

router.get('/', requireAuth, resourceLibraryController.listResources);
router.post('/', requireAuth, resourceLibraryController.createResource);
router.delete('/:id', requireAuth, resourceLibraryController.deleteResource);
router.post('/upload-photo', requireAuth, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Missing photo file' });
    }
    const companyId = String(req.user?.companyId ?? 'shared');
    const url = `/uploads/resource-library-${companyId}/${req.file.filename}`;
    return res.status(200).json({ success: true, data: { image_url: url } });
  } catch (err) {
    console.error('Upload resource photo error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
});

export default router;
