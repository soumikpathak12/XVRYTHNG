// src/routes/installationRoutes.js
import { Router }         from 'express';
import multer             from 'multer';
import path               from 'path';
import fs                 from 'fs';
import { fileURLToPath }  from 'url';
import { requireAuth }    from '../middleware/auth.js';
import { tenantContext }  from '../middleware/tenantContext.js';
import {
  listJobs,
  getJob,
  createJob,
  updateJob,
  updateStatus,
  upsertChecklist,
  createSignoff,
  addAssignee,
  removeAssignee,
  listChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  uploadPhoto,
  deletePhoto,
  getPhotoRequirements,
  upsertPhotoRequirements,
} from '../controllers/installationController.js';

const __filename   = fileURLToPath(import.meta.url);
const __dirname    = path.dirname(__filename);
const uploadsRoot  = path.join(__dirname, '..', '..', 'uploads');

// Multer – store photos at uploads/installation-jobs/:jobId/:section/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const jobId   = String(req.params.id    ?? 'unknown').trim();
      const section = String(req.body?.section ?? 'general').trim();
      const dir = path.join(uploadsRoot, 'installation-jobs', jobId, section);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) { cb(e); }
  },
  filename(_req, file, cb) {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});
const photoUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter(_req, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const router = Router();
router.use(requireAuth, tenantContext);

// ── Static config endpoints (before /:id to avoid param capture) ──────────────
router.get('/checklist-items',                 listChecklistItems);
router.post('/checklist-items',                createChecklistItem);
router.put('/checklist-items/:itemId',         updateChecklistItem);
router.delete('/checklist-items/:itemId',      deleteChecklistItem);

router.get('/photo-requirements',              getPhotoRequirements);
router.put('/photo-requirements/:section',     upsertPhotoRequirements);

// ── Installation jobs ──────────────────────────────────────────────────────────
router.get('/',                                listJobs);
router.post('/',                               createJob);
router.get('/:id',                             getJob);
router.put('/:id',                             updateJob);
router.patch('/:id/status',                    updateStatus);
router.patch('/:id/checklist/:itemId',         upsertChecklist);
router.post('/:id/signoff',                    createSignoff);
router.post('/:id/assignees',                  addAssignee);
router.delete('/:id/assignees/:employeeId',    removeAssignee);

// ── Photos ────────────────────────────────────────────────────────────────────
router.post('/:id/photos',                     photoUpload.single('photo'), uploadPhoto);
router.delete('/:id/photos/:photoId',          deletePhoto);

export default router;
