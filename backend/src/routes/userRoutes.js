import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { requireAuth } from '../controllers/adminController.js';
import { getProfile, updateProfile, changePassword, getMyPermissions } from '../controllers/profileController.js';

const router = Router();

router.use(
  fileUpload({
    createParentPath: false,
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
  })
);

router.use(requireAuth);

router.get('/me', getProfile);
router.get('/me/permissions', getMyPermissions);
router.put('/me', updateProfile);
router.put('/me/password', changePassword);

export default router;
