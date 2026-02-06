// src/routes/adminRoutes.js
import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { requireAuth, /* requireSuperAdmin, */ getAdminProfile, updateAdminProfile } from '../controllers/adminController.js';

const router = Router();

// If you want to restrict to super_admin only, include requireSuperAdmin after requireAuth.
router.use(
  fileUpload({
    createParentPath: false,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    abortOnLimit: true,
  })
);

// GET current admin profile
router.get('/me', requireAuth /* , requireSuperAdmin */, getAdminProfile);

// Update current admin profile (multipart)
router.post('/me', requireAuth /* , requireSuperAdmin */, updateAdminProfile);

export default router;